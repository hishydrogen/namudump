import Foundation
import SQLite3
import XCTest
@testable import NamuDumpCore

/// 작은 가짜 덤프로 API를 확인한다. 화면은 실제 앱에서 눈으로 확인한다.
final class APITests: XCTestCase {
    static let docs: [(String, String)] = [
        ("나무위키", "<div><h2>개요</h2><p>나무위키 문서</p></div>"), ("나무", "<div><p>나무 문서</p></div>"),
        ("사과나무", "<div><p>사과나무 문서</p></div>"), ("Python", "<div><p>파이썬</p></div>"),
    ]

    var directory: URL!
    var api: API!

    /// zlib 형식(헤더 2바이트 + raw deflate + 검사합)으로 감싼다.
    static func zlib(_ text: String) throws -> Data {
        let raw = Data(text.utf8)
        var out = Data([0x78, 0x9c])
        out.append(try (raw as NSData).compressed(using: .zlib) as Data)
        var a: UInt32 = 1, b: UInt32 = 0
        for byte in raw { a = (a + UInt32(byte)) % 65521; b = (b + a) % 65521 }
        withUnsafeBytes(of: ((b << 16) | a).bigEndian) { out.append(contentsOf: $0) }
        return out
    }

    func makeDump(at url: URL) throws {
        var db: OpaquePointer?
        XCTAssertEqual(sqlite3_open(url.path, &db), SQLITE_OK)
        defer { sqlite3_close(db) }
        sqlite3_exec(db, """
            CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT);
            CREATE TABLE docs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, html BLOB, last_modified TEXT);
            CREATE UNIQUE INDEX ix_title ON docs(title);
            INSERT INTO meta VALUES ('doc_count', '\(APITests.docs.count)');
            """, nil, nil, nil)
        let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        for (i, doc) in APITests.docs.enumerated() {
            var stmt: OpaquePointer?
            sqlite3_prepare_v2(db, "INSERT INTO docs(id, title, html, last_modified) VALUES (?, ?, ?, '2026-01-01')", -1, &stmt, nil)
            let blob = try APITests.zlib(doc.1)
            sqlite3_bind_int(stmt, 1, Int32(i + 1))
            sqlite3_bind_text(stmt, 2, doc.0, -1, transient)
            blob.withUnsafeBytes { _ = sqlite3_bind_blob(stmt, 3, $0.baseAddress, Int32(blob.count), transient) }
            XCTAssertEqual(sqlite3_step(stmt), SQLITE_DONE)
            sqlite3_finalize(stmt)
        }
    }

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let dump = directory.appendingPathComponent("dump.sqlite")
        try makeDump(at: dump)
        api = API(store: try UserStore(root: directory.appendingPathComponent("support")))
        XCTAssertTrue(api.open(dumpAt: dump.path), api.dumpError)
    }

    override func tearDownWithError() throws { try FileManager.default.removeItem(at: directory) }

    func get(_ endpoint: String, _ query: [String: String] = [:]) throws -> Any {
        let r = api.handle(method: "GET", endpoint: endpoint, query: query)
        return try JSONSerialization.jsonObject(with: r.body, options: .fragmentsAllowed)
    }

    @discardableResult
    func post(_ endpoint: String, _ body: [String: Any]) throws -> [String: Any] {
        let r = api.handle(method: "POST", endpoint: endpoint, body: try JSONSerialization.data(withJSONObject: body))
        return try JSONSerialization.jsonObject(with: r.body) as! [String: Any]
    }

    func testStatus() throws {
        let s = try get("status") as! [String: Any]
        XCTAssertEqual(s["ready"] as? Bool, true)
        XCTAssertEqual(s["version"] as? String, AppInfo.version)
        XCTAssertEqual(s["doc_count"] as? Int, APITests.docs.count)
    }

    func testDocument() throws {
        let d = try get("doc", ["title": "나무위키"]) as! [String: Any]
        XCTAssertTrue((d["html"] as? String)?.contains("나무위키 문서") == true)
        XCTAssertEqual(d["last_modified"] as? String, "2026-01-01")
    }

    func testDocumentResolvesCase() throws {
        XCTAssertEqual((try get("doc", ["title": "python"]) as! [String: Any])["title"] as? String, "Python")
    }

    func testMissingDocumentGivesSuggestions() throws {
        let d = try get("doc", ["title": "나무위"]) as! [String: Any]
        XCTAssertEqual(d["missing"] as? Bool, true)
        XCTAssertEqual(d["suggestions"] as? [String], ["나무위키"])
    }

    func testPrefixAndContains() throws {
        let p = try get("search", ["mode": "prefix", "q": "나무"]) as! [String: Any]
        XCTAssertEqual(p["items"] as? [String], ["나무", "나무위키"])
        let c = try get("search", ["mode": "contains", "q": "나무"]) as! [String: Any]
        XCTAssertTrue((c["items"] as! [String]).contains("사과나무"))
        let c2 = try get("search", ["mode": "contains", "q": "python"]) as! [String: Any]
        XCTAssertEqual(c2["items"] as? [String], ["Python"])
    }

    func testContainsPaging() throws {
        let first = try get("search", ["mode": "contains", "q": "나무", "limit": "2"]) as! [String: Any]
        XCTAssertEqual(first["more"] as? Bool, true)
        let rest = try get("search", ["mode": "contains", "q": "나무", "limit": "2", "offset": "2"]) as! [String: Any]
        XCTAssertEqual(rest["more"] as? Bool, false)
        XCTAssertEqual((rest["items"] as? [String])?.count, 1)
    }

    func testExists() throws {
        XCTAssertEqual(try post("exists", ["titles": ["나무", "없는문서"]])["exists"] as? [String], ["나무"])
    }

    func testExistsHasNoLimit() throws {
        let titles = (0..<6000).map { "없는문서\($0)" } + ["나무위키"]
        XCTAssertEqual(try post("exists", ["titles": titles])["exists"] as? [String], ["나무위키"])
    }

    func testHistoryAndBookmark() throws {
        try post("history", ["title": "나무"])
        XCTAssertEqual((try get("history") as! [[String: Any]]).first?["title"] as? String, "나무")
        try post("bookmark", ["title": "나무", "on": true])
        XCTAssertEqual((try get("bookmarks") as! [[String: Any]]).first?["title"] as? String, "나무")
        XCTAssertEqual((try get("doc", ["title": "나무"]) as! [String: Any])["bookmarked"] as? Bool, true)
        try post("bookmark", ["title": "나무", "on": false])
        XCTAssertEqual((try get("bookmarks") as! [Any]).count, 0)
    }

    func testClearHistory() throws {
        try post("history", ["title": "사과나무"])
        try post("history", ["clear": true])
        XCTAssertEqual((try get("history") as! [Any]).count, 0)
    }

    func testHistoryOffIsRespected() throws {
        try post("settings", ["record_history": false])
        try post("history", ["title": "나무"])
        XCTAssertEqual((try get("history") as! [Any]).count, 0)
    }

    func testSettingsKeepOnlyKnownKeys() throws {
        let saved = try post("settings", ["theme": "dark", "unknown": 1])
        XCTAssertEqual(saved["theme"] as? String, "dark")
        XCTAssertNil(saved["unknown"])
        let reopened = try UserStore(root: directory.appendingPathComponent("support"))
        XCTAssertEqual(reopened.settings["theme"] as? String, "dark")
    }

    func testBadDumpReportsError() throws {
        let bad = directory.appendingPathComponent("bad.sqlite")
        try Data("not sqlite".utf8).write(to: bad)
        XCTAssertFalse(api.open(dumpAt: bad.path))
        XCTAssertTrue(api.dumpError.contains("SQLite"))
    }

    func testOpenURLOnlyWebLinks() {
        XCTAssertFalse(API.isExternalURL("file:///etc/passwd"))
        XCTAssertFalse(API.isExternalURL("javascript:alert(1)"))
        XCTAssertFalse(API.isExternalURL("https://a.example/\nb"))
        XCTAssertTrue(API.isExternalURL("https://namu.wiki/"))
        XCTAssertTrue(API.isExternalURL("mailto:a@example.com"))
    }

    func testStaticFilesStayInWebFolder() throws {
        let web = directory.appendingPathComponent("web")
        try FileManager.default.createDirectory(at: web, withIntermediateDirectories: true)
        try Data("<html>".utf8).write(to: web.appendingPathComponent("index.html"))
        try Data("secret".utf8).write(to: directory.appendingPathComponent("secret.txt"))
        let files = StaticFiles(root: web)
        XCTAssertEqual(files.response(path: "/").status, 200)
        XCTAssertEqual(files.response(path: "/w/나무").status, 200)
        XCTAssertEqual(files.response(path: "/../secret.txt").status, 404)
        XCTAssertEqual(files.response(path: "/%2e%2e/secret.txt").status, 404)
    }

    func testNoExternalImages() {
        // 문서를 열기만 해서는 인터넷에 접속하지 않는다(README의 약속). 외부 그림은 CSP로도 막는다.
        let image = StaticFiles.contentSecurityPolicy.split(separator: ";").first { $0.contains("img-src") }!
        XCTAssertFalse(image.contains("http"))
    }
}

final class EmbedPageTests: XCTestCase {
    func testOnlyKnownPlayersAreWrapped() {
        XCTAssertNotNil(EmbedPage.html(for: "https://www.youtube.com/embed/abc?autoplay=1"))
        XCTAssertNil(EmbedPage.html(for: "http://www.youtube.com/embed/abc"))
        XCTAssertNil(EmbedPage.html(for: "https://evil.example/embed/abc"))
        XCTAssertNil(EmbedPage.html(for: "https://www.youtube.com.evil.example/embed"))
    }

    func testURLIsEscaped() throws {
        let html = try XCTUnwrap(EmbedPage.html(for: "https://www.youtube.com/embed/a?x=1&y=\"><script>"))
        XCTAssertFalse(html.contains("<script>"))
    }
}
