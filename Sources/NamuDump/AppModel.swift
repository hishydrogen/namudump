import AppKit
import NamuDumpCore

/// 앱 전체가 함께 쓰는 것: 덤프와 사용자 데이터, 열린 창들.
final class AppModel: NSObject, APIHost {
    static let shared = AppModel()

    let api: API
    let files: StaticFiles
    private let embeds = EmbedServer()
    private(set) var windows: [MainWindowController] = []

    private override init() {
        let support = AppInfo.supportDirectory
        do {
            api = API(store: try UserStore(root: support))
        } catch {
            fatalError("설정 폴더를 열지 못했습니다: \(error)")
        }
        let web = ProcessInfo.processInfo.environment["NAMUDUMP_WEB"].map { URL(fileURLWithPath: $0) }
            ?? Bundle.main.resourceURL!.appendingPathComponent("web")
        files = StaticFiles(root: web)
        super.init()
        api.host = self
    }

    var settings: [String: Any] { api.store.settings }

    @discardableResult
    func openWindow(url: URL? = nil) -> MainWindowController {
        let controller = MainWindowController(url: url ?? URL(string: "namudump://app/")!)
        windows.append(controller)
        controller.showWindow(nil)
        return controller
    }

    func windowClosed(_ controller: MainWindowController) {
        windows.removeAll { $0 === controller }
    }

    func applyAppearance() {
        switch settings["theme"] as? String {
        case "light": NSApp.appearance = NSAppearance(named: .aqua)
        case "dark": NSApp.appearance = NSAppearance(named: .darkAqua)
        default: NSApp.appearance = nil
        }
    }

    /// 설정을 저장하고 모든 창에 알린다.
    func update(settings patch: [String: Any]) {
        api.store.saveSettings(patch)
        settingsChanged()
    }

    func settingsChanged() {
        applyAppearance()
        NotificationCenter.default.post(name: .settingsChanged, object: nil)
        let json = (try? JSONSerialization.data(withJSONObject: settings)).map { String(decoding: $0, as: UTF8.self) } ?? "{}"
        windows.forEach { $0.run("ND.settings(\(json))") }
    }

    /// 덤프를 고르고, 열리면 모든 창을 처음 화면으로 돌린다.
    func chooseDump() {
        guard let path = runOpenPanel() else { return }
        if api.open(dumpAt: path) {
            NotificationCenter.default.post(name: .settingsChanged, object: nil)
            windows.forEach { $0.run("ND.reload()") }
        } else {
            let alert = NSAlert()
            alert.messageText = "덤프 파일을 열지 못했습니다"
            alert.informativeText = api.dumpError
            alert.runModal()
        }
    }

    private func runOpenPanel() -> String? {
        let panel = NSOpenPanel()
        panel.message = "나무위키 덤프 파일(.sqlite)을 선택하세요"
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        return panel.runModal() == .OK ? panel.url?.path : nil
    }

    // MARK: APIHost (백그라운드에서 불린다)

    func pickDumpFile() -> String? {
        DispatchQueue.main.sync { runOpenPanel() }
    }

    func openExternal(_ url: String) -> Bool {
        guard let target = URL(string: url) else { return false }
        DispatchQueue.main.async { NSWorkspace.shared.open(target) }
        return true
    }

    func embedURL(for url: String) -> String? {
        embeds.wrappedURL(for: url)
    }
}

extension Notification.Name {
    static let settingsChanged = Notification.Name("NamuDumpSettingsChanged")
}
