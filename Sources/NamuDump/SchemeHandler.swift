import Foundation
import WebKit
import NamuDumpCore

/// namudump:// 주소를 처리한다. 화면 파일과 /api/... 를 포트 없이 내준다.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    private var stopped = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let method = task.request.httpMethod ?? "GET"
        let body = task.request.httpBody
        let path = url.path
        let id = ObjectIdentifier(task)
        DispatchQueue.global(qos: .userInitiated).async {
            let model = AppModel.shared
            var status: Int
            var data: Data
            var headers: [String: String]
            if path.hasPrefix("/api/") {
                var query: [String: String] = [:]
                URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.forEach { item in
                    if query[item.name] == nil { query[item.name] = item.value ?? "" }
                }
                let result = model.api.handle(method: method, endpoint: String(path.dropFirst(5)), query: query, body: body)
                status = result.status
                data = result.body
                headers = ["Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"]
            } else {
                let result = model.files.response(path: path)
                status = result.status
                data = result.body
                headers = result.headers
            }
            headers["Content-Length"] = String(data.count)
            headers["X-Content-Type-Options"] = "nosniff"
            DispatchQueue.main.async { [self] in
                // 웹 뷰가 이미 취소한 요청에 답하면 예외가 난다
                guard stopped.remove(id) == nil else { return }
                guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
                    task.didFailWithError(URLError(.badServerResponse))
                    return
                }
                task.didReceive(response)
                task.didReceive(data)
                task.didFinish()
            }
        }
    }

    func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {
        stopped.insert(ObjectIdentifier(task))
    }
}
