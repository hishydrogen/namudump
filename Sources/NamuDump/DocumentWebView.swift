import AppKit
import WebKit

/// 문서를 보여 주는 웹 뷰. 맥 입력(휠, 한글 입력기, 오른쪽 클릭 메뉴)을 다듬는다.
final class DocumentWebView: WKWebView {
    private static let wheelLine = 40.0       // 휠 한 칸의 이동 거리. WebKit과 크롬이 쓰는 값과 같다
    // 오른쪽 클릭 메뉴에서 뺄 항목(WebKit 메뉴 항목 식별자의 일부)
    private static let droppedMenuItems = ["OpenLink", "NewWindow", "Download", "Reload", "GoBack", "GoForward",
                                           "Inspect", "OpenFrame", "OpenMedia", "ShowHideMediaControls", "ToggleFullScreen",
                                           "EnterVideoFullscreen", "ToggleVideoEnhancedFullscreen"]

    private var bypassInputContext = false

    private func point(for event: NSEvent) -> NSPoint {
        var p = convert(event.locationInWindow, from: nil)
        if !isFlipped { p.y = bounds.height - p.y }
        return p
    }

    // MARK: 스크롤

    override func scrollWheel(with event: NSEvent) {
        if !event.hasPreciseScrollingDeltas, event.phase.isEmpty, event.momentumPhase.isEmpty, event.modifierFlags.intersection([.command, .control]).isEmpty {
            // 칸 단위로 움직이는 일반 마우스 휠만 웹에서 부드럽게 굴린다
            let dx = -event.scrollingDeltaX * Self.wheelLine, dy = -event.scrollingDeltaY * Self.wheelLine
            if dx != 0 || dy != 0 {
                let p = point(for: event)
                evaluateJavaScript("ND_wheel(\(dx),\(dy),\(p.x),\(p.y))")
                return
            }
        }
        super.scrollWheel(with: event)
    }

    // MARK: 마우스

    // 한글 입력기가 켜진 채 입력창에 초점이 있으면 입력기가 다른 곳의 첫 클릭을 먹는다.
    // 클릭하는 동안 inputContext를 비워 클릭이 웹으로 바로 가게 한다. 조합 중인 글자는 먼저 확정한다.
    override var inputContext: NSTextInputContext? { bypassInputContext ? nil : super.inputContext }

    private func withoutInputMethod(_ body: () -> Void) {
        if let context = super.inputContext {
            let unmark = NSSelectorFromString("unmarkText")
            if responds(to: unmark) { perform(unmark) }
            context.discardMarkedText()
        }
        bypassInputContext = true
        body()
        bypassInputContext = false
    }

    override func mouseDown(with event: NSEvent) { withoutInputMethod { super.mouseDown(with: event) } }
    override func mouseUp(with event: NSEvent) { withoutInputMethod { super.mouseUp(with: event) } }

    // 마우스 옆 단추. WebKit은 이 단추들을 가운데 단추로 뭉뚱그려서 여기서 처리한다.
    override func otherMouseDown(with event: NSEvent) {
        if event.buttonNumber != 3, event.buttonNumber != 4 { super.otherMouseDown(with: event) }
    }

    override func otherMouseUp(with event: NSEvent) {
        switch event.buttonNumber {
        case 3: evaluateJavaScript("history.back()")
        case 4: evaluateJavaScript("history.forward()")
        default: super.otherMouseUp(with: event)
        }
    }

    // 웹이 처리하지 않은 esc에 AppKit이 경고음을 내지 않게 조용히 받는다
    override func cancelOperation(_ sender: Any?) {}

    // MARK: 오른쪽 클릭 메뉴

    override func willOpenMenu(_ menu: NSMenu, with event: NSEvent) {
        super.willOpenMenu(menu, with: event)
        var hasSelection = false
        for item in menu.items {
            let identifier = item.identifier?.rawValue ?? ""
            // 글자를 골랐을 때만 나오는 항목(찾아보기, 웹 검색)으로 선택 여부를 판단한다
            if identifier.contains("LookUp") || identifier.contains("SearchWeb") { hasSelection = true }
            if Self.droppedMenuItems.contains(where: identifier.contains) { menu.removeItem(item) }
        }
        var previousIsSeparator = true
        for item in menu.items {
            if item.isSeparatorItem, previousIsSeparator { menu.removeItem(item) }
            previousIsSeparator = item.isSeparatorItem
        }
        while menu.items.last?.isSeparatorItem == true { menu.removeItem(at: menu.items.count - 1) }
        if hasSelection {
            let search = NSMenuItem(title: "나무덤프에서 제목 검색", action: #selector(searchSelection), keyEquivalent: "")
            search.target = self
            menu.insertItem(.separator(), at: 0)
            menu.insertItem(search, at: 0)
        }
    }

    @objc private func searchSelection() { evaluateJavaScript("ND.searchSelection()") }
}
