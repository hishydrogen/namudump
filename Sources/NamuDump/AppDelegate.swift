import AppKit
import NamuDumpCore
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var settingsWindow: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.mainMenu = makeMenu()
        AppModel.shared.applyAppearance()
        AppModel.shared.openWindow()
        NSApp.activate()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool { true }

    @objc func newWindow(_ sender: Any?) { AppModel.shared.openWindow() }
    @objc func chooseDump(_ sender: Any?) { AppModel.shared.chooseDump() }

    @objc func setTheme(_ sender: NSMenuItem) {
        AppModel.shared.update(settings: ["theme": sender.representedObject as? String ?? "system"])
    }

    @objc func showSettings(_ sender: Any?) {
        if settingsWindow == nil {
            let window = NSWindow(contentViewController: NSHostingController(rootView: SettingsView()))
            window.title = "설정"
            window.styleMask = [.titled, .closable]
            window.isReleasedWhenClosed = false
            window.center()
            settingsWindow = window
        }
        settingsWindow?.makeKeyAndOrderFront(nil)
    }

    @objc func showAbout(_ sender: Any?) {
        let credits = NSMutableAttributedString()
        let style = NSMutableParagraphStyle()
        style.alignment = .center
        style.lineSpacing = 2
        let lines: [(String, String?)] = [
            ("나무위키 덤프를 인터넷 없이 읽는 맥용 프로그램\n\n", nil),
            (AppInfo.homepage.replacingOccurrences(of: "https://", with: "") + "\n", AppInfo.homepage),
            ("코드: MIT 라이선스\n", nil),
            ("문서 내용: 나무위키 기여자, CC BY-NC-SA 2.0 KR\n", "https://creativecommons.org/licenses/by-nc-sa/2.0/kr/"),
            ("수식: KaTeX(MIT)\n\n", nil),
            ("나무위키와 관계없는 비공식 프로그램입니다.", nil),
        ]
        for (text, link) in lines {
            var attributes: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: NSFont.smallSystemFontSize), .paragraphStyle: style,
                .foregroundColor: NSColor.secondaryLabelColor,
            ]
            if let link { attributes[.link] = URL(string: link) }
            credits.append(NSAttributedString(string: text, attributes: attributes))
        }
        NSApp.orderFrontStandardAboutPanel(options: [.credits: credits, .applicationName: AppInfo.name, .applicationVersion: AppInfo.version,
                                                     .version: "", NSApplication.AboutPanelOptionKey(rawValue: "Copyright"): AppInfo.copyright])
    }

    private func makeMenu() -> NSMenu {
        let main = NSMenu()
        func item(_ title: String, _ action: Selector?, _ key: String = "", _ flags: NSEvent.ModifierFlags = .command, target: AnyObject? = nil) -> NSMenuItem {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
            item.keyEquivalentModifierMask = flags
            item.target = target
            return item
        }
        func menu(_ title: String, _ items: [NSMenuItem]) -> NSMenu {
            let sub = NSMenu(title: title)
            items.forEach(sub.addItem)
            let holder = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            holder.submenu = sub
            main.addItem(holder)
            return sub
        }
        let name = AppInfo.name
        let services = NSMenuItem(title: "서비스", action: nil, keyEquivalent: "")
        services.submenu = NSMenu()
        NSApp.servicesMenu = services.submenu
        _ = menu(name, [
            item("\(name)에 관하여", #selector(showAbout), target: self), .separator(),
            item("설정…", #selector(showSettings), ",", target: self), .separator(), services, .separator(),
            item("\(name) 가리기", #selector(NSApplication.hide(_:)), "h"),
            item("기타 가리기", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            item("모두 보기", #selector(NSApplication.unhideAllApplications(_:))), .separator(),
            item("\(name) 종료", #selector(NSApplication.terminate(_:)), "q"),
        ])
        _ = menu("파일", [
            item("새 창", #selector(newWindow), "n", target: self),
            item("덤프 파일 열기…", #selector(chooseDump), "o", target: self), .separator(),
            item("창 닫기", #selector(NSWindow.performClose(_:)), "w"),
        ])
        _ = menu("편집", [
            item("실행 취소", Selector(("undo:")), "z"), item("실행 복귀", Selector(("redo:")), "z", [.command, .shift]), .separator(),
            item("오려두기", #selector(NSText.cut(_:)), "x"), item("복사하기", #selector(NSText.copy(_:)), "c"),
            item("붙여넣기", #selector(NSText.paste(_:)), "v"), item("전체 선택", #selector(NSText.selectAll(_:)), "a"), .separator(),
            item("제목 검색", #selector(MainWindowController.focusSearch(_:)), "k"),
            item("문서 안에서 찾기", #selector(MainWindowController.findInDocument(_:)), "f"),
        ])
        let themes = NSMenu()
        for (title, value) in [("시스템", "system"), ("라이트", "light"), ("다크", "dark")] {
            let theme = item(title, #selector(setTheme), target: self)
            theme.representedObject = value
            themes.addItem(theme)
        }
        let themeItem = NSMenuItem(title: "화면 모드", action: nil, keyEquivalent: "")
        themeItem.submenu = themes
        _ = menu("보기", [
            item("사이드바 보기", #selector(NSSplitViewController.toggleSidebar(_:)), "s", [.command, .option]), .separator(),
            item("글자 크게", #selector(MainWindowController.fontBigger(_:)), "+"),
            item("글자 작게", #selector(MainWindowController.fontSmaller(_:)), "-"),
            item("글자 원래대로", #selector(MainWindowController.fontReset(_:)), "0"), .separator(), themeItem, .separator(),
            item("전체 화면", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control]),
        ])
        _ = menu("이동", [
            item("뒤로", #selector(MainWindowController.goBack(_:)), "["),
            item("앞으로", #selector(MainWindowController.goForward(_:)), "]"),
            item("처음 화면", #selector(MainWindowController.goHome(_:)), "h", [.command, .shift]), .separator(),
            item("아무 문서", #selector(MainWindowController.randomDocument(_:)), "r"),
            item("즐겨찾기에 넣기, 빼기", #selector(MainWindowController.toggleBookmark(_:)), "d"),
            item("최근 본 문서", #selector(MainWindowController.showHistory(_:)), "y"),
        ])
        NSApp.windowsMenu = menu("윈도우", [
            item("최소화", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("확대/축소", #selector(NSWindow.performZoom(_:))),
        ])
        return main
    }
}
