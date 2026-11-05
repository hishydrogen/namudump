import CryptoKit
import Foundation
import XCTest
@testable import NamuDumpCore

/// 실제 덤프로 기준 응답과 비교한다. NAMUDUMP_TEST_DUMP와 NAMUDUMP_TEST_GOLDEN을 줄 때만 돈다.
final class ParityTests: XCTestCase {
    func testMatchesGolden() throws {
        let env = ProcessInfo.processInfo.environment
        guard let dump = env["NAMUDUMP_TEST_DUMP"], let golden = env["NAMUDUMP_TEST_GOLDEN"] else {
            throw XCTSkip("실제 덤프가 없어 건너뜁니다")
        }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let api = API(store: try UserStore(root: root))
        XCTAssertTrue(api.open(dumpAt: dump), api.dumpError)
        try api.dump?.loadTitles()
        let cases = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: golden))) as! [[String: Any]]
        var mismatches = 0
        for item in cases {
            let endpoint = item["ep"] as! String, query = item["q"] as! [String: String]
            var got = try JSONSerialization.jsonObject(with: api.handle(method: "GET", endpoint: endpoint, query: query).body) as! [String: Any]
            if let html = got["html"] as? String {
                got["html"] = SHA256.hash(data: Data(html.utf8)).map { String(format: "%02x", $0) }.joined()
            }
            if !NSDictionary(dictionary: got).isEqual(to: item["r"] as! [String: Any]) {
                mismatches += 1
                if mismatches <= 8 {
                    let want = item["r"] as! [String: Any]
                    let keys = got.keys.filter { !NSDictionary(dictionary: [$0: got[$0]!]).isEqual(to: [$0: want[$0] ?? NSNull()]) }
                    print("불일치", endpoint, query, keys, keys.map { (String(describing: got[$0]).prefix(160), String(describing: want[$0]).prefix(160)) })
                }
            }
        }
        print("기준 \(cases.count)건 중 불일치 \(mismatches)건")
        XCTAssertEqual(mismatches, 0)
    }
}
