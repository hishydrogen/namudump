import AppKit
import Combine
import NamuDumpCore
import SwiftUI

final class SuggestionModel: ObservableObject {
    @Published var items: [String] = []
    @Published var selected: Int?
    var pick: (String) -> Void = { _ in }
}

private struct SuggestionList: View {
    @ObservedObject var model: SuggestionModel

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(model.items.enumerated()), id: \.offset) { index, title in
                Button { model.pick(title) } label: {
                    Text(title).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 10).padding(.vertical, 6).contentShape(.rect)
                        .background(model.selected == index ? AnyShapeStyle(.tint.opacity(0.3)) : AnyShapeStyle(.clear), in: .rect(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .frame(width: 340)
    }
}

/// 키 입력을 뺏지 않는 패널. NSPopover는 뜨는 순간 초점을 가져가 검색창 편집이 끝나 버린다.
private final class SuggestionPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// 창이 앞에 없어도 첫 클릭부터 받는다.
private final class FirstClickHostingView<Content: View>: NSHostingView<Content> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

/// 도구 막대 검색창의 제안 목록. 유리 패널에 띄운다. 입력은 검색창이 계속 받는다.
final class SearchController: NSObject, NSSearchFieldDelegate {
    private let model = SuggestionModel()
    private lazy var hosting = FirstClickHostingView(rootView: SuggestionList(model: model))
    private lazy var panel = makePanel()
    private var sequence = 0
    private var pending: DispatchWorkItem?
    private weak var field: NSSearchField?

    var openTitle: (String) -> Void = { _ in }
    var runSearch: (String) -> Void = { _ in }
    var finished: () -> Void = {}

    func attach(to field: NSSearchField) {
        self.field = field
        field.delegate = self
        field.sendsSearchStringImmediately = true
        model.pick = { [weak self] title in self?.finish { $0.openTitle(title) } }
    }

    private func makePanel() -> SuggestionPanel {
        let panel = SuggestionPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = true
        if #available(macOS 26.0, *) {
            let glass = NSGlassEffectView()
            glass.cornerRadius = 16
            glass.contentView = hosting
            panel.contentView = glass
        } else {
            let effect = NSVisualEffectView()
            effect.material = .popover
            effect.blendingMode = .behindWindow
            effect.state = .active
            effect.wantsLayer = true
            effect.layer?.cornerRadius = 12
            effect.layer?.masksToBounds = true
            hosting.translatesAutoresizingMaskIntoConstraints = false
            effect.addSubview(hosting)
            NSLayoutConstraint.activate([
                hosting.leadingAnchor.constraint(equalTo: effect.leadingAnchor),
                hosting.trailingAnchor.constraint(equalTo: effect.trailingAnchor),
                hosting.topAnchor.constraint(equalTo: effect.topAnchor),
                hosting.bottomAnchor.constraint(equalTo: effect.bottomAnchor),
            ])
            panel.contentView = effect
        }
        return panel
    }

    private func place() {
        guard let field, let window = field.window else { return }
        hosting.layoutSubtreeIfNeeded()
        let size = hosting.fittingSize
        let anchor = window.convertToScreen(field.convert(field.bounds, to: nil))
        panel.setFrame(NSRect(x: anchor.maxX - size.width, y: anchor.minY - size.height - 8, width: size.width, height: size.height), display: true)
        if panel.parent == nil { window.addChildWindow(panel, ordered: .above) }
        panel.orderFront(nil)
    }

    private func hidePanel() {
        panel.parent?.removeChildWindow(panel)
        panel.orderOut(nil)
    }

    private func finish(_ action: (SearchController) -> Void) {
        action(self)
        field?.stringValue = ""
        close()
        finished()
    }

    func close() {
        sequence += 1
        pending?.cancel()
        model.items = []
        model.selected = nil
        hidePanel()
    }

    func controlTextDidChange(_ note: Notification) {
        guard let field else { return }
        // 한글을 조합 중일 때도 지금까지의 글자로 제안한다
        let text = (field.currentEditor()?.string ?? field.stringValue).trimmingCharacters(in: .whitespacesAndNewlines)
        pending?.cancel()
        sequence += 1
        let current = sequence
        guard !text.isEmpty else { close(); return }
        let work = DispatchWorkItem { [weak self] in
            let response = AppModel.shared.api.handle(method: "GET", endpoint: "suggest", query: ["q": text])
            let object = try? JSONSerialization.jsonObject(with: response.body) as? [String: Any]
            let items = object?["items"] as? [String] ?? []
            DispatchQueue.main.async { self?.show(items, sequence: current) }
        }
        pending = work
        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.08, execute: work)
    }

    private func show(_ items: [String], sequence current: Int) {
        // 늦게 도착한 응답이 닫힌 목록을 다시 열지 않게 한다
        guard current == sequence, let field, field.currentEditor() != nil else { return }
        model.items = items
        model.selected = nil
        if items.isEmpty { hidePanel() } else { place() }
    }

    func controlTextDidEndEditing(_ note: Notification) { close() }

    func control(_ control: NSControl, textView: NSTextView, doCommandBy selector: Selector) -> Bool {
        switch selector {
        case #selector(NSResponder.moveDown(_:)): move(1); return !model.items.isEmpty
        case #selector(NSResponder.moveUp(_:)): move(-1); return !model.items.isEmpty
        case #selector(NSResponder.cancelOperation(_:)):
            if panel.isVisible { close(); return true }
            field?.stringValue = ""
            finished()
            return true
        case #selector(NSResponder.insertNewline(_:)):
            let text = textView.string.trimmingCharacters(in: .whitespacesAndNewlines)
            if let index = model.selected, model.items.indices.contains(index) {
                let title = model.items[index]
                finish { $0.openTitle(title) }
            } else if !text.isEmpty {
                finish { $0.runSearch(text) }
            }
            return true
        default: return false
        }
    }

    private func move(_ step: Int) {
        guard !model.items.isEmpty else { return }
        let count = model.items.count
        if let selected = model.selected {
            let next = selected + step
            model.selected = next < 0 || next >= count ? nil : next
        } else {
            model.selected = step > 0 ? 0 : count - 1
        }
    }
}
