#if DEBUG
import AppKit
import WebKit

/// 개발용 앱에서만 쓴다. NAMUDUMP_EVAL 파일의 JS를 돌려 결과를 NAMUDUMP_EVAL_OUT에 적고 끝낸다.
enum DebugHook {
    static func attach(to webView: WKWebView) {
        let env = ProcessInfo.processInfo.environment
        guard let script = env["NAMUDUMP_EVAL"], let out = env["NAMUDUMP_EVAL_OUT"], let body = try? String(contentsOfFile: script, encoding: .utf8) else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            webView.callAsyncJavaScript(body, arguments: [:], in: nil, in: .page) { result in
                var text: String
                switch result {
                case .success(let value): text = (value as? String) ?? String(describing: value)
                case .failure(let error): text = "실패: \(error)"
                }
                text += "\n"
                try? text.write(toFile: out, atomically: true, encoding: .utf8)
                guard let shot = env["NAMUDUMP_SNAP"] else { if env["NAMUDUMP_KEEP"] == nil { exit(0) }; return }
                webView.takeSnapshot(with: nil) { image, _ in
                    if let data = image?.tiffRepresentation, let rep = NSBitmapImageRep(data: data), let png = rep.representation(using: .png, properties: [:]) {
                        try? png.write(to: URL(fileURLWithPath: shot))
                    }
                    if env["NAMUDUMP_KEEP"] == nil { exit(0) }
                }
            }
        }
    }
}
#endif
