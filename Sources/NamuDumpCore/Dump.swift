import Foundation
import SQLite3

public struct DumpError: Error, CustomStringConvertible {
    public let description: String
    public init(_ description: String) { self.description = description }
}

public struct DumpDocument {
    public let id: Int
    public let title: String
    public let html: String?
    public let lastModified: String?
}

/// 덤프 파일을 읽기 전용으로 연다. 파일이 70GB가 넘으므로 전체를 훑는 일은 피한다.
public final class Dump: @unchecked Sendable {
    private static let namespaces = ["분류:", "틀:", "파일:", "나무위키:", "사용자:", "휴지통:", "특수기능:", "위키운영:", "더미:", "파일휴지통:"]

    public let path: String
    public private(set) var meta: [String: String] = [:]
    public private(set) var count = 0
    private var maxID = 0

    // 연결은 스레드끼리 나눠 쓰지 않고 쓸 때마다 빌려 간다.
    private let poolLock = NSLock()
    private var pool: [SQLiteDB] = []
    private let uri: String

    // 제목 포함 검색용 목록. "\n제목\n제목\n" 꼴의 UTF-8 바이트와 ASCII만 소문자로 바꾼 사본.
    private let titlesLock = NSLock()
    private var titles: [UInt8]?
    private var titlesLower: [UInt8] = []

    public init(path: String) throws {
        let expanded = (path as NSString).expandingTildeInPath
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: expanded, isDirectory: &isDirectory), !isDirectory.boolValue else {
            throw DumpError("파일을 찾을 수 없습니다: \(expanded)")
        }
        self.path = expanded
        uri = URL(fileURLWithPath: expanded).absoluteString + "?mode=ro&immutable=1"

        try withConnection { db in
            var columns = Set<String>()
            do {
                try db.query("PRAGMA table_info(docs)") { row in
                    if let name = row.string(1) { columns.insert(name) }
                    return true
                }
            } catch {
                throw DumpError("SQLite 파일이 아니거나 손상되었습니다: \(error)")
            }
            guard columns.contains("title"), columns.contains("html") else {
                throw DumpError("나무위키 덤프 형식(docs 테이블의 title, html 컬럼)이 아닙니다.")
            }
            try? db.query("SELECT k, v FROM meta") { row in
                if let key = row.string(0) { self.meta[key] = row.string(1) ?? "" }
                return true
            }
            try db.query("SELECT max(id) FROM docs") { row in
                self.maxID = row.isNull(0) ? 0 : row.int(0)
                return false
            }
        }
        let declared = Int(meta["doc_count"] ?? "") ?? 0
        count = declared != 0 ? declared : maxID
    }

    private func withConnection<T>(_ body: (SQLiteDB) throws -> T) throws -> T {
        poolLock.lock()
        let reused = pool.popLast()
        poolLock.unlock()
        let db: SQLiteDB
        if let reused {
            db = reused
        } else {
            do {
                db = try SQLiteDB(path: uri, flags: SQLITE_OPEN_READONLY | SQLITE_OPEN_URI | SQLITE_OPEN_NOMUTEX)
                try db.execute("PRAGMA cache_size = -65536")
            } catch {
                throw DumpError("SQLite 파일이 아니거나 손상되었습니다: \(error)")
            }
        }
        defer {
            poolLock.lock()
            if pool.count < 4 { pool.append(db) }
            poolLock.unlock()
        }
        return try body(db)
    }

    /// html 칸의 값을 푼다. 보통 zlib 압축이지만 raw deflate나 압축하지 않은 글자도 받아 준다.
    static func inflate(_ raw: Data) throws -> String {
        let bytes = [UInt8](raw.prefix(2))
        if bytes.count == 2, bytes[0] & 0x0f == 8, (Int(bytes[0]) * 256 + Int(bytes[1])) % 31 == 0,
           let out = try? (raw.dropFirst(2) as NSData).decompressed(using: .zlib) {
            return String(decoding: out as Data, as: UTF8.self)
        }
        if let out = try? (raw as NSData).decompressed(using: .zlib), out.length > 0 {
            return String(decoding: out as Data, as: UTF8.self)
        }
        let first = raw.first { !($0 == 32 || $0 == 9 || $0 == 10 || $0 == 13) }
        guard let first, [UInt8(ascii: "<"), UInt8(ascii: "-"), UInt8(ascii: "#")].contains(first) else {
            throw DumpError("압축을 풀 수 없는 형식입니다.")
        }
        return String(decoding: raw, as: UTF8.self)
    }

    public func document(title: String) throws -> DumpDocument? {
        var found: (Int, String?, Data?, String?)?
        try withConnection { db in
            try db.query("SELECT id, html, last_modified FROM docs WHERE title = ?", [title]) { row in
                found = (row.int(0), row.isText(1) ? row.string(1) : nil, row.isText(1) ? nil : row.data(1), row.string(2))
                return false
            }
        }
        guard let found else { return nil }
        let html = try found.1 ?? found.2.map { try Dump.inflate($0) }
        return DumpDocument(id: found.0, title: title, html: html, lastModified: found.3)
    }

    public func prefix(_ q: String, limit: Int = 20, offset: Int = 0) throws -> [String] {
        guard !q.isEmpty else { return [] }
        var out: [String] = []
        try withConnection { db in
            try db.query("SELECT title FROM docs WHERE title >= ? AND title < ? ORDER BY title LIMIT ? OFFSET ?",
                         [q, q + "\u{10FFFF}", limit, offset]) { row in
                if let t = row.string(0) { out.append(t) }
                return true
            }
        }
        return out
    }

    public func existing(_ titles: [String]) throws -> Set<String> {
        var found = Set<String>()
        var seen = Set<String>()
        let unique = titles.filter { !$0.isEmpty && seen.insert($0).inserted }
        try withConnection { db in
            for start in stride(from: 0, to: unique.count, by: 400) {
                let chunk = Array(unique[start..<min(start + 400, unique.count)])
                let marks = Array(repeating: "?", count: chunk.count).joined(separator: ",")
                try db.query("SELECT title FROM docs WHERE title IN (\(marks))", chunk) { row in
                    if let t = row.string(0) { found.insert(t) }
                    return true
                }
            }
        }
        return found
    }

    /// 입력한 제목을 실제 문서 제목으로 맞춰 본다(대소문자, 앞뒤 공백).
    public func resolve(_ input: String) throws -> String? {
        let q = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return nil }
        let candidates = [q, q.prefix(1).uppercased() + q.dropFirst(), q.uppercased(), q.lowercased(), q.capitalized]
        var tried = Set<String>()
        for candidate in candidates where tried.insert(candidate).inserted {
            var hit = false
            try withConnection { db in
                try db.query("SELECT 1 FROM docs WHERE title = ?", [candidate]) { _ in hit = true; return false }
            }
            if hit { return candidate }
        }
        return nil
    }

    public func randomTitle() throws -> String? {
        var title: String?
        try withConnection { db in
            for _ in 0..<30 {
                title = nil
                try db.query("SELECT title FROM docs WHERE id >= ? ORDER BY id LIMIT 1", [Int.random(in: 1...max(1, maxID))]) { row in
                    title = row.string(0)
                    return false
                }
                if let t = title, !Dump.namespaces.contains(where: { t.hasPrefix($0) }) { return }
            }
        }
        return title
    }

    /// 제목 전체를 메모리에 올린다. 처음 한 번만 오래 걸리므로 덤프를 열 때 미리 불러 둔다.
    public func loadTitles() throws {
        titlesLock.lock()
        defer { titlesLock.unlock() }
        guard titles == nil else { return }
        var bytes: [UInt8] = [10]
        bytes.reserveCapacity(64 << 20)
        try withConnection { db in
            var hasIndex = false
            try db.query("SELECT 1 FROM sqlite_master WHERE type='index' AND name='ix_title'") { _ in hasIndex = true; return false }
            let sql = hasIndex ? "SELECT title FROM docs INDEXED BY ix_title ORDER BY title" : "SELECT title FROM docs"
            try db.query(sql) { row in
                row.withTextBytes(0) { bytes.append(contentsOf: $0) }
                bytes.append(10)
                return true
            }
        }
        titlesLower = bytes.map { $0 >= 65 && $0 <= 90 ? $0 + 32 : $0 }
        titles = bytes
    }

    /// 제목에 q가 들어간 문서를 찾는다. 대소문자는 ASCII만 구분하지 않는다.
    public func contains(_ input: String, limit: Int = 100, offset: Int = 0) throws -> (items: [String], more: Bool) {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: " ")
        let needle = Array(trimmed.utf8).map { $0 >= 65 && $0 <= 90 ? $0 + 32 : $0 }
        guard !needle.isEmpty else { return ([], false) }
        try loadTitles()
        titlesLock.lock()
        let source = titles ?? []
        let haystack = titlesLower
        titlesLock.unlock()

        return haystack.withUnsafeBytes { hay in
            let base = hay.baseAddress!
            func find(from start: Int) -> Int? {
                guard start < hay.count, let hit = memmem(base + start, hay.count - start, needle, needle.count) else { return nil }
                return hit - UnsafeMutableRawPointer(mutating: base)
            }
            var out: [String] = []
            var start = 0
            var skipped = 0
            while let i = find(from: start) {
                var a = i
                while a > 0, hay[a - 1] != 10 { a -= 1 }
                let b = memchr(base + i, 10, hay.count - i).map { $0 - UnsafeMutableRawPointer(mutating: base) } ?? hay.count
                start = b
                if skipped < offset { skipped += 1; continue }
                out.append(String(decoding: source[a..<b], as: UTF8.self))
                if out.count >= limit { return (out, find(from: start) != nil) }
            }
            return (out, false)
        }
    }
}
