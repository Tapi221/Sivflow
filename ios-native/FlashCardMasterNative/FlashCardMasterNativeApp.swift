#if canImport(SwiftUI)
import SwiftUI

@main
struct FlashCardMasterNativeApp: App {
    @StateObject private var store = StudyStore()
    @AppStorage("flashcardmaster.theme.override") private var themeOverrideRawValue = AppTheme.system.rawValue

    private var effectiveTheme: AppTheme {
        get { AppTheme(rawValue: themeOverrideRawValue) ?? store.theme() }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(colorScheme(for: effectiveTheme))
                .onAppear {
                    if themeOverrideRawValue == AppTheme.system.rawValue {
                        themeOverrideRawValue = store.theme().rawValue
                    }
                }
        }
    }

    private func colorScheme(for theme: AppTheme) -> ColorScheme? {
        switch theme {
        case .system:
            return nil
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }
}
#endif