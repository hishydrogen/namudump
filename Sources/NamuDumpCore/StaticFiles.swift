import Foundation

/// 화면 파일(web/)을 내준다. web/ 밖의 파일은 내주지 않는다.
public struct StaticFiles {
    public static let contentSecurityPolicy =
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
        "font-src 'self' data:; script-src 'self'; connect-src 'self'; " +
        "frame-src https: http://127.0.0.1:*; media-src https: http:; " +
        "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

    private static let types = [
        "html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
        "json": "application/json; charset=utf-8", "png": "image/png", "svg": "image/svg+xml", "woff2": "font/woff2",
    ]

    public let root: URL
    public init(root: URL) { self.root = root.standardizedFileURL }

    public struct Response {
        public let status: Int
        public let body: Data
        public let headers: [String: String]
    }

    public func response(path: String) -> Response {
        // 문서 주소는 모두 화면 뼈대로 보낸다. 나머지는 라우팅을 화면이 맡는다.
        var relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        if relative.isEmpty || relative == "search" || relative.hasPrefix("w/") { relative = "index.html" }
        let url = root.appendingPathComponent(relative).standardizedFileURL
        var isDirectory: ObjCBool = false
        guard url.path.hasPrefix(root.path + "/"), FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory),
              !isDirectory.boolValue, let data = try? Data(contentsOf: url) else {
            return Response(status: 404, body: Data("not found".utf8), headers: ["Content-Type": "text/plain; charset=utf-8"])
        }
        var headers = ["Content-Type": StaticFiles.types[url.pathExtension.lowercased()] ?? "application/octet-stream", "Cache-Control": "no-cache"]
        if relative == "index.html" { headers["Content-Security-Policy"] = StaticFiles.contentSecurityPolicy }
        return Response(status: 200, body: data, headers: headers)
    }
}
