import Foundation

/// 버전과 만든 사람은 여기 한 곳에서 정한다. build/make_app.py도 이 값을 읽는다.
public enum AppInfo {
    public static let name = "나무덤프"
    public static let version = "2.0.0"
    public static let author = "hishydrogen"
    public static let copyright = "© 2026 " + author
    public static let homepage = "https://github.com/hishydrogen/namudump"

    /// 설정과 기록을 두는 곳. NAMUDUMP_SUPPORT를 주면 평소 기록을 건드리지 않고 시험할 수 있다.
    public static var supportDirectory: URL {
        if let dir = ProcessInfo.processInfo.environment["NAMUDUMP_SUPPORT"], !dir.isEmpty {
            return URL(fileURLWithPath: dir, isDirectory: true)
        }
        return FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/NamuDump", isDirectory: true)
    }
}
