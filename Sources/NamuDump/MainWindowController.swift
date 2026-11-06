import AppKit
import NamuDumpCore
import SwiftUI
import WebKit

private extension NSToolbarItem.Identifier {
    static let navigation = Self("nav")
    static let home = Self("home")
    static let star = Self("star")
    static let random = Self("random")
    static let search = Self("search")
    static let theme = Self("theme")
    static let settings = Self("settings")
}

/// 문서 영역. 웹 뷰는 도구 막대 뒤까지 뻗고, 내용은 그 아래에서 시작한다.
/// 그래서 문서가 유리 도구 막대 아래로 비쳐 지나간다.
final class DocumentViewController: NSViewController {
    let webView: DocumentWebView

    init(webView: DocumentWebView) {
        self.webView = webView
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("코드로만 만든다") }

    override func loadView() {
        if #available(macOS 26.0, *) {
            view = webView
        } else {
            let container = NSView()
            webView.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(webView)
            NSLayoutConstraint.activate([
                webView.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
                webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
                webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            ])
            view = container
        }
    }

    override func viewDidLayout() {
        super.viewDidLayout()
        if #available(macOS 26.0, *) {
            webView.obscuredContentInsets = NSEdgeInsets(top: view.safeAreaInsets.top, left: 0, bottom: 0, right: 0)
        }
    }
}

final class MainWindowController: NSWindowController, NSMenuItemValidation, NSWindowDelegate, NSToolbarDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private let webView: DocumentWebView
    private let split = NSSplitViewController()
    private let sidebar = SidebarModel()
    private let search = SearchController()
    private let startURL: URL
    private var navigationItem: NSToolbarItemGroup?
    private var starItem: NSToolbarItem?
    private var searchItem: NSSearchToolbarItem?
    private var historyObservers: [NSKeyValueObservation] = []
    private var hasDocument = false
    private var bookmarked = false

    init(url: URL) {
        startURL = url
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(SchemeHandler(), forURLScheme: "namudump")
        configuration.preferences.isElementFullscreenEnabled = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        webView = DocumentWebView(frame: .zero, configuration: configuration)
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 880),
                              styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                              backing: .buffered, defer: false)
        super.init(window: window)

        configuration.userContentController.add(WeakMessageHandler(self), name: "nd")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        historyObservers = [
            webView.observe(\.canGoBack, options: [.initial]) { [weak self] _, _ in self?.updateNavigation() },
            webView.observe(\.canGoForward) { [weak self] _, _ in self?.updateNavigation() },
        ]
        webView.allowsMagnification = false
        #if DEBUG
        webView.isInspectable = true
        #endif

        let sidebarContent = NSHostingController(rootView: SidebarView(model: sidebar))
        sidebarContent.sizingOptions = []       // SwiftUI 내용 크기가 창 크기를 바꾸지 않게 한다
        let sidebarItem = NSSplitViewItem(sidebarWithViewController: sidebarContent)
        sidebarItem.minimumThickness = 220
        sidebarItem.maximumThickness = 340
        sidebarItem.canCollapse = true
        sidebarItem.isCollapsed = AppModel.shared.settings["toc_sidebar"] as? Bool == false
        split.addSplitViewItem(sidebarItem)
        split.addSplitViewItem(NSSplitViewItem(viewController: DocumentViewController(webView: webView)))

        window.contentViewController = split
        window.delegate = self
        window.title = AppInfo.name
        window.minSize = NSSize(width: 640, height: 480)
        window.tabbingMode = .disallowed
        window.toolbarStyle = .unified
        let toolbar = NSToolbar(identifier: "main")
        toolbar.delegate = self
        toolbar.displayMode = .iconOnly
        toolbar.allowsUserCustomization = true
        toolbar.autosavesConfiguration = true
        window.toolbar = toolbar
        window.setContentSize(NSSize(width: 1280, height: 880))
        window.setFrameAutosaveName(AppModel.shared.windows.isEmpty ? "NamuDumpMain" : "")
        if AppModel.shared.windows.isEmpty, window.frame.origin == .zero { window.center() }

        sidebar.openDocument = { [weak self] title in self?.open(title) }
        sidebar.openAnchor = { [weak self] id in self?.run("ND.anchor(\(Self.quoted(id)))") }
        sidebar.bookmarkRemoved = { [weak self] title in
            self?.run("ND.unbookmarked(\(Self.quoted(title)))")
            AppModel.shared.windows.forEach { $0.listsChanged() }
        }
        sidebar.historyCleared = { AppModel.shared.windows.forEach { $0.listsChanged() } }
        sidebar.reload()
        search.openTitle = { [weak self] title in self?.open(title) }
        search.runSearch = { [weak self] query in self?.run("ND.search(\(Self.quoted(query)))") }
        search.finished = { [weak self] in self?.window?.makeFirstResponder(self?.webView) }

        webView.load(URLRequest(url: url))
        #if DEBUG
        DebugHook.attach(to: webView)
        if let query = ProcessInfo.processInfo.environment["NAMUDUMP_SEARCH"] {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                guard let self, let item = self.searchItem else { return }
                self.window?.makeKeyAndOrderFront(nil)
                self.window?.makeFirstResponder(item.searchField)
                item.searchField.stringValue = query
                item.searchField.currentEditor()?.string = query
                self.search.controlTextDidChange(Notification(name: NSControl.textDidChangeNotification))
            }
        }
        #endif
    }

    required init?(coder: NSCoder) { fatalError("코드로만 만든다") }

    func windowWillClose(_ notification: Notification) {
        AppModel.shared.api.store.saveSettings(["toc_sidebar": split.splitViewItems.first?.isCollapsed == false])
        AppModel.shared.windowClosed(self)
    }

    func windowDidResignKey(_ notification: Notification) { search.close() }

    /// 화면(app.js)의 window.ND를 부른다.
    func run(_ script: String) { webView.evaluateJavaScript(script) }

    func listsChanged() {
        sidebar.reload()
        run("ND.lists()")
    }

    private func updateNavigation() {
        navigationItem?.subitems.first?.isEnabled = webView.canGoBack
        navigationItem?.subitems.last?.isEnabled = webView.canGoForward
    }

    private func open(_ title: String) { run("ND.open(\(Self.quoted(title)))") }

    private static func quoted(_ text: String) -> String {
        (try? JSONSerialization.data(withJSONObject: text, options: .fragmentsAllowed)).map { String(decoding: $0, as: UTF8.self) } ?? "\"\""
    }

    // MARK: 메뉴와 도구 막대 동작

    @objc func goBack(_ sender: Any?) { run("ND.back()") }
    @objc func goForward(_ sender: Any?) { run("ND.forward()") }
    @objc func goHome(_ sender: Any?) { run("ND.home()") }
    @objc func randomDocument(_ sender: Any?) { run("ND.random()") }
    @objc func toggleBookmark(_ sender: Any?) { run("ND.toggleStar()") }
    @objc func findInDocument(_ sender: Any?) { run("ND.find()") }
    @objc func fontBigger(_ sender: Any?) { run("ND.fontSize(1)") }
    @objc func fontSmaller(_ sender: Any?) { run("ND.fontSize(-1)") }
    @objc func fontReset(_ sender: Any?) { run("ND.fontSize(0)") }
    @objc func focusSearch(_ sender: Any?) { searchItem?.beginSearchInteraction() }
    @objc func showHistory(_ sender: Any?) { show(.history) }

    @objc private func navigationClicked(_ sender: NSToolbarItemGroup) {
        if sender.selectedIndex == 0 { goBack(nil) } else { goForward(nil) }
    }

    @objc private func cycleTheme(_ sender: Any?) {
        let next = ["system": "light", "light": "dark", "dark": "system"][AppModel.shared.settings["theme"] as? String ?? "system"] ?? "system"
        AppModel.shared.update(settings: ["theme": next])
    }

    private func show(_ tab: SidebarModel.Tab) {
        sidebar.tab = tab
        sidebar.reload()
        split.splitViewItems.first?.animator().isCollapsed = false
    }

    func validateMenuItemState(_ action: Selector?) -> Bool {
        switch action {
        case #selector(goBack(_:)): return webView.canGoBack
        case #selector(goForward(_:)): return webView.canGoForward
        case #selector(toggleBookmark(_:)): return hasDocument
        default: return true
        }
    }

    @objc func validateMenuItem(_ item: NSMenuItem) -> Bool {
        if item.action == #selector(toggleBookmark(_:)) { item.state = bookmarked ? .on : .off }
        return validateMenuItemState(item.action)
    }

    // MARK: 웹에서 오는 알림

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let data = message.body as? [String: Any], let kind = data["kind"] as? String else { return }
        switch kind {
        case "title":
            window?.title = (data["title"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? AppInfo.name
        case "star":
            hasDocument = data["enabled"] as? Bool ?? false
            bookmarked = data["on"] as? Bool ?? false
            starItem?.isEnabled = hasDocument
            starItem?.image = NSImage(systemSymbolName: bookmarked ? "star.fill" : "star", accessibilityDescription: "즐겨찾기")
            starItem?.toolTip = bookmarked ? "즐겨찾기에서 빼기 (⌘D)" : "즐겨찾기에 넣기 (⌘D)"
        case "toc":
            let items = data["items"] as? [[String: Any]] ?? []
            sidebar.toc = items.compactMap { row in
                guard let id = row["id"] as? String else { return nil }
                return TOCEntry(id: id, number: row["num"] as? String ?? "", text: row["text"] as? String ?? "", level: row["level"] as? Int ?? 2)
            }
            sidebar.activeAnchor = nil
            sidebar.reload()
        case "spy": sidebar.activeAnchor = data["id"] as? String
        case "bg":
            if let color = NSColor(hex: data["color"] as? String ?? "") {
                webView.underPageBackgroundColor = color
                window?.backgroundColor = color
            }
        case "focusSearch": focusSearch(nil)
        case "lists": AppModel.shared.windows.forEach { $0.listsChanged() }
        case "settings": AppModel.shared.settingsChanged()
        case "dump": NotificationCenter.default.post(name: .settingsChanged, object: nil)
        case "sidebar": show(data["tab"] as? String == "bookmarks" ? .bookmarks : .history)
        default: break
        }
    }

    // MARK: 웹 뷰 이동

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        let isFrame = action.targetFrame?.isMainFrame == false
        if url.scheme == "namudump" || url.scheme == "about" || isFrame {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        if API.isExternalURL(url.absoluteString) { NSWorkspace.shared.open(url) }
    }

    /// window.open(⌘을 누르고 링크 클릭)은 새 창으로 연다.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, url.scheme == "namudump" {
            AppModel.shared.openWindow(url: url)
        } else if let url = action.request.url, API.isExternalURL(url.absoluteString) {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // MARK: 도구 막대

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.toggleSidebar, .sidebarTrackingSeparator, .navigation, .home, .flexibleSpace, .star, .random, .search]
    }

    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        toolbarDefaultItemIdentifiers(toolbar) + [.theme, .settings, .space, .flexibleSpace]
    }

    private func button(_ id: NSToolbarItem.Identifier, _ symbol: String, _ label: String, _ tip: String, _ action: Selector, target: AnyObject? = nil) -> NSToolbarItem {
        let item = NSToolbarItem(itemIdentifier: id)
        item.image = NSImage(systemSymbolName: symbol, accessibilityDescription: label)
        item.label = label
        item.toolTip = tip
        item.target = target ?? self
        item.action = action
        item.isBordered = true
        item.autovalidates = false
        return item
    }

    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier id: NSToolbarItem.Identifier, willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        switch id {
        case .navigation:
            let group = NSToolbarItemGroup(itemIdentifier: id, images: [
                NSImage(systemSymbolName: "chevron.backward", accessibilityDescription: "뒤로")!,
                NSImage(systemSymbolName: "chevron.forward", accessibilityDescription: "앞으로")!,
            ], selectionMode: .momentary, labels: ["뒤로", "앞으로"], target: self, action: #selector(navigationClicked))
            group.label = "뒤로, 앞으로"
            group.autovalidates = false
            group.isNavigational = true         // 왼쪽, 창 제목 앞에 놓는다
            navigationItem = group
            updateNavigation()
            return group
        case .home:
            let item = button(id, "house", "처음 화면", "처음 화면 (⇧⌘H)", #selector(goHome))
            item.isNavigational = true
            return item
        case .star:
            let item = button(id, "star", "즐겨찾기", "즐겨찾기 (⌘D)", #selector(toggleBookmark))
            item.isEnabled = hasDocument
            starItem = item
            return item
        case .random: return button(id, "shuffle", "아무 문서", "아무 문서 (⌘R)", #selector(randomDocument))
        case .theme: return button(id, "circle.lefthalf.filled", "화면 모드", "화면 모드 바꾸기", #selector(cycleTheme))
        case .settings: return button(id, "gearshape", "설정", "설정 (⌘,)", #selector(AppDelegate.showSettings), target: NSApp.delegate as AnyObject)
        case .search:
            let item = NSSearchToolbarItem(itemIdentifier: id)
            item.searchField.placeholderString = "문서 제목 검색"
            item.preferredWidthForSearchField = 280
            item.resignsFirstResponderWithCancel = true
            search.attach(to: item.searchField)
            searchItem = item
            return item
        default: return nil
        }
    }
}

/// WKUserContentController가 창을 붙잡지 않게 한다.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}

private extension NSColor {
    convenience init?(hex: String) {
        guard hex.count == 7, hex.hasPrefix("#"), let value = Int(hex.dropFirst(), radix: 16) else { return nil }
        self.init(srgbRed: CGFloat(value >> 16 & 255) / 255, green: CGFloat(value >> 8 & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
    }
}
