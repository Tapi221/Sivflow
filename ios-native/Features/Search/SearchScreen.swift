import SwiftUI

struct SearchScreen: View {
    let service: StudyBrowsingService
    
    @State private var searchQuery: String = ""
    @State private var selectedStatusFilter: CardSearchFilter.StatusFilterOption = .all
    @State private var selectedTags: Set<String> = []
    @State private var searchResults: [StudyCard] = []
    @State private var isSearching = false
    
    private var filter: CardSearchFilter {
        CardSearchFilter(
            query: searchQuery,
            selectedTagIds: selectedTags,
            statusFilter: selectedStatusFilter
        )
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.md) {
                // Search input
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    
                    TextField("Search cards...", text: $searchQuery)
                        .textFieldStyle(.roundedBorder)
                        .onChange(of: searchQuery) { _, newValue in
                            performSearch(query: newValue)
                        }
                    
                    if !searchQuery.isEmpty {
                        Button(action: { searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(AppSpacing.md)
                
                // Filters
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Filter by Status")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    
                    HStack(spacing: AppSpacing.sm) {
                        ForEach([
                            CardSearchFilter.StatusFilterOption.all,
                            .draft,
                            .complete,
                            .uncertain
                        ], id: \.self) { option in
                            Button(action: { selectedStatusFilter = option }) {
                                Text(statusFilterLabel(option))
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, AppSpacing.sm)
                                    .padding(.vertical, 6)
                                    .background(
                                        selectedStatusFilter == option
                                            ? Color(.systemBlue)
                                            : Color(.secondarySystemBackground)
                                    )
                                    .foregroundStyle(
                                        selectedStatusFilter == option ? .white : .primary
                                    )
                                    .clipShape(Capsule())
                            }
                        }
                        Spacer()
                    }
                }
                .padding(.horizontal, AppSpacing.md)
                
                // Results
                if searchQuery.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        
                        Text("Start Searching")
                            .font(.headline)
                        
                        Text("Enter a keyword to find cards")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                } else if isSearching {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if searchResults.isEmpty {
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        
                        Text("No Results")
                            .font(.headline)
                        
                        Text("Try different keywords or filters")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                } else {
                    List(searchResults) { card in
                        NavigationLink(destination: CardDetailScreenEnhanced(card: card, service: service)) {
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text(card.displayTitle)
                                    .font(.body.weight(.semibold))
                                    .lineLimit(2)
                                
                                Text("Q\(card.questionNumber)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                
                                if !card.badges.isEmpty {
                                    HStack(spacing: AppSpacing.xs) {
                                        ForEach(card.badges, id: \.self) { badge in
                                            Text(badge)
                                                .font(.caption2.weight(.semibold))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color(.systemBlue).opacity(0.2))
                                                .clipShape(Capsule())
                                        }
                                    }
                                }
                            }
                            .padding(.vertical, AppSpacing.sm)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func performSearch(query: String) {
        isSearching = true
        
        DispatchQueue.global(qos: .userInitiated).async {
            let allCards = getAllCards()
            let filtered = allCards.filter { filter.matches(card: $0) }
            
            DispatchQueue.main.async {
                self.searchResults = filtered
                self.isSearching = false
            }
        }
    }
    
    private func getAllCards() -> [StudyCard] {
        var allCards: [StudyCard] = []
        
        let folders = service.listFolders(parentFolderId: nil)
        for folder in folders {
            let cardSets = service.listCardSets(folderId: folder.id)
            for cardSet in cardSets {
                let cards = service.listCards(cardSetId: cardSet.id)
                allCards.append(contentsOf: cards)
            }
        }
        
        // Also check root-level card sets
        let rootCardSets = service.listCardSets(folderId: nil)
        for cardSet in rootCardSets {
            let cards = service.listCards(cardSetId: cardSet.id)
            allCards.append(contentsOf: cards)
        }
        
        return allCards
    }
    
    private func statusFilterLabel(_ option: CardSearchFilter.StatusFilterOption) -> String {
        switch option {
        case .all:
            return "All"
        case .draft:
            return "Draft"
        case .complete:
            return "Complete"
        case .uncertain:
            return "Uncertain"
        }
    }
}

#Preview {
    SearchScreen(service: MockStudyBrowsingService())
}
