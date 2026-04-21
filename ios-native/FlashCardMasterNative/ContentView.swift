#if canImport(SwiftUI)
import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject private var store: StudyStore

    var body: some View {
        TabView {
            LibraryRootView(parentFolderID: nil, navigationTitle: "Library")
                .tabItem {
                    Label("Library", systemImage: "books.vertical")
                }

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }

            TagsView()
                .tabItem {
                    Label("Tags", systemImage: "tag")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
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
                if !childFolders.isEmpty {
                    Section("Folders") {
                        ForEach(childFolders) { folder in
                            NavigationLink {
                                LibraryRootView(parentFolderID: folder.id, navigationTitle: folder.name)
                            } label: {
                                FolderRow(folder: folder, childFolderCount: store.childFolderCount(for: folder.id), cardSetCount: store.cardSetCount(in: folder.id))
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
                                CardSetRow(cardSet: cardSet, cardCount: store.cardCount(in: cardSet.id))
                            }
                        }
                        .onDelete(perform: deleteCardSets)
                    }
                }

                if childFolders.isEmpty && childCardSets.isEmpty {
                    ContentUnavailableView(
                        "Nothing here yet",
                        systemImage: "tray",
                        description: Text("Create a folder or card set. The universe will survive either way.")
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
                Text("This deletes the folder, nested folders, card sets, and cards inside it.")
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
                                CardRow(card: card, tags: card.tagIDs.compactMap(store.tag(id:)))
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button("Edit") {
                                    editorMode = .edit(card)
                                }
                                .tint(.blue)

                                Button("Delete", role: .destructive) {
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
                .alert("Delete Card", isPresented: Binding(
                    get: { cardIDToDelete != nil },
                    set: { if !$0 { cardIDToDelete = nil } }
                )) {
                    Button("Delete", role: .destructive) {
                        guard let cardIDToDelete else { return }
                        store.deleteCard(id: cardIDToDelete)
                        self.cardIDToDelete = nil
                    }
                    Button("Cancel", role: .cancel) {
                        cardIDToDelete = nil
                    }
                } message: {
                    Text("This card will be removed permanently.")
                }
                .alert("Delete Card Set", isPresented: $showDeleteCardSetConfirmation) {
                    Button("Delete", role: .destructive) {
                        store.deleteCardSet(id: cardSet.id)
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("All cards in this set will be deleted.")
                }
            } else {
                ContentUnavailableView("Missing card set", systemImage: "exclamationmark.triangle")
            }
        }
    }
}

struct CardDetailView: View {
    @EnvironmentObject private var store: StudyStore

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

                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Card Set", value: cardSet.name)
                            LabeledContent("Updated", value: card.updatedAt.formatted(date: .abbreviated, time: .shortened))
                            LabeledContent("Created", value: card.createdAt.formatted(date: .abbreviated, time: .shortened))
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
                .alert("Delete Card", isPresented: $showDeleteConfirmation) {
                    Button("Delete", role: .destructive) {
                        store.deleteCard(id: card.id)
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("This cannot be undone.")
                }
            } else {
                ContentUnavailableView("Missing card", systemImage: "questionmark.square")
            }
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
                            description: Text(searchText.isEmpty ? "Search titles, fronts, and backs." : "Try fewer filters.")
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(results) { card in
                            NavigationLink {
                                CardDetailView(cardID: card.id)
                            } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(card.title)
                                        .font(.headline)

                                    Text(card.frontText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)

                                    HStack(spacing: 8) {
                                        if let cardSet = store.cardSet(id: card.cardSetID) {
                                            BadgeView(text: cardSet.name, colorName: cardSet.colorName)
                                        }
                                        ForEach(card.tagIDs.compactMap(store.tag(id:)).prefix(3), id: \.id) { tag in
                                            BadgeView(text: tag.name, colorName: tag.colorName)
                                        }
                                    }
                                }
                                .padding(.vertical, 4)
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
        Binding(
            get: { selectedStatus },
            set: { selectedStatus = $0 }
        )
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
                                CardRow(card: card, tags: card.tagIDs.compactMap(store.tag(id:)))
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

struct SettingsView: View {
    @EnvironmentObject private var store: StudyStore
    @AppStorage("flashcardmaster.theme.override") private var themeOverrideRawValue = AppTheme.system.rawValue

    @State private var exportDocument: SnapshotDocument?
    @State private var exportFileName = "flashcardmaster-snapshot.json"
    @State private var showExporter = false
    @State private var showImporter = false
    @State private var showResetConfirmation = false

    private var selectedTheme: Binding<AppTheme> {
        Binding(
            get: { AppTheme(rawValue: themeOverrideRawValue) ?? .system },
            set: {
                themeOverrideRawValue = $0.rawValue
                store.updateTheme($0)
            }
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Theme", selection: selectedTheme) {
                        ForEach(AppTheme.allCases) { theme in
                            Text(theme.displayName).tag(theme)
                        }
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
                        showImporter = true
                    }

                    Button("Reset to Sample Data", role: .destructive) {
                        showResetConfirmation = true
                    }
                }

                if let lastErrorMessage = store.lastErrorMessage,
                   !lastErrorMessage.isEmpty {
                    Section("Last Error") {
                        Text(lastErrorMessage)
                            .foregroundStyle(.red)
                    }
                }

                Section("About") {
                    LabeledContent("App", value: "FlashCardMasterNative")
                    LabeledContent("Mode", value: "Local-first")
                    LabeledContent("Storage", value: "JSON snapshot")
                }
            }
            .navigationTitle("Settings")
            .fileExporter(
                isPresented: $showExporter,
                document: exportDocument,
                contentType: .json,
                defaultFilename: exportFileName
            ) { _ in
                exportDocument = nil
            }
            .fileImporter(
                isPresented: $showImporter,
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
            .alert("Reset Data", isPresented: $showResetConfirmation) {
                Button("Reset", role: .destructive) {
                    store.resetToSample()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This replaces your local data with the bundled sample snapshot.")
            }
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

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 4)
                .fill(cardSet.colorName.color)
                .frame(width: 14, height: 14)

            VStack(alignment: .leading, spacing: 4) {
                Text(cardSet.name)
                Text("\(cardCount) cards")
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

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(card.title)
                .font(.headline)

            Text(card.frontText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            FlowLayout(spacing: 8) {
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
    @State private var colorName: StudyColorName = .green

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
    @State private var selectedTagIDs: Set<UUID> = []
    @State private var selectedFlags: Set<CardFlag> = []

    var body: some View {
        NavigationStack {
            Form {
                Section("Card") {
                    TextField("Title", text: $title)
                    TextEditor(text: $frontText)
                        .frame(minHeight: 120)
                    TextEditor(text: $backText)
                        .frame(minHeight: 120)
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
                                        .frame(width: 12, height: 12)
                                    Text(tag.name)
                                    Spacer()
                                    Image(systemName: selectedTagIDs.contains(tag.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedTagIDs.contains(tag.id) ? Color.accentColor : .secondary)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("Status") {
                    ForEach(CardFlag.allCases) { flag in
                        Button {
                            toggleFlag(flag)
                        } label: {
                            HStack {
                                Text(flag.displayName)
                                Spacer()
                                Image(systemName: selectedFlags.contains(flag) ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selectedFlags.contains(flag) ? Color.accentColor : .secondary)
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
                            tagIDs: Array(selectedTagIDs),
                            flags: selectedFlags
                        )
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let card = mode.card {
                    title = card.title
                    frontText = card.frontText
                    backText = card.backText
                    selectedTagIDs = Set(card.tagIDs)
                    selectedFlags = card.flags
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