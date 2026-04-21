import SwiftUI

struct CardListScreen: View {
    let cardSet: StudyCardSet
    let service: StudyBrowsingService

    private var cards: [StudyCard] {
        service.listCards(cardSetId: cardSet.id)
    }

    var body: some View {
        Group {
            if cards.isEmpty {
                EmptyPlaceholderView(
                    title: "Card がありません",
                    message: "この CardSet には Card が存在しません。"
                )
            } else {
                List(cards) { card in
                    NavigationLink {
                        CardDetailScreen(card: card)
                    } label: {
                        EntityRow(
                            title: card.displayTitle,
                            subtitle: card.questionNumber,
                            trailingText: card.isDraft ? "Draft" : nil
                        )
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle(cardSet.name)
    }
}
