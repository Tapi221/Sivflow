#if canImport(SwiftUI)
import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    var body: some View {
        TabView {
            LibraryRootView(parentFolderID: nil, navigationTitle: "Library")
                .tabItem {
                    Label("Library", systemImage: "books.vertical")
                }

            StudyModeRootView()
                .tabItem {
                    Label("Study", systemImage: "brain")
                }

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }

            TagsView()
                .tabItem {
                    Label("Tags", systemImage: "tag")
                }

            MoreHubView()
                .tabItem {
                    Label("More", systemImage: "square.grid.2x2")
                }
        }
    }
}

struct LibraryRootView: View {
    @EnvironmentObject private var store: StudyStore

    let parentFolderID: UUID?
    let navigationTitle: String

    @State private var folderEditorMode: FolderEditorMode?
    @State private var cardSetEditorMode: CardSetEditorMode?
    @State private var showDeleteConfirmation = false

    private var currentFolder: StudyFolder? {
        guard let parentFolderID else { return nil }
        return store.folder(id: parentFolderID)
    }

    private var childFolders: [StudyFolder] {
        store.folders(in: parentFolderID)
    }

    private var childCardSets: [StudyCardSet] {
        store.cardSets(in: parentFolderID)
    }

    var body: some View {
        NavigationStack {
            List {
                if currentFolder == nil {
                    Section {
                        DashboardHeroCard(
                            title: "FlashCardMaster",
                            subtitle: "Folders, study mode, questions, trash, directory, and local export in one iOS build. Miraculously civilized."
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                        .listRowBackground(Color.clear)
                    }
                }

                if !childFolders.isEmpty {
                    Section("Folders") {
                        ForEach(childFolders) { folder in
                            NavigationLink {
                                LibraryRootView(parentFolderID: folder.id, navigationTitle: folder.name)
                            } label: {
                                FolderRow(
                                    folder: folder,
                                    childFolderCount: store.childFolderCount(for: folder.id),
                                    cardSetCount: store.cardSetCount(in: folder.id)
                                )
                            }
                        }
                        .onDelete(perform: deleteFolders)
                    }
                }

                if !childCardSets.isEmpty {
                    Section("Card Sets") {
                        ForEach(childCardSets) { cardSet in
                            NavigationLink {
                                CardSetDetailView(cardSetID: cardSet.id)
                            } label: {
                                CardSetRow(cardSet: cardSet, cardCount: store.cardCount(in: cardSet.id), deletedCount: store.deletedCardCount(in: cardSet.id))
                            }
                        }
                        .onDelete(perform: deleteCardSets)
                    }
                }

                if childFolders.isEmpty && childCardSets.isEmpty {
                    ContentUnavailableView(
                        "Nothing here yet",
                        systemImage: "tray",
                        description: Text("Create a folder or card set. Humanity invented hierarchy and now you have to use it.")
                    )
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle(navigationTitle)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if currentFolder != nil {
                        Menu {
                            Button("Edit Folder") {
                                folderEditorMode = .edit(currentFolder!)
                            }
                            Button("Delete Folder", role: .destructive) {
                                showDeleteConfirmation = true
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }

                    Menu {
                        Button("New Folder") {
                            folderEditorMode = .create(parentFolderID)
                        }

                        Button("New Card Set") {
                            cardSetEditorMode = .create(parentFolderID)
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $folderEditorMode) { mode in
                FolderEditorSheet(mode: mode)
                    .environmentObject(store)
            }
            .sheet(item: $cardSetEditorMode) { mode in
                CardSetEditorSheet(mode: mode)
                    .environmentObject(store)
            }
            .alert("Delete Folder", isPresented: $showDeleteConfirmation) {
                Button("Delete", role: .destructive) {
                    guard let currentFolder else { return }
                    store.deleteFolder(id: currentFolder.id)
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes the folder tree and moves matching cards to trash.")
            }
        }
    }

    private func deleteFolders(at offsets: IndexSet) {
        for index in offsets {
            store.deleteFolder(id: childFolders[index].id)
        }
    }

    private func deleteCardSets(at offsets: IndexSet) {
        for index in offsets {
            store.deleteCardSet(id: childCardSets[index].id)
        }
    }
}

struct CardSetDetailView: View {
    @EnvironmentObject private var store: StudyStore

    let cardSetID: UUID

    @State private var searchText = ""
    @State private var editorMode: CardEditorMode?
    @State private var cardSetEditorMode: CardSetEditorMode?
    @State private var cardIDToDelete: UUID?
    @State private var showDeleteCardSetConfirmation = false

    private var cardSet: StudyCardSet? {
        store.cardSet(id: cardSetID)
    }

    private var cards: [StudyCard] {
        let allCards = store.cards(in: cardSetID)
        let normalized = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return allCards }
        return allCards.filter { $0.searchText.contains(normalized) }
    }

    var body: some View {
        Group {
            if let cardSet {
                List {
                    Section {
                        HStack {
                            Label("\(store.cardCount(in: cardSet.id)) active", systemImage: "rectangle.stack")
                            Spacer()
                            Label("\(store.deletedCardCount(in: cardSet.id)) trashed", systemImage: "trash")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    if cards.isEmpty {
                        ContentUnavailableView(
                            searchText.isEmpty ? "No cards yet" : "No matching cards",
                            systemImage: "rectangle.stack",
                            description: Text(searchText.isEmpty ? "Create the first card in this set." : "Try a different keyword.")
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(cards) { card in
                            NavigationLink {
                                CardDetailView(cardID: card.id)
                            } label: {
                                CardRow(
                                    card: card,
                                    tags: card.tagIDs.compactMap(store.tag(id:)),
                                    cardSet: store.cardSet(id: card.cardSetID)
                                )
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button("Edit") {
                                    editorMode = .edit(card)
                                }
                                .tint(.blue)

                                Button("Trash", role: .destructive) {
                                    cardIDToDelete = card.id
                                }
                            }
                        }
                    }
                }
                .searchable(text: $searchText, prompt: "Search in this set")
                .navigationTitle(cardSet.name)
                .toolbar {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Menu {
                            Button("Edit Card Set") {
                                cardSetEditorMode = .edit(cardSet)
                            }

                            Button("Delete Card Set", role: .destructive) {
                                showDeleteCardSetConfirmation = true
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }

                        Button {
                            editorMode = .create(cardSet.id)
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(item: $editorMode) { mode in
                    CardEditorSheet(mode: mode)
                        .environmentObject(store)
                }
                .sheet(item: $cardSetEditorMode) { mode in
                    CardSetEditorSheet(mode: mode)
                        .environmentObject(store)
                }
                .alert("Move Card to Trash", isPresented: Binding(
                    get: { cardIDToDelete != nil },
                    set: { if !$0 { cardIDToDelete = nil } }
                )) {
                    Button("Move to Trash", role: .destructive) {
                        guard let cardIDToDelete else { return }
                        store.softDeleteCard(id: cardIDToDelete)
                        self.cardIDToDelete = nil
                    }
                    Button("Cancel", role: .cancel) {
                        cardIDToDelete = nil
                    }
                } message: {
                    Text("The card goes to Trash and can be restored later.")
                }
                .alert("Delete Card Set", isPresented: $showDeleteCardSetConfirmation) {
                    Button("Delete", role: .destructive) {
                        store.deleteCardSet(id: cardSet.id)
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("All cards in this set will move to Trash.")
                }
            } else {
                ContentUnavailableView("Missing card set", systemImage: "exclamationmark.triangle")
            }
        }
    }
}

struct CardDetailView: View {
    @EnvironmentObject private var store: StudyStore
    @Environment(\.openURL) private var openURL

    let cardID: UUID

    @State private var showingBack = false
    @State private var editorMode: CardEditorMode?
    @State private var showDeleteConfirmation = false

    private var card: StudyCard? {
        store.card(id: cardID)
    }

    var body: some View {
        Group {
            if let card, let cardSet = store.cardSet(id: card.cardSetID) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(card.title)
                                .font(.title2.weight(.semibold))

                            HStack(spacing: 8) {
                                ForEach(Array(card.flags).sorted(by: { $0.rawValue < $1.rawValue }), id: \.self) { flag in
                                    BadgeView(text: flag.displayName, colorName: .slate)
                                }
                            }

                            if !card.tagIDs.isEmpty {
                                FlowLayout(spacing: 8) {
                                    ForEach(card.tagIDs.compactMap(store.tag(id:)), id: \.id) { tag in
                                        BadgeView(text: tag.name, colorName: tag.colorName)
                                    }
                                }
                            }
                        }

                        if let imageURL = card.imageURL, let url = URL(string: imageURL) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 220)
                                        .clipped()
                                        .clipShape(RoundedRectangle(cornerRadius: 20))
                                case .failure:
                                    EmptyStateCard(title: "Image failed to load", subtitle: imageURL)
                                default:
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 220)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            Picker("Side", selection: $showingBack) {
                                Text("Front").tag(false)
                                Text("Back").tag(true)
                            }
                            .pickerStyle(.segmented)

                            VStack(alignment: .leading, spacing: 12) {
                                Text(showingBack ? "Back" : "Front")
                                    .font(.headline)
                                Text(showingBack ? card.backText : card.frontText)
                                    .textSelection(.enabled)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(16)
                                    .background(Color.secondarySystemGroupedBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                        }

                        if !card.noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Notes")
                                    .font(.headline)
                                Text(card.noteText)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(16)
                                    .background(Color.secondarySystemGroupedBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Study Actions")
                                .font(.headline)
                            HStack(spacing: 8) {
                                ForEach(StudyReviewGrade.allCases) { grade in
                                    Button(grade.displayName) {
                                        store.markReviewed(cardID: card.id, grade: grade)
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(tintColor(for: grade))
                                }
                            }
                        }

                        if let pdfURL = card.pdfURL, PDFSourceResolver.canPreview(pdfURL) {
                            NavigationLink {
                                PDFPreviewScreen(sourceValue: pdfURL, title: card.title)
                            } label: {
                                Label("Open attached PDF", systemImage: "doc.richtext")
                            }
                        }

                        if let sourceURL = card.sourceURL, let url = URL(string: sourceURL) {
                            Button {
                                openURL(url)
                            } label: {
                                Label("Open source link", systemImage: "link")
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            InfoLine(label: "Card Set", value: cardSet.name)
                            InfoLine(label: "Updated", value: card.updatedAt.formatted(date: .abbreviated, time: .shortened))
                            InfoLine(label: "Created", value: card.createdAt.formatted(date: .abbreviated, time: .shortened))
                            InfoLine(label: "Study Count", value: String(card.studyCount))
                            InfoLine(label: "Next Review", value: card.nextReviewAt?.formatted(date: .abbreviated, time: .shortened) ?? "Not scheduled")
                            InfoLine(label: "Attached PDF", value: PDFSourceResolver.displayName(card.pdfURL))
                        }
                        .font(.subheadline)
                    }
                    .padding()
                }
                .navigationTitle("Card")
                .toolbar {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button("Edit") {
                            editorMode = .edit(card)
                        }

                        Button(role: .destructive) {
                            showDeleteConfirmation = true
                        } label: {
                            Image(systemName: "trash")
                        }
                    }
                }
                .sheet(item: $editorMode) { mode in
                    CardEditorSheet(mode: mode)
                        .environmentObject(store)
                }
                .alert("Move Card to Trash", isPresented: $showDeleteConfirmation) {
                    Button("Move to Trash", role: .destructive) {
                        store.softDeleteCard(id: card.id)
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("The card can still be restored from Trash.")
                }
            } else {
                ContentUnavailableView("Missing card", systemImage: "questionmark.square")
            }
        }
    }

    private func tintColor(for grade: StudyReviewGrade) -> Color {
        switch grade {
        case .again: return .red
        case .hard: return .orange
        case .good: return .blue
        case .easy: return .green
        }
    }
}

struct StudyModeRootView: View {
    @EnvironmentObject private var store: StudyStore

    @State private var selectedMode: StudyQueueMode = .due
    @State private var currentIndex = 0
    @State private var showingBack = false

    private var queue: [StudyCard] {
        store.studyQueue(mode: selectedMode)
    }

    private var currentCard: StudyCard? {
        guard !queue.isEmpty else { return nil }
        let safeIndex = min(currentIndex, max(queue.count - 1, 0))
        return queue[safeIndex]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    DashboardHeroCard(
                        title: "Study Mode",
                        subtitle: "Due, all, and needs-work queues mapped from the Electron/Web app into something iOS can actually run today."
                    )

                    Picker("Queue", selection: $selectedMode) {
                        ForEach(StudyQueueMode.allCases) { mode in
                            Text(mode.displayName).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)

                    HStack {
                        Label("\(store.dueCards().count) due", systemImage: "calendar.badge.clock")
                        Spacer()
                        Label("\(queue.count) in queue", systemImage: "list.number")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    if let currentCard {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text(currentCard.title)
                                    .font(.title3.weight(.semibold))
                                Spacer()
                                Text("\(min(currentIndex + 1, queue.count))/\(queue.count)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Picker("Side", selection: $showingBack) {
                                Text("Front").tag(false)
                                Text("Back").tag(true)
                            }
                            .pickerStyle(.segmented)

                            VStack(alignment: .leading, spacing: 12) {
                                Text(showingBack ? currentCard.backText : currentCard.frontText)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(20)
                                    .background(Color.secondarySystemGroupedBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: 20))

                                if !currentCard.noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                    Text(currentCard.noteText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Grade")
                                    .font(.headline)
                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                                    ForEach(StudyReviewGrade.allCases) { grade in
                                        Button(grade.displayName) {
                                            store.markReviewed(cardID: currentCard.id, grade: grade)
                                            currentIndex = 0
                                            showingBack = false
                                        }
                                        .buttonStyle(.borderedProminent)
                                        .tint(tintColor(for: grade))
                                    }
                                }
                            }

                            HStack {
                                Button("Previous") {
                                    currentIndex = max(currentIndex - 1, 0)
                                    showingBack = false
                                }
                                .buttonStyle(.bordered)
                                .disabled(currentIndex == 0)

                                Spacer()

                                Button("Next") {
                                    currentIndex = min(currentIndex + 1, max(queue.count - 1, 0))
                                    showingBack = false
                                }
                                .buttonStyle(.bordered)
                                .disabled(currentIndex >= queue.count - 1)
                            }
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .shadow(color: .black.opacity(0.05), radius: 16, x: 0, y: 8)
                    } else {
                        EmptyStateCard(title: "No cards in this queue", subtitle: "Add cards or change the queue filter.")
                    }
                }
                .padding()
            }
            .navigationTitle("Study")
            .onChange(of: selectedMode) { _, _ in
                currentIndex = 0
                showingBack = false
            }
        }
    }

    private func tintColor(for grade: StudyReviewGrade) -> Color {
        switch grade {
        case .again: return .red
        case .hard: return .orange
        case .good: return .blue
        case .easy: return .green
        }
    }
}

struct SearchView: View {
    @EnvironmentObject private var store: StudyStore

    @State private var searchText = ""
    @State private var selectedStatus: CardFlag?
    @State private var selectedTagIDs: Set<UUID> = []

    private var results: [StudyCard] {
        let filter = SearchFilter(query: searchText, status: selectedStatus, selectedTagIDs: selectedTagIDs)
        return store.matchingCards(filter: filter)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if results.isEmpty {
                        ContentUnavailableView(
                            searchText.isEmpty ? "Start searching" : "No results",
                            systemImage: "magnifyingglass",
                            description: Text(searchText.isEmpty ? "Search titles, fronts, backs, notes, and source links." : "Try fewer filters.")
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(results) { card in
                            NavigationLink {
                                CardDetailView(cardID: card.id)
                            } label: {
                                CardRow(
                                    card: card,
                                    tags: card.tagIDs.compactMap(store.tag(id:)),
                                    cardSet: store.cardSet(id: card.cardSetID)
                                )
                            }
                        }
                    }
                }

                Section("Filters") {
                    Picker("Status", selection: statusBinding) {
                        Text("All").tag(Optional<CardFlag>.none)
                        ForEach(CardFlag.allCases) { flag in
                            Text(flag.displayName).tag(Optional(flag))
                        }
                    }

                    if !store.tags.isEmpty {
                        NavigationLink {
                            TagSelectionView(selectedTagIDs: $selectedTagIDs)
                                .environmentObject(store)
                        } label: {
                            HStack {
                                Text("Tags")
                                Spacer()
                                if selectedTagIDs.isEmpty {
                                    Text("All")
                                        .foregroundStyle(.secondary)
                                } else {
                                    Text("\(selectedTagIDs.count) selected")
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search")
            .searchable(text: $searchText, prompt: "Search cards")
        }
    }

    private var statusBinding: Binding<CardFlag?> {
        Binding(get: { selectedStatus }, set: { selectedStatus = $0 })
    }
}

struct TagSelectionView: View {
    @EnvironmentObject private var store: StudyStore
    @Binding var selectedTagIDs: Set<UUID>

    var body: some View {
        List {
            ForEach(store.tags) { tag in
                Button {
                    if selectedTagIDs.contains(tag.id) {
                        selectedTagIDs.remove(tag.id)
                    } else {
                        selectedTagIDs.insert(tag.id)
                    }
                } label: {
                    HStack {
                        Circle()
                            .fill(tag.colorName.color)
                            .frame(width: 14, height: 14)
                        Text(tag.name)
                        Spacer()
                        Image(systemName: selectedTagIDs.contains(tag.id) ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(selectedTagIDs.contains(tag.id) ? Color.accentColor : .secondary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .navigationTitle("Tag Filters")
    }
}

struct TagsView: View {
    @EnvironmentObject private var store: StudyStore

    @State private var editorMode: TagEditorMode?
    @State private var tagToDelete: StudyTag?

    var body: some View {
        NavigationStack {
            List {
                if store.tags.isEmpty {
                    ContentUnavailableView(
                        "No tags yet",
                        systemImage: "tag.slash",
                        description: Text("Create tags to organize cards without inventing a second filesystem.")
                    )
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(store.tags) { tag in
                        NavigationLink {
                            TaggedCardsView(tagID: tag.id)
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(tag.colorName.color)
                                    .frame(width: 16, height: 16)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(tag.name)
                                    Text("\(store.tagUsageCount(tagID: tag.id)) cards")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button("Edit") {
                                editorMode = .edit(tag)
                            }
                            .tint(.blue)

                            Button("Delete", role: .destructive) {
                                tagToDelete = tag
                            }
                        }
                    }
                }
            }
            .navigationTitle("Tags")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editorMode = .create
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $editorMode) { mode in
                TagEditorSheet(mode: mode)
                    .environmentObject(store)
            }
            .alert("Delete Tag", isPresented: Binding(
                get: { tagToDelete != nil },
                set: { if !$0 { tagToDelete = nil } }
            )) {
                Button("Delete", role: .destructive) {
                    guard let tagToDelete else { return }
                    store.deleteTag(id: tagToDelete.id)
                    self.tagToDelete = nil
                }
                Button("Cancel", role: .cancel) {
                    tagToDelete = nil
                }
            } message: {
                Text("The tag will be removed from all cards, but the cards remain.")
            }
        }
    }
}

struct TaggedCardsView: View {
    @EnvironmentObject private var store: StudyStore

    let tagID: UUID

    private var tag: StudyTag? {
        store.tag(id: tagID)
    }

    private var cards: [StudyCard] {
        store.cards(forTag: tagID)
    }

    var body: some View {
        Group {
            if let tag {
                List {
                    if cards.isEmpty {
                        ContentUnavailableView("No cards", systemImage: "tag")
                            .listRowBackground(Color.clear)
                    } else {
                        ForEach(cards) { card in
                            NavigationLink {
                                CardDetailView(cardID: card.id)
                            } label: {
                                CardRow(card: card, tags: card.tagIDs.compactMap(store.tag(id:)), cardSet: store.cardSet(id: card.cardSetID))
                            }
                        }
                    }
                }
                .navigationTitle(tag.name)
            } else {
                ContentUnavailableView("Missing tag", systemImage: "questionmark")
            }
        }
    }
}

struct MoreHubView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Explore") {
                    NavigationLink("Calendar", destination: CalendarRouteView())
                    NavigationLink("Directory", destination: DirectoryRouteView())
                    NavigationLink("Gallery", destination: GalleryRouteView())
                    NavigationLink("Questions", destination: QuestionsRouteView())
                    NavigationLink("Dictionary", destination: DictionaryRouteView())
                    NavigationLink("Tag Map", destination: TagMapRouteView())
                    NavigationLink("Trash", destination: TrashRouteView())
                }

                Section("System") {
                    NavigationLink("Settings", destination: SettingsView())
                }
            }
            .navigationTitle("More")
        }
    }
}

struct CalendarRouteView: View {
    @EnvironmentObject private var store: StudyStore
    @State private var selectedDate = Date.now

    var body: some View {
        List {
            Section {
                DatePicker("Review Day", selection: $selectedDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
            }

            Section("Due on selected day") {
                let cards = store.cardsForCalendarDay(selectedDate)
                if cards.isEmpty {
                    Text("No reviews scheduled.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(cards) { card in
                        NavigationLink {
                            CardDetailView(cardID: card.id)
                        } label: {
                            CardRow(card: card, tags: card.tagIDs.compactMap(store.tag(id:)), cardSet: store.cardSet(id: card.cardSetID))
                        }
                    }
                }
            }

            Section("Upcoming") {
                ForEach(store.upcomingCards()) { card in
                    NavigationLink {
                        CardDetailView(cardID: card.id)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(card.title)
                            Text(card.nextReviewAt?.formatted(date: .abbreviated, time: .shortened) ?? "Not scheduled")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Calendar")
    }
}

struct DirectoryRouteView: View {
    @EnvironmentObject private var store: StudyStore

    var body: some View {
        List {
            ForEach(store.directoryEntries()) { entry in
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.title)
                        .font(.headline)
                    Text(entry.subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Directory")
    }
}

struct GalleryRouteView: View {
    @EnvironmentObject private var store: StudyStore

    let columns = [GridItem(.adaptive(minimum: 160), spacing: 12)]

    var body: some View {
        ScrollView {
            if store.cardsWithImages.isEmpty {
                EmptyStateCard(title: "No gallery items", subtitle: "Add image URLs in card edit to populate the gallery.")
                    .padding()
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(store.cardsWithImages) { card in
                        NavigationLink {
                            CardDetailView(cardID: card.id)
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                if let imageURL = card.imageURL, let url = URL(string: imageURL) {
                                    AsyncImage(url: url) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image
                                                .resizable()
                                                .scaledToFill()
                                                .frame(height: 120)
                                                .frame(maxWidth: .infinity)
                                                .clipped()
                                        default:
                                            ZStack {
                                                RoundedRectangle(cornerRadius: 16)
                                                    .fill(Color.secondarySystemGroupedBackground)
                                                Image(systemName: "photo")
                                                    .foregroundStyle(.secondary)
                                            }
                                            .frame(height: 120)
                                        }
                                    }
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                }

                                Text(card.title)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                    .lineLimit(2)

                                Text(store.cardSet(id: card.cardSetID)?.name ?? "Unknown set")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 4)
                        }
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Gallery")
    }
}

struct QuestionsRouteView: View {
    @EnvironmentObject private var store: StudyStore

    var body: some View {
        List {
            ForEach(store.questions()) { card in
                NavigationLink {
                    CardDetailView(cardID: card.id)
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(card.frontText)
                            .lineLimit(3)
                        Text(card.title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Questions")
    }
}

struct DictionaryRouteView: View {
    @EnvironmentObject private var store: StudyStore

    var body: some View {
        List {
            ForEach(Array(store.dictionaryTerms().enumerated()), id: \.offset) { _, item in
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.term)
                        .font(.headline)
                    Text(item.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        }
        .navigationTitle("Dictionary")
    }
}

struct TagMapRouteView: View {
    @EnvironmentObject private var store: StudyStore

    var body: some View {
        List {
            ForEach(store.tagMapRows(), id: \.tag.id) { row in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        BadgeView(text: row.tag.name, colorName: row.tag.colorName)
                        Spacer()
                        Text("\(row.count) cards")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if row.cardSets.isEmpty {
                        Text("No linked card sets")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        FlowLayout(spacing: 8) {
                            ForEach(row.cardSets, id: \.id) { cardSet in
                                BadgeView(text: cardSet.name, colorName: cardSet.colorName)
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Tag Map")
    }
}

struct TrashRouteView: View {
    @EnvironmentObject private var store: StudyStore
    @State private var cardToPurge: UUID?
    @State private var showEmptyTrashConfirmation = false

    var body: some View {
        List {
            if store.deletedCards.isEmpty {
                ContentUnavailableView(
                    "Trash is empty",
                    systemImage: "trash",
                    description: Text("Deleted cards land here until you restore or purge them.")
                )
                .listRowBackground(Color.clear)
            } else {
                ForEach(store.deletedCards) { card in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(card.title)
                            .font(.headline)
                        Text(card.frontText)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                        HStack {
                            Text(card.deletedAt?.formatted(date: .abbreviated, time: .shortened) ?? "Deleted")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button("Restore") {
                                store.restoreCard(id: card.id)
                            }
                            .buttonStyle(.bordered)
                            Button("Delete Forever", role: .destructive) {
                                cardToPurge = card.id
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Trash")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if !store.deletedCards.isEmpty {
                    Button("Empty") {
                        showEmptyTrashConfirmation = true
                    }
                }
            }
        }
        .alert("Delete Forever", isPresented: Binding(
            get: { cardToPurge != nil },
            set: { if !$0 { cardToPurge = nil } }
        )) {
            Button("Delete Forever", role: .destructive) {
                guard let cardToPurge else { return }
                store.permanentlyDeleteCard(id: cardToPurge)
                self.cardToPurge = nil
            }
            Button("Cancel", role: .cancel) {
                cardToPurge = nil
            }
        } message: {
            Text("This permanently removes the card from local storage.")
        }
        .alert("Empty Trash", isPresented: $showEmptyTrashConfirmation) {
            Button("Empty", role: .destructive) {
                store.emptyTrash()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently removes all trashed cards.")
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject private var store: StudyStore
    @ObservedObject private var firebase = FirebaseSyncManager.shared

    @State private var exportDocument: SnapshotDocument?
    @State private var exportFileName = "flashcardmaster-snapshot.json"
    @State private var showExporter = false
    @State private var showJSONImporter = false
    @State private var showXLSXImporter = false
    @State private var showResetConfirmation = false
    @State private var firebaseAPIKey = ""
    @State private var firebaseProjectID = ""
    @State private var email = ""
    @State private var password = ""

    private var selectedTheme: Binding<AppTheme> {
        Binding(
            get: { store.theme() },
            set: { store.updateTheme($0) }
        )
    }

    private var hasFirebaseConfiguration: Bool {
        firebase.configuration?.isComplete == true
    }

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: selectedTheme) {
                    ForEach(AppTheme.allCases) { theme in
                        Text(theme.displayName).tag(theme)
                    }
                }
            }

            Section("Firebase Configuration") {
                TextField("Firebase Web API Key", text: $firebaseAPIKey)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Firebase Project ID", text: $firebaseProjectID)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                Button("Save Firebase Configuration") {
                    firebase.updateConfiguration(apiKey: firebaseAPIKey, projectID: firebaseProjectID)
                }

                if hasFirebaseConfiguration {
                    Button("Clear Firebase Configuration", role: .destructive) {
                        firebase.clearConfiguration()
                        firebaseAPIKey = ""
                        firebaseProjectID = ""
                    }
                }
            }

            Section("Firebase Authentication") {
                if let session = firebase.session {
                    InfoLine(label: "Signed in", value: session.email)
                    Button("Sign Out", role: .destructive) {
                        firebase.signOut()
                    }
                } else {
                    TextField("Email", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                    SecureField("Password", text: $password)
                    HStack {
                        Button("Sign In") {
                            Task { await firebase.signIn(email: email, password: password) }
                        }
                        .disabled(!hasFirebaseConfiguration || email.isEmpty || password.isEmpty || firebase.isWorking)

                        Button("Create Account") {
                            Task { await firebase.signUp(email: email, password: password) }
                        }
                        .disabled(!hasFirebaseConfiguration || email.isEmpty || password.isEmpty || firebase.isWorking)
                    }
                }
            }

            Section("Cloud Sync") {
                Button("Push Snapshot to Cloud") {
                    Task {
                        do {
                            try await pushSnapshot()
                        } catch {
                            store.lastErrorMessage = error.localizedDescription
                        }
                    }
                }
                .disabled(firebase.session == nil || firebase.isWorking)

                Button("Pull Snapshot from Cloud") {
                    Task {
                        do {
                            try await pullSnapshot()
                        } catch {
                            store.lastErrorMessage = error.localizedDescription
                        }
                    }
                }
                .disabled(firebase.session == nil || firebase.isWorking)

                if let status = firebase.statusMessage, !status.isEmpty {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Data") {
                Button("Export Snapshot") {
                    do {
                        exportDocument = try SnapshotDocument(data: store.snapshotData())
                        exportFileName = "flashcardmaster-\(Date.now.formatted(.iso8601.year().month().day())).json"
                        showExporter = true
                    } catch {
                        store.lastErrorMessage = error.localizedDescription
                    }
                }

                Button("Import Snapshot") {
                    showJSONImporter = true
                }

                Button("Import XLSX Workbook") {
                    showXLSXImporter = true
                }

                Button("Reset to Sample Data", role: .destructive) {
                    showResetConfirmation = true
                }
            }

            Section("Parity Notes") {
                Text("This iOS build now includes Firebase email/password auth, Firestore snapshot sync, XLSX import, and PDF preview support in addition to the local-first routes.")
                Text("Google popup auth and the exact BlockNote/PDF block editor surface from Electron/React are still separate work. Shocking that software has edges.")
            }

            if let lastErrorMessage = store.lastErrorMessage,
               !lastErrorMessage.isEmpty {
                Section("Last Error") {
                    Text(lastErrorMessage)
                        .foregroundStyle(.red)
                }
            }

            Section("About") {
                InfoLine(label: "App", value: "FlashCardMasterNative")
                InfoLine(label: "Mode", value: "Parity build with cloud options")
                InfoLine(label: "Storage", value: "JSON snapshot + optional Firestore")
                InfoLine(label: "Snapshot version", value: String(StudySnapshot.currentVersion))
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            firebaseAPIKey = firebase.configuration?.apiKey ?? ""
            firebaseProjectID = firebase.configuration?.projectID ?? ""
            email = firebase.session?.email ?? email
        }
        .fileExporter(
            isPresented: $showExporter,
            document: exportDocument,
            contentType: .json,
            defaultFilename: exportFileName
        ) { _ in
            exportDocument = nil
        }
        .fileImporter(
            isPresented: $showJSONImporter,
            allowedContentTypes: [.json],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                do {
                    let data = try Data(contentsOf: url)
                    try store.importSnapshot(from: data)
                } catch {
                    store.lastErrorMessage = error.localizedDescription
                }
            case .failure(let error):
                store.lastErrorMessage = error.localizedDescription
            }
        }
        .fileImporter(
            isPresented: $showXLSXImporter,
            allowedContentTypes: [.xlsx],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                do {
                    let data = try Data(contentsOf: url)
                    _ = try store.importXLSXWorkbook(from: data, fileName: url.lastPathComponent)
                } catch {
                    store.lastErrorMessage = error.localizedDescription
                }
            case .failure(let error):
                store.lastErrorMessage = error.localizedDescription
            }
        }
        .alert("Reset Data", isPresented: $showResetConfirmation) {
            Button("Reset", role: .destructive) {
                store.resetToSample()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This replaces your local data with the bundled sample snapshot.")
        }
    }

    private func pushSnapshot() async throws {
        let data = try store.snapshotData()
        await firebase.pushSnapshot(data: data)
    }

    private func pullSnapshot() async throws {
        let data = try await firebase.pullSnapshot()
        try store.importSnapshot(from: data)
    }
}

struct DashboardHeroCard: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.title2.weight(.bold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.18), Color.purple.opacity(0.12)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

struct EmptyStateCard: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 28))
                .foregroundStyle(.secondary)
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.secondarySystemGroupedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

struct InfoLine: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .multilineTextAlignment(.trailing)
        }
    }
}

struct FolderRow: View {
    let folder: StudyFolder
    let childFolderCount: Int
    let cardSetCount: Int

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(folder.colorName.color)
                .frame(width: 14, height: 14)

            VStack(alignment: .leading, spacing: 4) {
                Text(folder.name)
                Text("\(childFolderCount) folders • \(cardSetCount) sets")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }
}

struct CardSetRow: View {
    let cardSet: StudyCardSet
    let cardCount: Int
    let deletedCount: Int

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 4)
                .fill(cardSet.colorName.color)
                .frame(width: 14, height: 14)

            VStack(alignment: .leading, spacing: 4) {
                Text(cardSet.name)
                Text("\(cardCount) cards • \(deletedCount) trashed")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 2)
    }
}

struct CardRow: View {
    let card: StudyCard
    let tags: [StudyTag]
    let cardSet: StudyCardSet?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(card.title)
                    .font(.headline)
                Spacer()
                if card.imageURL != nil {
                    Image(systemName: "photo")
                        .foregroundStyle(.secondary)
                }
            }

            Text(card.frontText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            FlowLayout(spacing: 8) {
                if let cardSet {
                    BadgeView(text: cardSet.name, colorName: cardSet.colorName)
                }
                ForEach(tags.prefix(3), id: \.id) { tag in
                    BadgeView(text: tag.name, colorName: tag.colorName)
                }
                ForEach(Array(card.flags).sorted(by: { $0.rawValue < $1.rawValue }), id: \.self) { flag in
                    BadgeView(text: flag.displayName, colorName: .slate)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct BadgeView: View {
    let text: String
    let colorName: StudyColorName

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(colorName.color.opacity(0.16))
            .foregroundStyle(colorName.color)
            .clipShape(Capsule())
    }
}

struct FolderEditorSheet: View {
    @EnvironmentObject private var store: StudyStore
    @Environment(\.dismiss) private var dismiss

    let mode: FolderEditorMode

    @State private var name = ""
    @State private var colorName: StudyColorName = .blue

    var body: some View {
        NavigationStack {
            Form {
                TextField("Folder name", text: $name)
                Picker("Color", selection: $colorName) {
                    ForEach(StudyColorName.allCases) { color in
                        Text(color.displayName).tag(color)
                    }
                }
            }
            .navigationTitle(mode.title)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        store.upsertFolder(
                            id: mode.folder?.id,
                            name: name,
                            colorName: colorName,
                            parentID: mode.parentFolderID
                        )
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let folder = mode.folder {
                    name = folder.name
                    colorName = folder.colorName
                }
            }
        }
    }
}

struct CardSetEditorSheet: View {
    @EnvironmentObject private var store: StudyStore
    @Environment(\.dismiss) private var dismiss

    let mode: CardSetEditorMode

    @State private var name = ""
    @State private var colorName: StudyColorName = .blue

    var body: some View {
        NavigationStack {
            Form {
                TextField("Card set name", text: $name)
                Picker("Color", selection: $colorName) {
                    ForEach(StudyColorName.allCases) { color in
                        Text(color.displayName).tag(color)
                    }
                }
            }
            .navigationTitle(mode.title)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        store.upsertCardSet(
                            id: mode.cardSet?.id,
                            name: name,
                            colorName: colorName,
                            parentFolderID: mode.parentFolderID
                        )
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let cardSet = mode.cardSet {
                    name = cardSet.name
                    colorName = cardSet.colorName
                }
            }
        }
    }
}

struct CardEditorSheet: View {
    @EnvironmentObject private var store: StudyStore
    @Environment(\.dismiss) private var dismiss

    let mode: CardEditorMode

    @State private var title = ""
    @State private var frontText = ""
    @State private var backText = ""
    @State private var noteText = ""
    @State private var imageURL = ""
    @State private var sourceURL = ""
    @State private var pdfURL = ""
    @State private var selectedTagIDs: Set<UUID> = []
    @State private var selectedFlags: Set<CardFlag> = []
    @State private var hasScheduledReview = false
    @State private var nextReviewAt = Date.now
    @State private var showPDFImporter = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Basics") {
                    TextField("Title", text: $title)
                    TextEditor(text: $frontText)
                        .frame(minHeight: 100)
                    TextEditor(text: $backText)
                        .frame(minHeight: 100)
                }

                Section("Extras") {
                    TextEditor(text: $noteText)
                        .frame(minHeight: 80)
                    TextField("Image URL", text: $imageURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    TextField("Source URL", text: $sourceURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    TextField("PDF URL", text: $pdfURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    Button(pdfURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Import PDF from Files" : "Replace Imported PDF") {
                        showPDFImporter = true
                    }
                    if !pdfURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text(PDFSourceResolver.displayName(pdfURL))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Review Schedule") {
                    Toggle("Schedule review", isOn: $hasScheduledReview)
                    if hasScheduledReview {
                        DatePicker("Next review", selection: $nextReviewAt)
                    }
                }

                if !store.tags.isEmpty {
                    Section("Tags") {
                        ForEach(store.tags) { tag in
                            Button {
                                toggleTag(tag.id)
                            } label: {
                                HStack {
                                    Circle()
                                        .fill(tag.colorName.color)
                                        .frame(width: 14, height: 14)
                                    Text(tag.name)
                                    Spacer()
                                    Image(systemName: selectedTagIDs.contains(tag.id) ? "checkmark.circle.fill" : "circle")
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("Flags") {
                    ForEach(CardFlag.allCases) { flag in
                        Button {
                            toggleFlag(flag)
                        } label: {
                            HStack {
                                Text(flag.displayName)
                                Spacer()
                                Image(systemName: selectedFlags.contains(flag) ? "checkmark.circle.fill" : "circle")
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle(mode.title)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        store.upsertCard(
                            id: mode.card?.id,
                            cardSetID: mode.cardSetID,
                            title: title,
                            frontText: frontText,
                            backText: backText,
                            noteText: noteText,
                            imageURL: imageURL,
                            sourceURL: sourceURL,
                            pdfURL: pdfURL,
                            tagIDs: Array(selectedTagIDs),
                            flags: selectedFlags,
                            nextReviewAt: hasScheduledReview ? nextReviewAt : nil
                        )
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || (frontText + backText).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let card = mode.card {
                    title = card.title
                    frontText = card.frontText
                    backText = card.backText
                    noteText = card.noteText
                    imageURL = card.imageURL ?? ""
                    sourceURL = card.sourceURL ?? ""
                    pdfURL = card.pdfURL ?? ""
                    selectedTagIDs = Set(card.tagIDs)
                    selectedFlags = card.flags
                    hasScheduledReview = card.nextReviewAt != nil
                    nextReviewAt = card.nextReviewAt ?? Date.now
                }
            }
            .fileImporter(
                isPresented: $showPDFImporter,
                allowedContentTypes: [.pdf],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    do {
                        pdfURL = try store.copyImportedFile(from: url, preferredFileName: title.isEmpty ? "card-pdf" : title.replacingOccurrences(of: " ", with: "-"))
                    } catch {
                        store.lastErrorMessage = error.localizedDescription
                    }
                case .failure(let error):
                    store.lastErrorMessage = error.localizedDescription
                }
            }
        }
    }

    private func toggleTag(_ tagID: UUID) {
        if selectedTagIDs.contains(tagID) {
            selectedTagIDs.remove(tagID)
        } else {
            selectedTagIDs.insert(tagID)
        }
    }

    private func toggleFlag(_ flag: CardFlag) {
        if selectedFlags.contains(flag) {
            selectedFlags.remove(flag)
        } else {
            selectedFlags.insert(flag)
        }
    }
}

struct TagEditorSheet: View {
    @EnvironmentObject private var store: StudyStore
    @Environment(\.dismiss) private var dismiss

    let mode: TagEditorMode

    @State private var name = ""
    @State private var colorName: StudyColorName = .blue

    var body: some View {
        NavigationStack {
            Form {
                TextField("Tag name", text: $name)
                Picker("Color", selection: $colorName) {
                    ForEach(StudyColorName.allCases) { color in
                        Text(color.displayName).tag(color)
                    }
                }
            }
            .navigationTitle(mode.title)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        store.upsertTag(id: mode.tag?.id, name: name, colorName: colorName)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let tag = mode.tag {
                    name = tag.name
                    colorName = tag.colorName
                }
            }
        }
    }
}

enum FolderEditorMode: Identifiable {
    case create(UUID?)
    case edit(StudyFolder)

    var id: String {
        switch self {
        case .create(let parentFolderID):
            return "create-\(parentFolderID?.uuidString ?? "root")"
        case .edit(let folder):
            return "edit-\(folder.id.uuidString)"
        }
    }

    var title: String {
        switch self {
        case .create:
            return "New Folder"
        case .edit:
            return "Edit Folder"
        }
    }

    var folder: StudyFolder? {
        switch self {
        case .create:
            return nil
        case .edit(let folder):
            return folder
        }
    }

    var parentFolderID: UUID? {
        switch self {
        case .create(let parentFolderID):
            return parentFolderID
        case .edit(let folder):
            return folder.parentID
        }
    }
}

enum CardSetEditorMode: Identifiable {
    case create(UUID?)
    case edit(StudyCardSet)

    var id: String {
        switch self {
        case .create(let parentFolderID):
            return "create-\(parentFolderID?.uuidString ?? "root")"
        case .edit(let cardSet):
            return "edit-\(cardSet.id.uuidString)"
        }
    }

    var title: String {
        switch self {
        case .create:
            return "New Card Set"
        case .edit:
            return "Edit Card Set"
        }
    }

    var cardSet: StudyCardSet? {
        switch self {
        case .create:
            return nil
        case .edit(let cardSet):
            return cardSet
        }
    }

    var parentFolderID: UUID? {
        switch self {
        case .create(let parentFolderID):
            return parentFolderID
        case .edit(let cardSet):
            return cardSet.parentFolderID
        }
    }
}

enum CardEditorMode: Identifiable {
    case create(UUID)
    case edit(StudyCard)

    var id: String {
        switch self {
        case .create(let cardSetID):
            return "create-\(cardSetID.uuidString)"
        case .edit(let card):
            return "edit-\(card.id.uuidString)"
        }
    }

    var title: String {
        switch self {
        case .create:
            return "New Card"
        case .edit:
            return "Edit Card"
        }
    }

    var card: StudyCard? {
        switch self {
        case .create:
            return nil
        case .edit(let card):
            return card
        }
    }

    var cardSetID: UUID {
        switch self {
        case .create(let cardSetID):
            return cardSetID
        case .edit(let card):
            return card.cardSetID
        }
    }
}

enum TagEditorMode: Identifiable {
    case create
    case edit(StudyTag)

    var id: String {
        switch self {
        case .create:
            return "create"
        case .edit(let tag):
            return "edit-\(tag.id.uuidString)"
        }
    }

    var title: String {
        switch self {
        case .create:
            return "New Tag"
        case .edit:
            return "Edit Tag"
        }
    }

    var tag: StudyTag? {
        switch self {
        case .create:
            return nil
        case .edit(let tag):
            return tag
        }
    }
}

struct SnapshotDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        self.data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

extension StudyColorName {
    var color: Color {
        switch self {
        case .slate: return .gray
        case .blue: return .blue
        case .green: return .green
        case .amber: return .orange
        case .rose: return .pink
        case .purple: return .purple
        }
    }
}

extension Color {
    static let secondarySystemGroupedBackground = Color(uiColor: .secondarySystemGroupedBackground)
}

struct FlowLayout<Content: View>: View {
    let spacing: CGFloat
    @ViewBuilder let content: () -> Content

    init(spacing: CGFloat = 8, @ViewBuilder content: @escaping () -> Content) {
        self.spacing = spacing
        self.content = content
    }

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 72), spacing: spacing, alignment: .leading)], alignment: .leading, spacing: spacing) {
            content()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(StudyStore())
}
#endif
