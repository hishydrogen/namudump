import Combine
import NamuDumpCore
import SwiftUI

struct TOCEntry: Identifiable, Hashable {
    let id: String
    let number: String
    let text: String
    let level: Int
}

struct Visit: Identifiable, Hashable {
    let id: String
    let date: Date
}

/// 사이드바의 내용. 창마다 하나씩 있다.
final class SidebarModel: ObservableObject {
    enum Tab: String, CaseIterable, Identifiable {
        case toc = "목차", history = "최근", bookmarks = "즐겨찾기"
        var id: String { rawValue }
    }

    @Published var tab = Tab.toc
    @Published var toc: [TOCEntry] = []
    @Published var activeAnchor: String?
    @Published var visits: [Visit] = []
    @Published var bookmarks: [String] = []
    @Published var recordsHistory = true

    var openDocument: (String) -> Void = { _ in }
    var openAnchor: (String) -> Void = { _ in }
    var bookmarkRemoved: (String) -> Void = { _ in }
    var historyCleared: () -> Void = {}

    func reload() {
        let store = AppModel.shared.api.store
        let visits = ((try? store.history()) ?? []).compactMap { row -> Visit? in
            guard let title = row["title"] as? String, let time = row["visited_at"] as? Double else { return nil }
            return Visit(id: title, date: Date(timeIntervalSince1970: time))
        }
        let bookmarks = ((try? store.bookmarks()) ?? []).compactMap { $0["title"] as? String }
        self.visits = visits
        self.bookmarks = bookmarks
        recordsHistory = store.settings["record_history"] as? Bool != false
    }

    func removeBookmark(_ title: String) {
        try? AppModel.shared.api.store.setBookmark(title, on: false)
        reload()
        bookmarkRemoved(title)
    }

    func clearHistory() {
        try? AppModel.shared.api.store.clearHistory()
        reload()
        historyCleared()
    }
}

struct SidebarView: View {
    @ObservedObject var model: SidebarModel

    var body: some View {
        VStack(spacing: 0) {
            Picker("보기", selection: $model.tab) {
                ForEach(SidebarModel.Tab.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
            switch model.tab {
            case .toc: TOCList(model: model)
            case .history: HistoryList(model: model)
            case .bookmarks: BookmarkList(model: model)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

private struct TOCList: View {
    @ObservedObject var model: SidebarModel

    var body: some View {
        if model.toc.isEmpty {
            ContentUnavailableView("목차 없음", systemImage: "list.bullet", description: Text("문서를 열면 여기에 목차가 나옵니다."))
        } else {
            ScrollViewReader { proxy in
                List(selection: Binding(get: { model.activeAnchor }, set: { id in if let id { model.openAnchor(id) } })) {
                    ForEach(model.toc) { entry in
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(entry.number).foregroundStyle(.secondary).monospacedDigit()
                            Text(entry.text).lineLimit(2)
                        }
                        .padding(.leading, CGFloat(max(0, entry.level - minimumLevel)) * 12)
                        .tag(entry.id)
                        .id(entry.id)
                    }
                }
                .listStyle(.sidebar)
                .onChange(of: model.activeAnchor) { _, id in
                    guard let id else { return }
                    withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(id) }
                }
            }
        }
    }

    private var minimumLevel: Int { model.toc.map(\.level).min() ?? 0 }
}

private struct HistoryList: View {
    @ObservedObject var model: SidebarModel
    @State private var confirming = false

    private var days: [(label: String, visits: [Visit])] {
        let calendar = Calendar.current
        var out: [(label: String, visits: [Visit])] = []
        for visit in model.visits {
            let label: String
            if calendar.isDateInToday(visit.date) {
                label = "오늘"
            } else if calendar.isDateInYesterday(visit.date) {
                label = "어제"
            } else {
                label = visit.date.formatted(.dateTime.year().month().day())
            }
            if out.last?.label == label {
                out[out.count - 1].visits.append(visit)
            } else {
                out.append((label, [visit]))
            }
        }
        return out
    }

    var body: some View {
        if model.visits.isEmpty {
            ContentUnavailableView(model.recordsHistory ? "기록 없음" : "기록 꺼짐", systemImage: "clock",
                                   description: Text(model.recordsHistory ? "읽은 문서가 여기에 쌓입니다." : "설정에서 방문 기록 남기기를 켤 수 있습니다."))
        } else {
            List(selection: Binding<String?>(get: { nil }, set: { id in if let id { model.openDocument(id) } })) {
                ForEach(days, id: \.label) { day in
                    Section(day.label) {
                        ForEach(day.visits) { visit in
                            HStack {
                                Text(visit.id).lineLimit(1)
                                Spacer()
                                Text(visit.date, format: .dateTime.hour().minute()).font(.caption).foregroundStyle(.secondary)
                            }
                            .tag(visit.id)
                        }
                    }
                }
            }
            .listStyle(.sidebar)
            .safeAreaInset(edge: .bottom) {
                if #available(macOS 26.0, *) {
                    Button("기록 지우기", systemImage: "trash") { confirming = true }
                        .buttonStyle(.glass)
                        .padding(.bottom, 10)
                } else {
                    Button("기록 지우기", systemImage: "trash") { confirming = true }
                        .buttonStyle(.bordered)
                        .padding(.bottom, 10)
                }
            }
            .confirmationDialog("방문 기록을 모두 지울까요?", isPresented: $confirming) {
                Button("모두 지우기", role: .destructive) { model.clearHistory() }
            } message: {
                Text("되돌릴 수 없습니다.")
            }
        }
    }
}

private struct BookmarkList: View {
    @ObservedObject var model: SidebarModel

    var body: some View {
        if model.bookmarks.isEmpty {
            ContentUnavailableView("즐겨찾기 없음", systemImage: "star", description: Text("문서를 열고 별 단추를 누르세요."))
        } else {
            List(selection: Binding<String?>(get: { nil }, set: { id in if let id { model.openDocument(id) } })) {
                ForEach(model.bookmarks, id: \.self) { title in
                    Text(title).lineLimit(1).tag(title)
                        .contextMenu {
                            Button("즐겨찾기에서 빼기", systemImage: "star.slash") { model.removeBookmark(title) }
                        }
                }
            }
            .listStyle(.sidebar)
        }
    }
}
