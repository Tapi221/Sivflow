import SwiftUI

struct CardSetListScreen: View {
    let folder: StudyFolder
    let service: StudyBrowsingService

    private var cardSets: [StudyCardSet] {
        service.listCardSets(folderId: folder.id)
    }

    var body: some View {
        Group {
            if cardSets.isEmpty {
                EmptyPlaceholderView(
                    title: "CardSet がありません",
                    message: "この Folder 配下には CardSet が存在しません。"
                )
            } else {
                List(cardSets) { cardSet in
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
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle(folder.folderName)
    }
}
