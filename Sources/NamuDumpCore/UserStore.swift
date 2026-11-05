import Foundation
import SQLite3

/// 설정(JSON)과 즐겨찾기, 방문 기록(SQLite)을 다룬다. 파이썬판과 같은 파일을 그대로 쓴다.
public final class UserStore: @unchecked Sendable {
    static let defaults: [String: Any] = [
        "db_path": "", "theme": "system", "font_size": 15, "width": "normal",
        "toc_sidebar": true, "link_check": true, "record_history": true,
    ]

    private let lock = NSLock()
    private let settingsURL: URL
    private let db: SQLiteDB
    private var values: [String: Any] = UserStore.defaults

    public init(root: URL) throws {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        settingsURL = root.appendingPathComponent("settings.json")
        if let data = try? Data(contentsOf: settingsURL),
           let saved = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            // 모르는 설정 항목(없어진 항목 등)은 버린다
            for (key, value) in saved where UserStore.defaults[key] != nil { values[key] = value }
        }
        db = try SQLiteDB(path: root.appendingPathComponent("user.sqlite").path,
                          flags: SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX)
        try db.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (title TEXT PRIMARY KEY, added_at REAL);
            CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY, title TEXT, visited_at REAL);
            CREATE INDEX IF NOT EXISTS ix_hist_title ON history(title);
            """)
    }

    private func locked<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try body()
    }

    public var settings: [String: Any] { locked { values } }

    @discardableResult
    public func saveSettings(_ patch: [String: Any]) -> [String: Any] {
        locked {
            for (key, value) in patch where UserStore.defaults[key] != nil { values[key] = value }
            if let data = try? JSONSerialization.data(withJSONObject: values, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) {
                try? data.write(to: settingsURL, options: .atomic)
            }
            return values
        }
    }

    public func bookmarks() throws -> [[String: Any]] {
        try locked {
            var out: [[String: Any]] = []
            try db.query("SELECT title, added_at FROM bookmarks ORDER BY added_at DESC") { row in
                out.append(["title": row.string(0) ?? "", "added_at": row.double(1)])
                return true
            }
            return out
        }
    }

    public func setBookmark(_ title: String, on: Bool) throws {
        try locked {
            if on {
                try db.query("INSERT OR REPLACE INTO bookmarks VALUES (?, ?)", [title, Date().timeIntervalSince1970])
            } else {
                try db.query("DELETE FROM bookmarks WHERE title = ?", [title])
            }
        }
    }

    public func isBookmarked(_ title: String) throws -> Bool {
        try locked {
            var hit = false
            try db.query("SELECT 1 FROM bookmarks WHERE title = ?", [title]) { _ in hit = true; return false }
            return hit
        }
    }

    public func addHistory(_ title: String) throws {
        try locked {
            try db.query("DELETE FROM history WHERE title = ?", [title])
            try db.query("INSERT INTO history (title, visited_at) VALUES (?, ?)", [title, Date().timeIntervalSince1970])
            try db.query("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 500)")
        }
    }

    public func history(limit: Int = 200) throws -> [[String: Any]] {
        try locked {
            var out: [[String: Any]] = []
            try db.query("SELECT title, visited_at FROM history ORDER BY visited_at DESC LIMIT ?", [limit]) { row in
                out.append(["title": row.string(0) ?? "", "visited_at": row.double(1)])
                return true
            }
            return out
        }
    }

    public func clearHistory() throws {
        try locked { try db.query("DELETE FROM history") }
    }
}
