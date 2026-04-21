import SwiftUI

@main
struct FlashCardMasterNativeApp: App {
    @StateObject private var runtimeStore = StudyRuntimeStore.bootstrap()

    var body: some Scene {
        WindowGroup {
            StudyRootScreen(runtimeStore: runtimeStore)
        }
    }
}
