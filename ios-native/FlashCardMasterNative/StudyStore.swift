import Foundation

#if canImport(Combine)
import Combine

extension Notification.Name {
    static let studyStoreDidPersist = Notification.Name("StudyStore.didPersist")
}

struct DirectoryEntry: Identifiable, Hashable {
    enum Kind: String {
        case folder
        case cardSet
        case tag
    }

    let id: String
    let kind: Kind
    let title: String
    let subtitle: String
}

@MainActor
final class StudyStore: ObservableObject {
    @Published private(set) var snapshot: StudySnapshot
    @Published var lastErrorMessage: String?

    private let storageURL: URL
    private let appDirectoryURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(storageURL: URL? = nil) {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let folderURL = appSupport.appendingPathComponent("FlashCardMasterNative", isDirectory: true)
        try? FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
        self.appDirectoryURL = folderURL
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

    var activeCards: [StudyCard] {
        snapshot.cards
            .filter { !$0.isDeleted }
            .sorted(by: sortCards)
    }

    var deletedCards: [StudyCard] {
        snapshot.cards
            .filter { $0.isDeleted }
            .sorted { ($0.deletedAt ?? .distantPast) > ($1.deletedAt ?? .distantPast) }
    }

    var cardsWithImages: [StudyCard] {
        activeCards.filter { !($0.imageURL?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true) }
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
        activeCards.filter { $0.cardSetID == cardSetID }
    }

    func allCardsIncludingDeleted(in cardSetID: UUID) -> [StudyCard] {
        snapshot.cards.filter { $0.cardSetID == cardSetID }.sorted(by: sortCards)
    }

    func cards(forTag tagID: UUID) -> [StudyCard] {
        activeCards.filter { $0.tagIDs.contains(tagID) }
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
        snapshot.cards.count { $0.cardSetID == cardSetID && !$0.isDeleted }
    }

    func deletedCardCount(in cardSetID: UUID) -> Int {
        snapshot.cards.count { $0.cardSetID == cardSetID && $0.isDeleted }
    }

    func tagUsageCount(tagID: UUID) -> Int {
        activeCards.count { $0.tagIDs.contains(tagID) }
    }

    func matchingCards(filter: SearchFilter) -> [StudyCard] {
        activeCards.filter { filter.matches(card: $0) }
    }

    func dueCards(referenceDate: Date = .now) -> [StudyCard] {
        activeCards.filter { ($0.nextReviewAt ?? .distantFuture) <= referenceDate }
    }

    func upcomingCards(daysAhead: Int = 7) -> [StudyCard] {
        guard let end = Calendar.current.date(byAdding: .day, value: daysAhead, to: .now) else {
            return []
        }
        return activeCards.filter {
            guard let nextReviewAt = $0.nextReviewAt else { return false }
            return nextReviewAt >= Calendar.current.startOfDay(for: .now) && nextReviewAt <= end
        }
    }

    func cardsForCalendarDay(_ date: Date) -> [StudyCard] {
        activeCards.filter {
            guard let nextReviewAt = $0.nextReviewAt else { return false }
            return Calendar.current.isDate(nextReviewAt, inSameDayAs: date)
        }
    }

    func studyQueue(mode: StudyQueueMode) -> [StudyCard] {
        switch mode {
        case .due:
            return dueCards()
        case .all:
            return activeCards
        case .needsWork:
            return activeCards.filter { $0.flags.contains(.draft) || $0.flags.contains(.uncertain) }
        }
    }

    func directoryEntries() -> [DirectoryEntry] {
        let folderEntries = folders.map { folder in
            DirectoryEntry(
                id: "folder-\(folder.id.uuidString)",
                kind: .folder,
                title: folder.name,
                subtitle: "\(childFolderCount(for: folder.id)) folders • \(cardSetCount(in: folder.id)) sets"
            )
        }
        let cardSetEntries = cardSets.map { cardSet in
            DirectoryEntry(
                id: "cardset-\(cardSet.id.uuidString)",
                kind: .cardSet,
                title: cardSet.name,
                subtitle: "\(cardCount(in: cardSet.id)) cards"
            )
        }
        let tagEntries = tags.map { tag in
            DirectoryEntry(
                id: "tag-\(tag.id.uuidString)",
                kind: .tag,
                title: tag.name,
                subtitle: "\(tagUsageCount(tagID: tag.id)) cards"
            )
        }
        return folderEntries + cardSetEntries + tagEntries
    }

    func dictionaryTerms() -> [(term: String, detail: String)] {
        var items: [(String, String)] = []
        for tag in tags {
            items.append((tag.name, "Tag • used on \(tagUsageCount(tagID: tag.id)) cards"))
        }
        for cardSet in cardSets {
            items.append((cardSet.name, "Card Set • \(cardCount(in: cardSet.id)) cards"))
        }
        for card in activeCards.prefix(40) {
            items.append((card.title, firstNonEmptyText(from: [card.frontText, card.noteText, card.backText])))
        }
        return items.sorted { $0.0.localizedCaseInsensitiveCompare($1.0) == .orderedAscending }
    }

    func questions() -> [StudyCard] {
        activeCards.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    func tagMapRows() -> [(tag: StudyTag, cardSets: [StudyCardSet], count: Int)] {
        tags.map { tag in
            let cards = cards(forTag: tag.id)
            let sets = Array(Set(cards.compactMap { cardSet(id: $0.cardSetID) }))
                .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            return (tag, sets, cards.count)
        }
        .sorted { $0.tag.name.localizedCaseInsensitiveCompare($1.tag.name) == .orderedAscending }
    }

    func upsertFolder(id: UUID?, name: String, colorName: StudyColorName, parentID: UUID?) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let id, let index = snapshot.folders.firstIndex(where: { $0.id == id }) {
            snapshot.folders[index].name = trimmedName
            snapshot.folders[index].colorName = colorName
            snapshot.folders[index].parentID = parentID
            snapshot.folders[index].updatedAt = .now
            snapshot.syncState.deletedFolderTimestamps.removeValue(forKey: id.uuidString)
        } else {
            let folder = StudyFolder(name: trimmedName, colorName: colorName, parentID: parentID)
            snapshot.folders.append(folder)
            snapshot.syncState.deletedFolderTimestamps.removeValue(forKey: folder.id.uuidString)
        }
        saveSilently()
    }

    func deleteFolder(id: UUID) {
        let descendantIDs = collectDescendantFolderIDs(parentID: id)
        let allFolderIDs = Set(descendantIDs + [id])
        let cardSetIDs = snapshot.cardSets.filter { allFolderIDs.contains($0.parentFolderID ?? UUID()) }.map(\.id)

        let deletionDate = Date.now
        for folderID in allFolderIDs {
            snapshot.syncState.deletedFolderTimestamps[folderID.uuidString] = deletionDate
        }
        for cardSetID in cardSetIDs {
            snapshot.syncState.deletedCardSetTimestamps[cardSetID.uuidString] = deletionDate
        }
        snapshot.folders.removeAll { allFolderIDs.contains($0.id) }
        snapshot.cardSets.removeAll { cardSetIDs.contains($0.id) }
        for index in snapshot.cards.indices {
            if cardSetIDs.contains(snapshot.cards[index].cardSetID) {
                snapshot.cards[index].deletedAt = deletionDate
                snapshot.cards[index].updatedAt = deletionDate
            }
        }
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
            snapshot.syncState.deletedCardSetTimestamps.removeValue(forKey: id.uuidString)
        } else {
            let cardSet = StudyCardSet(name: trimmedName, colorName: colorName, parentFolderID: parentFolderID)
            snapshot.cardSets.append(cardSet)
            snapshot.syncState.deletedCardSetTimestamps.removeValue(forKey: cardSet.id.uuidString)
        }
        saveSilently()
    }

    func deleteCardSet(id: UUID) {
        let deletionDate = Date.now
        snapshot.syncState.deletedCardSetTimestamps[id.uuidString] = deletionDate
        snapshot.cardSets.removeAll { $0.id == id }
        for index in snapshot.cards.indices {
            if snapshot.cards[index].cardSetID == id {
                snapshot.cards[index].deletedAt = deletionDate
                snapshot.cards[index].updatedAt = deletionDate
            }
        }
        saveSilently()
    }

    func upsertCard(
        id: UUID?,
        cardSetID: UUID,
        title: String,
        frontText: String,
        backText: String,
        noteText: String,
        imageURL: String?,
        sourceURL: String?,
        pdfURL: String?,
        tagIDs: [UUID],
        flags: Set<CardFlag>,
        nextReviewAt: Date?
    ) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFront = frontText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBack = backText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedNote = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedImageURL = normalizedOptionalString(imageURL)
        let normalizedSourceURL = normalizedOptionalString(sourceURL)
        let normalizedPDFURL = normalizedOptionalString(pdfURL)

        guard !trimmedTitle.isEmpty else { return }
        guard !trimmedFront.isEmpty || !trimmedBack.isEmpty else { return }

        if let id, let index = snapshot.cards.firstIndex(where: { $0.id == id }) {
            snapshot.cards[index].title = trimmedTitle
            snapshot.cards[index].frontText = trimmedFront
            snapshot.cards[index].backText = trimmedBack
            snapshot.cards[index].noteText = trimmedNote
            snapshot.cards[index].imageURL = normalizedImageURL
            snapshot.cards[index].sourceURL = normalizedSourceURL
            snapshot.cards[index].pdfURL = normalizedPDFURL
            snapshot.cards[index].tagIDs = Array(Set(tagIDs)).sorted { $0.uuidString < $1.uuidString }
            snapshot.cards[index].flags = flags
            snapshot.cards[index].nextReviewAt = nextReviewAt
            snapshot.cards[index].deletedAt = nil
            snapshot.cards[index].updatedAt = .now
            snapshot.syncState.deletedCardTimestamps.removeValue(forKey: id.uuidString)
        } else {
            let card = StudyCard(
                cardSetID: cardSetID,
                title: trimmedTitle,
                frontText: trimmedFront,
                backText: trimmedBack,
                noteText: trimmedNote,
                imageURL: normalizedImageURL,
                sourceURL: normalizedSourceURL,
                pdfURL: normalizedPDFURL,
                tagIDs: Array(Set(tagIDs)).sorted { $0.uuidString < $1.uuidString },
                flags: flags,
                nextReviewAt: nextReviewAt
            )
            snapshot.cards.append(card)
            snapshot.syncState.deletedCardTimestamps.removeValue(forKey: card.id.uuidString)
        }
        saveSilently()
    }


    func createCardSet(name: String, colorName: StudyColorName = .blue, parentFolderID: UUID? = nil) -> UUID {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedName = trimmedName.isEmpty ? "Imported" : trimmedName
        let cardSet = StudyCardSet(name: resolvedName, colorName: colorName, parentFolderID: parentFolderID)
        snapshot.cardSets.append(cardSet)
        snapshot.syncState.deletedCardSetTimestamps.removeValue(forKey: cardSet.id.uuidString)
        saveSilently()
        return cardSet.id
    }

    func copyImportedFile(from externalURL: URL, preferredFileName: String? = nil) throws -> String {
        let attachmentsURL = appDirectoryURL.appendingPathComponent("Attachments", isDirectory: true)
        try FileManager.default.createDirectory(at: attachmentsURL, withIntermediateDirectories: true)
        let sanitizedBaseName = preferredFileName?.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedName = (sanitizedBaseName?.isEmpty == false ? sanitizedBaseName! : externalURL.deletingPathExtension().lastPathComponent)
        let ext = externalURL.pathExtension.isEmpty ? "bin" : externalURL.pathExtension
        let targetURL = attachmentsURL.appendingPathComponent("\(resolvedName)-\(UUID().uuidString).\(ext)")
        if FileManager.default.fileExists(atPath: targetURL.path) {
            try FileManager.default.removeItem(at: targetURL)
        }
        try FileManager.default.copyItem(at: externalURL, to: targetURL)
        return targetURL.absoluteString
    }

    func importXLSXWorkbook(from data: Data, fileName: String) throws -> String {
        let result = try XLSXImportService.importWorkbook(data: data, fileName: fileName)
        let cardSetID = createCardSet(name: result.cardSetName, colorName: .amber, parentFolderID: nil)
        for card in result.cards {
            upsertCard(
                id: nil,
                cardSetID: cardSetID,
                title: card.title,
                frontText: card.frontText,
                backText: card.backText,
                noteText: card.noteText,
                imageURL: card.imageURL,
                sourceURL: card.sourceURL,
                pdfURL: card.pdfURL,
                tagIDs: [],
                flags: [],
                nextReviewAt: nil
            )
        }
        let warningSuffix = result.warnings.isEmpty ? "" : " Warnings: \(result.warnings.prefix(3).joined(separator: " | "))"
        lastErrorMessage = "Imported \(result.cards.count) cards from XLSX into \(result.cardSetName).\(warningSuffix)"
        return result.cardSetName
    }

    func softDeleteCard(id: UUID) {
        guard let index = snapshot.cards.firstIndex(where: { $0.id == id }) else { return }
        snapshot.cards[index].deletedAt = .now
        snapshot.cards[index].updatedAt = .now
        saveSilently()
    }

    func restoreCard(id: UUID) {
        guard let index = snapshot.cards.firstIndex(where: { $0.id == id }) else { return }
        snapshot.cards[index].deletedAt = nil
        snapshot.cards[index].updatedAt = .now
        saveSilently()
    }

    func permanentlyDeleteCard(id: UUID) {
        snapshot.cards.removeAll { $0.id == id }
        snapshot.syncState.deletedCardTimestamps[id.uuidString] = .now
        saveSilently()
    }

    func emptyTrash() {
        let deletionDate = Date.now
        for card in snapshot.cards where card.isDeleted {
            snapshot.syncState.deletedCardTimestamps[card.id.uuidString] = deletionDate
        }
        snapshot.cards.removeAll { $0.isDeleted }
        saveSilently()
    }

    func deleteTag(id: UUID) {
        snapshot.tags.removeAll { $0.id == id }
        snapshot.syncState.deletedTagTimestamps[id.uuidString] = .now
        for index in snapshot.cards.indices {
            snapshot.cards[index].tagIDs.removeAll { $0 == id }
        }
        saveSilently()
    }

    func upsertTag(id: UUID?, name: String, colorName: StudyColorName) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let id, let index = snapshot.tags.firstIndex(where: { $0.id == id }) {
            snapshot.tags[index].name = trimmedName
            snapshot.tags[index].colorName = colorName
            snapshot.tags[index].updatedAt = .now
            snapshot.syncState.deletedTagTimestamps.removeValue(forKey: id.uuidString)
        } else {
            let tag = StudyTag(name: trimmedName, colorName: colorName)
            snapshot.tags.append(tag)
            snapshot.syncState.deletedTagTimestamps.removeValue(forKey: tag.id.uuidString)
        }
        saveSilently()
    }

    func markReviewed(cardID: UUID, grade: StudyReviewGrade) {
        guard let index = snapshot.cards.firstIndex(where: { $0.id == cardID }) else { return }
        let now = Date.now
        snapshot.cards[index].lastStudiedAt = now
        snapshot.cards[index].updatedAt = now
        snapshot.cards[index].studyCount += 1
        snapshot.cards[index].deletedAt = nil
        snapshot.cards[index].nextReviewAt = Calendar.current.date(byAdding: .day, value: grade.intervalDays, to: now)
        switch grade {
        case .again:
            snapshot.cards[index].flags.insert(.uncertain)
        case .hard:
            snapshot.cards[index].flags.insert(.uncertain)
            snapshot.cards[index].flags.remove(.complete)
        case .good:
            snapshot.cards[index].flags.remove(.draft)
        case .easy:
            snapshot.cards[index].flags.remove(.draft)
            snapshot.cards[index].flags.remove(.uncertain)
            snapshot.cards[index].flags.insert(.complete)
        }
        saveSilently()
    }

    func replaceSnapshot(with snapshot: StudySnapshot) {
        self.snapshot = snapshot
        saveSilently()
    }

    func replaceSnapshotFromCloudMerge(with snapshot: StudySnapshot) {
        var mergedSnapshot = snapshot
        mergedSnapshot.version = max(mergedSnapshot.version, StudySnapshot.currentVersion)
        self.snapshot = mergedSnapshot
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
        snapshot.version = max(snapshot.version, StudySnapshot.currentVersion)
        let data = try encoder.encode(snapshot)
        try data.write(to: storageURL, options: .atomic)
        NotificationCenter.default.post(
            name: .studyStoreDidPersist,
            object: self,
            userInfo: ["snapshotData": data]
        )
    }

    private func sortCards(_ lhs: StudyCard, _ rhs: StudyCard) -> Bool {
        let lhsDate = lhs.nextReviewAt ?? lhs.updatedAt
        let rhsDate = rhs.nextReviewAt ?? rhs.updatedAt
        if lhsDate == rhsDate {
            return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
        }
        return lhsDate < rhsDate
    }

    private func normalizedOptionalString(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func firstNonEmptyText(from values: [String]) -> String {
        for value in values {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                return trimmed
            }
        }
        return ""
    }
}

enum StudyQueueMode: String, CaseIterable, Identifiable {
    case due
    case all
    case needsWork

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .due: return "Due"
        case .all: return "All"
        case .needsWork: return "Needs Work"
        }
    }
}

enum StudyReviewGrade: String, CaseIterable, Identifiable {
    case again
    case hard
    case good
    case easy

    var id: String { rawValue }

    var intervalDays: Int {
        switch self {
        case .again: return 0
        case .hard: return 1
        case .good: return 3
        case .easy: return 7
        }
    }

    var displayName: String {
        switch self {
        case .again: return "Again"
        case .hard: return "Hard"
        case .good: return "Good"
        case .easy: return "Easy"
        }
    }
}
#endif
