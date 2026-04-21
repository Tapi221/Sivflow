import SwiftUI

struct AppTabNavigationView: View {
    @ObservedObject var runtimeStore: StudyRuntimeStore
    @State private var selectedTab: AppTab = .library
    
    enum AppTab {
        case library
        case search
        case tags
        case settings
        
        var title: String {
            switch self {
            case .library:
                return "Library"
            case .search:
                return "Search"
            case .tags:
                return "Tags"
            case .settings:
                return "Settings"
            }
        }
        
        var icon: String {
            switch self {
            case .library:
                return "books.vertical"
            case .search:
                return "magnifyingglass"
            case .tags:
                return "tag"
            case .settings:
                return "gearshape"
            }
        }
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Library Tab
            NavigationStack {
                FolderListScreen(
                    title: "Library",
                    folder: nil,
                    service: runtimeStore.session.service
                )
                .navigationTitle("Library")
            }
            .tabItem {
                Label(AppTab.library.title, systemImage: AppTab.library.icon)
            }
            .tag(AppTab.library)
            
            // Search Tab
            SearchScreen(service: runtimeStore.session.service)
                .tabItem {
                    Label(AppTab.search.title, systemImage: AppTab.search.icon)
                }
                .tag(AppTab.search)
            
            // Tags Tab
            TagBrowserScreen(service: runtimeStore.session.service)
                .tabItem {
                    Label(AppTab.tags.title, systemImage: AppTab.tags.icon)
                }
                .tag(AppTab.tags)
            
            // Settings Tab
            SettingsScreen()
                .tabItem {
                    Label(AppTab.settings.title, systemImage: AppTab.settings.icon)
                }
                .tag(AppTab.settings)
        }
        .accentColor(.blue)
    }
}

#Preview {
    let mockService = MockStudyBrowsingService()
    let mockSession = RuntimeSession(
        service: mockService,
        source: .mockFallback,
        bootstrapError: nil,
        sourceDescription: "Mock data"
    )
    let mockStore = StudyRuntimeStore(session: mockSession)
    
    AppTabNavigationView(runtimeStore: mockStore)
}
