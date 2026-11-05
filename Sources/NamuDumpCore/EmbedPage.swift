import Foundation

/// 앱 주소(namudump://)에서는 Referer가 보내지지 않아 유튜브가 재생을 거부한다(오류 153).
/// 그래서 재생을 누르면 앱의 로컬 페이지가 플레이어를 감싼다. 이 페이지의 내용을 만든다.
public enum EmbedPage {
    private static let hosts: Set<String> = [
        "www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "embed.nicovideo.jp",
        "tv.naver.com", "serviceapi.nmv.naver.com", "serviceapi.rmcnmv.naver.com", "play-tv.kakao.com",
    ]

    public static func isAllowed(_ url: String) -> Bool {
        guard let parts = URLComponents(string: url), parts.scheme == "https", let host = parts.host else { return false }
        return hosts.contains(host.lowercased())
    }

    public static func html(for url: String) -> String? {
        guard isAllowed(url) else { return nil }
        let safe = url.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
        return """
            <!doctype html><html><head><meta charset="utf-8"><title>동영상</title>
            <style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head>
            <body><iframe src="\(safe)" referrerpolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>
            """
    }
}
