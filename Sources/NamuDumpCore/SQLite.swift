import Foundation
import SQLite3

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

struct SQLiteError: Error, CustomStringConvertible {
    let description: String
}

/// SQLite 연결 하나. 한 번에 한 스레드만 쓴다.
final class SQLiteDB {
    private var handle: OpaquePointer?

    init(path: String, flags: Int32) throws {
        var db: OpaquePointer?
        let rc = sqlite3_open_v2(path, &db, flags, nil)
        guard rc == SQLITE_OK, let db else {
            let message = db.map { String(cString: sqlite3_errmsg($0)) } ?? "code \(rc)"
            sqlite3_close(db)
            throw SQLiteError(description: message)
        }
        handle = db
    }

    deinit { sqlite3_close(handle) }

    private var lastError: String { String(cString: sqlite3_errmsg(handle)) }

    func execute(_ sql: String) throws {
        guard sqlite3_exec(handle, sql, nil, nil, nil) == SQLITE_OK else {
            throw SQLiteError(description: lastError)
        }
    }

    /// 쿼리를 실행하고 행마다 `row`를 부른다. `row`가 false를 돌려주면 멈춘다.
    func query(_ sql: String, _ args: [Any?] = [], row: (SQLiteRow) -> Bool = { _ in true }) throws {
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &stmt, nil) == SQLITE_OK else {
            throw SQLiteError(description: lastError)
        }
        defer { sqlite3_finalize(stmt) }
        for (i, value) in args.enumerated() {
            let n = Int32(i + 1)
            switch value {
            case let v as String: sqlite3_bind_text(stmt, n, v, -1, SQLITE_TRANSIENT)
            case let v as Int: sqlite3_bind_int64(stmt, n, Int64(v))
            case let v as Double: sqlite3_bind_double(stmt, n, v)
            default: sqlite3_bind_null(stmt, n)
            }
        }
        let wrapped = SQLiteRow(stmt: stmt)
        while true {
            let rc = sqlite3_step(stmt)
            if rc == SQLITE_DONE { return }
            guard rc == SQLITE_ROW else { throw SQLiteError(description: lastError) }
            if !row(wrapped) { return }
        }
    }
}

struct SQLiteRow {
    let stmt: OpaquePointer?

    func isNull(_ i: Int32) -> Bool { sqlite3_column_type(stmt, i) == SQLITE_NULL }
    func isText(_ i: Int32) -> Bool { sqlite3_column_type(stmt, i) == SQLITE_TEXT }
    func int(_ i: Int32) -> Int { Int(sqlite3_column_int64(stmt, i)) }
    func double(_ i: Int32) -> Double { sqlite3_column_double(stmt, i) }

    func string(_ i: Int32) -> String? {
        guard let p = sqlite3_column_text(stmt, i) else { return nil }
        return String(decoding: UnsafeBufferPointer(start: p, count: Int(sqlite3_column_bytes(stmt, i))), as: UTF8.self)
    }

    func data(_ i: Int32) -> Data? {
        guard let p = sqlite3_column_blob(stmt, i) else { return nil }
        return Data(bytes: p, count: Int(sqlite3_column_bytes(stmt, i)))
    }

    /// 글자를 문자열로 만들지 않고 바이트 그대로 받는다(제목 목록 읽기용).
    func withTextBytes(_ i: Int32, _ body: (UnsafeBufferPointer<UInt8>) -> Void) {
        guard let p = sqlite3_column_text(stmt, i) else { return }
        body(UnsafeBufferPointer(start: p, count: Int(sqlite3_column_bytes(stmt, i))))
    }
}
