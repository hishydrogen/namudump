import Foundation
import Network
import NamuDumpCore

/// 동영상 플레이어를 감싸는 페이지만 내주는 작은 로컬 서버. 재생을 처음 누를 때만 열린다.
final class EmbedServer {
    private let queue = DispatchQueue(label: "namudump.embed")
    private var listener: NWListener?
    private var port: UInt16?

    func wrappedURL(for url: String) -> String? {
        guard EmbedPage.isAllowed(url), let port = startIfNeeded() else { return nil }
        var query = URLComponents()
        query.queryItems = [URLQueryItem(name: "u", value: url)]
        let encoded = query.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B") ?? ""
        return "http://127.0.0.1:\(port)/embed?\(encoded)"
    }

    private func startIfNeeded() -> UInt16? {
        queue.sync {
            if let port { return port }
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
            guard let listener = try? NWListener(using: parameters) else { return nil }
            let ready = DispatchSemaphore(value: 0)
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready, .failed, .cancelled: ready.signal()
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in self?.serve(connection) }
            listener.start(queue: DispatchQueue.global(qos: .userInitiated))
            guard ready.wait(timeout: .now() + 3) == .success, let opened = listener.port?.rawValue else { return nil }
            self.listener = listener
            port = opened
            return opened
        }
    }

    private func serve(_ connection: NWConnection) {
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] data, _, _, _ in
            let request = data.map { String(decoding: $0, as: UTF8.self) } ?? ""
            let response = self?.respond(to: request) ?? Data()
            connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
        }
    }

    private func respond(to request: String) -> Data {
        let lines = request.components(separatedBy: "\r\n")
        let parts = lines.first?.components(separatedBy: " ") ?? []
        let hostOK = lines.contains { $0.lowercased() == "host: 127.0.0.1:\(port ?? 0)" }
        var body: String?
        if parts.count >= 2, parts[0] == "GET", hostOK, let target = URLComponents(string: parts[1]), target.path == "/embed",
           let url = target.queryItems?.first(where: { $0.name == "u" })?.value {
            body = EmbedPage.html(for: url)
        }
        let content = Data((body ?? "not found").utf8)
        let head = "HTTP/1.1 \(body == nil ? "404 Not Found" : "200 OK")\r\n" +
            "Content-Type: text/html; charset=utf-8\r\nContent-Length: \(content.count)\r\n" +
            "Referrer-Policy: strict-origin-when-cross-origin\r\n" +
            "Content-Security-Policy: default-src 'none'; frame-src https:; style-src 'unsafe-inline'\r\nConnection: close\r\n\r\n"
        return Data(head.utf8) + content
    }
}
