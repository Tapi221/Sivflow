import SwiftUI

struct StudyRootScreen: View {
    let service: StudyBrowsingService
    let source: BootstrapSource
    let bootstrapError: String?

    var body: some View {
        NavigationStack {
            FolderListScreen(service: service)
                .navigationTitle("Folders")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Text(source.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    if let bootstrapError, !bootstrapError.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Bundle import に失敗したため mock データを表示しています。")
                                .font(.caption.weight(.semibold))
                            Text(bootstrapError)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.leading)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, AppSpacing.lg)
                        .padding(.vertical, AppSpacing.md)
                        .background(.thinMaterial)
                    }
                }
        }
    }
}
