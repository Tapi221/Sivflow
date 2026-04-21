import Foundation

#if canImport(Combine)
import Combine

@MainActor
final class StudyStore: ObservableObject {
    @Published private(set) var snapshot: StudySnapshot
    @Published var lastErrorMessage: String?

    private let storageURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(storageURL: URL? = nil) {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let folderURL = appSupport.appendingPathComponent("FlashCardMasterNative", isDirectory: true)
        try? FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
        self.storageURL = storageURL ?? folderURL.appendingPathComponent("study-snapshot.json")

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        if let data = try? Data(contentsOf: self.storageURL),
           let loaded = try? decoder.decode(StudySnapshot.self, from: data) {
            self.snapshot = loaded
        } else {
            self.snapshot = .sample
            try? persist()
        }
    }

    var folders: [StudyFolder] {
        snapshot.folders.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    var cardSets: [StudyCardSet] {
        snapshot.cardSets.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    var tags: [StudyTag] {
        snapshot.tags.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    var cards: [StudyCard] {
        snapshot.cards.sorted {
            if $0.updatedAt == $1.updatedAt {
                return $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending
            }
            return $0.updatedAt > $1.updatedAt
        }
    }

    func theme() -> AppTheme {
        snapshot.theme
    }

    func updateTheme(_ theme: AppTheme) {
        snapshot.theme = theme
        saveSilently()
    }

    func folders(in parentID: UUID?) -> [StudyFolder] {
        folders.filter { $0.parentID == parentID }
    }

    func cardSets(in parentFolderID: UUID?) -> [StudyCardSet] {
        cardSets.filter { $0.parentFolderID == parentFolderID }
    }

    func cards(in cardSetID: UUID) -> [StudyCard] {
        cards.filter { $0.cardSetID == cardSetID }
    }

    func cards(forTag tagID: UUID) -> [StudyCard] {
        cards.filter { $0.tagIDs.contains(tagID) }
    }

    func folder(id: UUID) -> StudyFolder? {
        snapshot.folders.first { $0.id == id }
    }

    func cardSet(id: UUID) -> StudyCardSet? {
        snapshot.cardSets.first { $0.id == id }
    }

    func card(id: UUID) -> StudyCard? {
        snapshot.cards.first { $0.id == id }
    }

    func tag(id: UUID) -> StudyTag? {
        snapshot.tags.first { $0.id == id }
    }

    func childFolderCount(for folderID: UUID) -> Int {
        snapshot.folders.count { $0.parentID == folderID }
    }

    func cardSetCount(in folderID: UUID?) -> Int {
        snapshot.cardSets.count { $0.parentFolderID == folderID }
    }

    func cardCount(in cardSetID: UUID) -> Int {
        snapshot.cards.count { $0.cardSetID == cardSetID }
    }

    func tagUsageCount(tagID: UUID) -> Int {
        snapshot.cards.count { $0.tagIDs.contains(tagID) }
    }

    func matchingCards(filter: SearchFilter) -> [StudyCard] {
        cards.filter { filter.matches(card: $0) }
    }

    func upsertFolder(id: UUID?, name: String, colorName: StudyColorName, parentID: UUID?) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let id, let index = snapshot.folders.firstIndex(where: { $0.id == id }) {
            snapshot.folders[index].name = trimmedName
            snapshot.folders[index].colorName = colorName
            snapshot.folders[index].parentID = parentID
            snapshot.folders[index].updatedAt = .now
        } else {
            snapshot.folders.append(
                StudyFolder(name: trimmedName, colorName: colorName, parentID: parentID)
            )
        }
        saveSilently()
    }

    func deleteFolder(id: UUID) {
        let descendantIDs = collectDescendantFolderIDs(parentID: id)
        let allFolderIDs = Set(descendantIDs + [id])

        let cardSetIDs = snapshot.cardSets
            .filter { allFolderIDs.contains($0.parentFolderID ?? UUID()) }
            .map(\.id)

        snapshot.folders.removeAll { allFolderIDs.contains($0.id) }
        snapshot.cardSets.removeAll { cardSetIDs.contains($0.id) }
        snapshot.cards.removeAll { cardSetIDs.contains($0.cardSetID) }
        saveSilently()
    }

    func upsertCardSet(id: UUID?, name: String, colorName: StudyColorName, parentFolderID: UUID?) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let id, let index = snapshot.cardSets.firstIndex(where: { $0.id == id }) {
            snapshot.cardSets[index].name = trimmedName
            snapshot.cardSets[index].colorName = colorName
            snapshot.cardSets[index].parentFolderID = parentFolderID
            snapshot.cardSets[index].updatedAt = .now
        } else {
            snapshot.cardSets.append(
                StudyCardSet(name: trimmedName, colorName: colorName, parentFolderID: parentFolderID)
            )
        }
        saveSilently()
    }

    func deleteCardSet(id: UUID) {
        snapshot.cardSets.removeAll { $0.id == id }
        snapshot.cards.removeAll { $0.cardSetID == id }
        saveSilently()
    }

    func upsertCard(
        id: UUID?,
        cardSetID: UUID,
        title: String,
        frontText: String,
        backText: String,
        tagIDs: [UUID],
        flags: Set<CardFlag>
    ) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFront = frontText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBack = backText.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedTitle.isEmpty else { return }
        guard !trimmedFront.isEmpty || !trimmedBack.isEmpty else { return }

        if let id, let index = snapshot.cards.firstIndex(where: { $0.id == id }) {
            snapshot.cards[index].title = trimmedTitle
            snapshot.cards[index].frontText = trimmedFront
            snapshot.cards[index].backText = trimmedBack
            snapshot.cards[index].tagIDs = Array(Set(tagIDs)).sorted { $0.uuidString < $1.uuidString }
            snapshot.cards[index].flags = flags
            snapshot.cards[index].updatedAt = .now
        } else {
            snapshot.cards.append(
                StudyCard(
                    cardSetID: cardSetID,
                    title: trimmedTitle,
                    frontText: trimmedFront,
                    backText: trimmedBack,
                    tagIDs: Array(Set(tagIDs)).sorted { $0.uuidString < $1.uuidString },
                    flags: flags
                )
            )
        }
        saveSilently()
    }

    func deleteCard(id: UUID) {
        snapshot.cards.removeAll { $0.id == id }
        saveSilently()
    }

    func upsertTag(id: UUID?, name: String, colorName: StudyColorName) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let id, let index = snapshot.tags.firstIndex(where: { $0.id == id }) {
            snapshot.tags[index].name = trimmedName
            snapshot.tags[index].colorName = colorName
            snapshot.tags[index].updatedAt = .now
        } else {
            snapshot.tags.append(StudyTag(name: trimmedName, colorName: colorName))
        }
        saveSilently()
    }

    func deleteTag(id: UUID) {
        snapshot.tags.removeAll { $0.id == id }
        for index in snapshot.cards.indices {
            snapshot.cards[index].tagIDs.removeAll { $0 == id }
        }
        saveSilently()
    }

    func replaceSnapshot(with snapshot: StudySnapshot) {
        self.snapshot = snapshot
        saveSilently()
    }

    func resetToSample() {
        snapshot = .sample
        saveSilently()
    }

    func snapshotData() throws -> Data {
        try encoder.encode(snapshot)
    }

    func importSnapshot(from data: Data) throws {
        let imported = try decoder.decode(StudySnapshot.self, from: data)
        snapshot = imported
        try persist()
    }

    private func collectDescendantFolderIDs(parentID: UUID) -> [UUID] {
        let directChildren = snapshot.folders.filter { $0.parentID == parentID }.map(\.id)
        var allChildren = directChildren
        for childID in directChildren {
            allChildren.append(contentsOf: collectDescendantFolderIDs(parentID: childID))
        }
        return allChildren
    }

    private func saveSilently() {
        do {
            try persist()
            lastErrorMessage = nil
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    private func persist() throws {
        let data = try encoder.encode(snapshot)
        try data.write(to: storageURL, options: .atomic)
    }
}
#endif