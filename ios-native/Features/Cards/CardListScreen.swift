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
                        CardDetailScreen(card: card, service: service)
                    } label: {
                        VStack(alignment: .leading, spacing: AppSpacing.xs) {
                            EntityRow(
                                title: card.displayTitle,
                                subtitle: card.questionNumber,
                                trailingText: card.badges.first
                            )

                            if card.badges.count > 1 {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: AppSpacing.xs) {
                                        ForEach(card.badges.dropFirst(), id: \.self) { badge in
                                            Text(badge)
                                                .font(.caption2.weight(.semibold))
                                                .padding(.horizontal, AppSpacing.sm)
                                                .padding(.vertical, 6)
                                                .background(Color(.secondarySystemBackground))
                                                .clipShape(Capsule())
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle(cardSet.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
