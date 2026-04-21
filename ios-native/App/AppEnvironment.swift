import Foundation

enum BootstrapSource: String {
    case bundleSample = "Bundle Sample"
    case mockFallback = "Mock Fallback"
}

struct AppEnvironment {
    let studyBrowsingService: StudyBrowsingService
    let bootstrapSource: BootstrapSource
    let bootstrapError: String?

    static let sampleSnapshotFileName = "sample-snapshot"

    static let bootstrap: () -> AppEnvironment = {
        do {
            let dto = try SnapshotBundleLoader().load(named: sampleSnapshotFileName)
            let snapshot = StudySnapshotMapper.map(dto)
            let service = InMemoryStudyBrowsingService(snapshot: snapshot)
            return AppEnvironment(
                studyBrowsingService: service,
                bootstrapSource: .bundleSample,
                bootstrapError: nil
            )
        } catch {
            return AppEnvironment(
                studyBrowsingService: MockStudyBrowsingService(),
                bootstrapSource: .mockFallback,
                bootstrapError: error.localizedDescription
            )
        }
    }
}
