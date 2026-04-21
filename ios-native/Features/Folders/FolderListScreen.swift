import SwiftUI

struct FolderListScreen: View {
    let service: StudyBrowsingService

    private var folders: [StudyFolder] {
        service.listFolders()
    }

    var body: some View {
        Group {
            if folders.isEmpty {
                EmptyPlaceholderView(
                    title: "Folder がありません",
                    message: "snapshot または mock データに Folder が存在しません。"
                )
            } else {
                List(folders) { folder in
                    NavigationLink {
                        CardSetListScreen(folder: folder, service: service)
                    } label: {
                        EntityRow(
                            title: folder.folderName,
                            subtitle: folder.folderColor,
                            trailingText: folder.cloudSyncEnabled ? "Cloud" : nil
                        )
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }
}
