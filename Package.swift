// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NamuDump",
    platforms: [.macOS("26.0")],
    products: [
        .library(name: "NamuDumpCore", targets: ["NamuDumpCore"]),
        .executable(name: "NamuDump", targets: ["NamuDump"]),
    ],
    targets: [
        .target(name: "NamuDumpCore", linkerSettings: [.linkedLibrary("sqlite3")]),
        .executableTarget(name: "NamuDump", dependencies: ["NamuDumpCore"]),
        .testTarget(name: "NamuDumpCoreTests", dependencies: ["NamuDumpCore"], path: "tests/NamuDumpCoreTests"),
    ],
    swiftLanguageModes: [.v5]
)
