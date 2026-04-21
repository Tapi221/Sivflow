import SwiftUI

@main
struct FlashCardMasterNativeApp: App {
    private let environment = AppEnvironment.bootstrap()

    var body: some Scene {
        WindowGroup {
            StudyRootScreen(
                service: environment.studyBrowsingService,
                source: environment.bootstrapSource,
                bootstrapError: environment.bootstrapError
            )
        }
    }
}
