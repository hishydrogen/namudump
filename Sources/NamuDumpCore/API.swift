import Foundation

public struct APIResponse {
    public let status: Int
    public let body: Data
    public init(status: Int, json: Any) {
        self.status = status
        body = (try? JSONSerialization.data(withJSONObject: json, options: [.withoutEscapingSlashes, .fragmentsAllowed])) ?? Data("{}".utf8)
    }
}

/// 앱 쪽에서만 할 수 있는 일(창, 파일 고르기 등). 주 스레드가 아닌 곳에서 불릴 수 있다.
public protocol APIHost: AnyObject {
    func pickDumpFile() -> String?
    func openExternal(_ url: String) -> Bool
    func embedURL(for url: String) -> String?
}

/// 화면(web/)이 부르는 /api/... 를 처리한다.
public final class API: @unchecked Sendable {
    public let store: UserStore
    public private(set) var dump: Dump?
    public private(set) var dumpError = ""
    public weak var host: APIHost?

    public init(store: UserStore) {
        self.store = store
        var path = store.settings["db_path"] as? String ?? ""
        if path.isEmpty {
            let candidate = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Downloads/namu-html.sqlite").path
            if FileManager.default.fileExists(atPath: candidate) { path = candidate }
        }
        if !path.isEmpty { open(dumpAt: path) }
    }

    @discardableResult
    public func open(dumpAt path: String) -> Bool {
        do {
            let opened = try Dump(path: path)
            dump = opened
            dumpError = ""
            store.saveSettings(["db_path": opened.path])
            // 제목 포함 검색에 쓰는 목록을 미리 읽어 둔다.
            DispatchQueue.global(qos: .utility).async { try? opened.loadTitles() }
            return true
        } catch {
            dumpError = "\(error)"
            return false
        }
    }

    public func handle(method: String, endpoint: String, query: [String: String] = [:], body: Data? = nil) -> APIResponse {
        do {
            if method == "POST" {
                let object = body.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any] ?? [:]
                return try post(endpoint, object)
            }
            return try get(endpoint, query)
        } catch {
            return APIResponse(status: 500, json: ["error": "서버 오류: \(error)"])
        }
    }

    private func get(_ endpoint: String, _ query: [String: String]) throws -> APIResponse {
        switch endpoint {
        case "status": return ok(status())
        case "settings": return ok(store.settings)
        case "bookmarks": return ok(try store.bookmarks())
        case "history": return ok(try store.history())
        case "pick":
            guard let path = host?.pickDumpFile() else { return ok(["ok": false, "cancelled": true]) }
            let opened = open(dumpAt: path)
            return ok(["ok": opened, "error": dumpError, "path": path])
        default: break
        }
        guard let dump else {
            return APIResponse(status: 409, json: ["error": "덤프 파일이 열려 있지 않습니다.", "need_dump": true])
        }
        switch endpoint {
        case "doc": return ok(try document(dump, query["title"] ?? ""))
        case "suggest":
            let q = trimmed(query["q"])
            var items = try dump.prefix(q, limit: 10)
            if items.count < 10, let first = q.first, first.isLowercase {
                items += try dump.prefix(q.prefix(1).uppercased() + q.dropFirst(), limit: 10).filter { !items.contains($0) }
            }
            return ok(["q": q, "items": Array(items.prefix(10))])
        case "search":
            let q = trimmed(query["q"])
            let mode = query["mode"] ?? "prefix"
            let limit = max(1, min(200, Int(query["limit"] ?? "") ?? 50))
            let offset = max(0, Int(query["offset"] ?? "") ?? 0)
            if mode == "contains" {
                let found = try dump.contains(q, limit: limit, offset: offset)
                return ok(["q": q, "mode": mode, "items": found.items, "more": found.more])
            }
            let items = try dump.prefix(q, limit: limit + 1, offset: offset)
            return ok(["q": q, "mode": mode, "items": Array(items.prefix(limit)), "more": items.count > limit,
                       "exact": try dump.resolve(q) ?? NSNull()] as [String: Any])
        case "random": return ok(["title": try dump.randomTitle() ?? NSNull()] as [String: Any])
        default: return APIResponse(status: 404, json: ["error": "unknown endpoint"])
        }
    }

    private func post(_ endpoint: String, _ data: [String: Any]) throws -> APIResponse {
        switch endpoint {
        case "settings": return ok(store.saveSettings(data))
        case "open":
            let opened = open(dumpAt: data["path"] as? String ?? "")
            return ok(["ok": opened, "error": dumpError])
        case "bookmark":
            try store.setBookmark(data["title"] as? String ?? "", on: data["on"] as? Bool ?? false)
            return ok(["ok": true])
        case "history":
            if data["clear"] as? Bool == true {
                try store.clearHistory()
            } else if let title = data["title"] as? String, !title.isEmpty, store.settings["record_history"] as? Bool != false {
                try store.addHistory(title)
            }
            return ok(["ok": true])
        case "exists":
            guard let dump else { return ok(["exists": [String]()]) }
            let titles = (data["titles"] as? [Any] ?? []).compactMap { $0 as? String }
            return ok(["exists": try dump.existing(titles).sorted()])
        case "open_url":
            return ok(["ok": API.isExternalURL(data["url"] as? String ?? "") && host?.openExternal(data["url"] as? String ?? "") == true])
        case "embed_url":
            return ok(["url": host?.embedURL(for: data["url"] as? String ?? "") ?? NSNull()] as [String: Any])
        default:
            return APIResponse(status: 404, json: ["error": "unknown endpoint"])
        }
    }

    private func ok(_ value: Any) -> APIResponse { APIResponse(status: 200, json: value) }
    private func trimmed(_ value: String?) -> String { (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }

    private func status() -> [String: Any] {
        [
            "ready": dump != nil, "error": dumpError,
            "db_path": dump?.path ?? (store.settings["db_path"] as? String ?? ""),
            "doc_count": dump?.count ?? 0, "meta": dump?.meta ?? [:], "settings": store.settings,
            "version": AppInfo.version, "author": AppInfo.author, "homepage": AppInfo.homepage,
            "native": true,
        ]
    }

    private func document(_ dump: Dump, _ title: String) throws -> [String: Any] {
        var doc = try dump.document(title: title)
        if doc == nil, let alternative = try dump.resolve(title), alternative != title {
            doc = try dump.document(title: alternative)
        }
        guard let doc else {
            var suggestions = try dump.prefix(title, limit: 12)
            if suggestions.count < 12, title.count >= 2 {
                let base = title.replacingOccurrences(of: #"\s*\([^)]*\)$"#, with: "", options: .regularExpression)
                if base != title { suggestions += try dump.prefix(base, limit: 12).filter { !suggestions.contains($0) } }
            }
            return ["missing": true, "title": title, "suggestions": Array(suggestions.prefix(20))]
        }
        return ["id": doc.id, "title": doc.title, "html": doc.html ?? NSNull(), "last_modified": doc.lastModified ?? NSNull(),
                "bookmarked": try store.isBookmarked(doc.title)]
    }

    /// 외부 링크로 열어도 되는 주소인지 본다. http, https, mailto만 받는다.
    public static func isExternalURL(_ url: String) -> Bool {
        let lower = url.lowercased()
        guard lower.hasPrefix("http://") || lower.hasPrefix("https://") || lower.hasPrefix("mailto:") else { return false }
        return !url.unicodeScalars.contains { $0 == "\r" || $0 == "\n" || $0 == "\0" }
    }
}
