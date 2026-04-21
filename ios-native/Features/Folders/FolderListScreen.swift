import SwiftUI

struct FolderListScreen: View {
    let title: String
    let folder: StudyFolder?
    let service: StudyBrowsingService

    private var childFolders: [StudyFolder] {
        service.listFolders(parentFolderId: folder?.id)
    }

    private var cardSets: [StudyCardSet] {
        service.listCardSets(folderId: folder?.id)
    }

    var body: some View {
        Group {
            if childFolders.isEmpty && cardSets.isEmpty {
                EmptyPlaceholderView(
                    title: emptyTitle,
                    message: emptyMessage
                )
            } else {
                List {
                    if let folder {
                        Section {
                            FolderSummaryCard(folder: folder)
                                .listRowInsets(EdgeInsets())
                                .listRowBackground(Color.clear)
                        }
                    }

                    if !childFolders.isEmpty {
                        Section("Folders") {
                            ForEach(childFolders) { childFolder in
                                NavigationLink {
                                    FolderListScreen(
                                        title: childFolder.folderName,
                                        folder: childFolder,
                                        service: service
                                    )
                                } label: {
                                    EntityRow(
                                        title: childFolder.folderName,
                                        subtitle: childFolder.folderColor,
                                        trailingText: childFolder.cloudSyncEnabled ? "Cloud" : nil
                                    )
                                }
                            }
                        }
                    }

                    if !cardSets.isEmpty {
                        Section("Card Sets") {
                            ForEach(cardSets) { cardSet in
                                NavigationLink {
                                    CardListScreen(cardSet: cardSet, service: service)
                                } label: {
                                    EntityRow(
                                        title: cardSet.name,
                                        subtitle: cardSet.descriptionText,
                                        trailingText: cardSet.defaultDisplayMode.uppercased()
                                    )
                                }
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle(title)
    }

    private var emptyTitle: String {
        if let folder {
            return "\(folder.folderName) は空です"
        }
        return "表示できる Folder がありません"
    }

    private var emptyMessage: String {
        if folder != nil {
            return "この Folder 配下に child folder / card set が存在しません。"
        }
        return "snapshot に top-level folder も root card set も存在しません。"
    }
}

private struct FolderSummaryCard: View {
    let folder: StudyFolder

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(folder.folderName)
                .font(.headline)
            if let color = folder.folderColor, !color.isEmpty {
                Label(color, systemImage: "paintpalette")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if folder.cloudSyncEnabled {
                Label("Cloud sync enabled", systemImage: "icloud")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
        .padding(.vertical, AppSpacing.xs)
    }
}
