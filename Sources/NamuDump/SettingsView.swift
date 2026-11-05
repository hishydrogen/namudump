import AppKit
import NamuDumpCore
import SwiftUI

final class SettingsModel: ObservableObject {
    @Published var theme = "system"
    @Published var fontSize = 15.0
    @Published var width = "normal"
    @Published var recordHistory = true
    @Published var linkCheck = true
    @Published var dumpPath = ""
    @Published var dumpInfo = ""
    private var observer: NSObjectProtocol?

    init() {
        load()
        observer = NotificationCenter.default.addObserver(forName: .settingsChanged, object: nil, queue: .main) { [weak self] _ in self?.load() }
    }

    func load() {
        let model = AppModel.shared
        let s = model.settings
        theme = s["theme"] as? String ?? "system"
        fontSize = (s["font_size"] as? NSNumber)?.doubleValue ?? 15
        width = s["width"] as? String ?? "normal"
        recordHistory = s["record_history"] as? Bool != false
        linkCheck = s["link_check"] as? Bool != false
        dumpPath = model.api.dump?.path ?? (s["db_path"] as? String ?? "")
        if let dump = model.api.dump {
            let date = dump.meta["generated_at_iso"].map { ", 생성 " + $0.replacingOccurrences(of: "T", with: " ") } ?? ""
            dumpInfo = dump.count.formatted() + "개 문서" + date
        } else {
            dumpInfo = "열린 덤프가 없습니다"
        }
    }
}

struct SettingsView: View {
    @StateObject private var model = SettingsModel()

    private func save(_ key: String, _ value: Any) { AppModel.shared.update(settings: [key: value]) }

    var body: some View {
        Form {
            Section("화면") {
                Picker("화면 모드", selection: $model.theme) {
                    Text("시스템").tag("system")
                    Text("라이트").tag("light")
                    Text("다크").tag("dark")
                }
                .onChange(of: model.theme) { _, value in save("theme", value) }
                LabeledContent("글자 크기") {
                    HStack {
                        Slider(value: $model.fontSize, in: 13...22, step: 1) { editing in
                            if !editing { save("font_size", Int(model.fontSize)) }
                        }
                        .frame(width: 170)
                        Text("\(Int(model.fontSize))px").monospacedDigit().foregroundStyle(.secondary).frame(width: 40, alignment: .trailing)
                    }
                }
                Picker("본문 너비", selection: $model.width) {
                    Text("좁게").tag("narrow")
                    Text("보통").tag("normal")
                    Text("넓게").tag("wide")
                }
                .pickerStyle(.segmented)
                .onChange(of: model.width) { _, value in save("width", value) }
            }
            Section("문서") {
                Toggle(isOn: $model.recordHistory) {
                    Text("방문 기록 남기기")
                    Text("끄면 읽은 문서를 기록하지 않습니다. 이미 남은 기록은 사이드바에서 지울 수 있습니다.")
                }
                .onChange(of: model.recordHistory) { _, value in save("record_history", value) }
                Toggle(isOn: $model.linkCheck) {
                    Text("없는 문서 링크 표시")
                    Text("덤프에 없는 문서로 가는 링크를 빨갛게 표시합니다.")
                }
                .onChange(of: model.linkCheck) { _, value in save("link_check", value) }
            }
            Section("덤프 파일") {
                LabeledContent {
                    Button("다른 파일…") { AppModel.shared.chooseDump() }
                } label: {
                    Text(model.dumpPath.isEmpty ? "없음" : model.dumpPath).textSelection(.enabled).lineLimit(3)
                    Text(model.dumpInfo)
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 520)
        .fixedSize(horizontal: false, vertical: true)
    }
}
