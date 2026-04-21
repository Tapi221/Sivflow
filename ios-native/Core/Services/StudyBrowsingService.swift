import Foundation

protocol StudyBrowsingService {
    var metadata: StudySnapshotMetadata { get }
    var assetBaseDirectoryURL: URL? { get }

    func listFolders(parentFolderId: String?) -> [StudyFolder]
    func listCardSets(folderId: String?) -> [StudyCardSet]
    func listCards(cardSetId: String) -> [StudyCard]
    func card(withId id: String) -> StudyCard?
    func tags(for ids: [String]) -> [StudyTag]
    func asset(for id: String) -> StudyAsset?
    func resolveImageSource(for image: StudyImageReference) -> StudyResolvedImageSource?
}

struct InMemoryStudyBrowsingService: StudyBrowsingService {
    let metadata: StudySnapshotMetadata
    let assetBaseDirectoryURL: URL?

    private let folders: [StudyFolder]
    private let cardSets: [StudyCardSet]
    private let cards: [StudyCard]
    private let tagById: [String: StudyTag]
    private let assetById: [String: StudyAsset]
    private let cardById: [String: StudyCard]

    init(snapshot: StudySnapshot) {
        self.metadata = snapshot.metadata
        self.assetBaseDirectoryURL = snapshot.assetBaseDirectoryURL
        self.folders = snapshot.folders
        self.cardSets = snapshot.cardSets
        self.cards = snapshot.cards
        self.tagById = Dictionary(uniqueKeysWithValues: snapshot.tags.map { ($0.id, $0) })
        self.assetById = Dictionary(uniqueKeysWithValues: snapshot.assets.map { ($0.id, $0) })
        self.cardById = Dictionary(uniqueKeysWithValues: snapshot.cards.map { ($0.id, $0) })
    }

    func listFolders(parentFolderId: String?) -> [StudyFolder] {
        folders
            .filter { $0.parentFolderId == parentFolderId }
            .sorted(by: folderSort)
    }

    func listCardSets(folderId: String?) -> [StudyCardSet] {
        cardSets
            .filter { $0.folderId == folderId }
            .sorted(by: cardSetSort)
    }

    func listCards(cardSetId: String) -> [StudyCard] {
        cards
            .filter { $0.cardSetId == cardSetId }
            .sorted(by: cardSort)
    }

    func card(withId id: String) -> StudyCard? {
        cardById[id]
    }

    func tags(for ids: [String]) -> [StudyTag] {
        ids.compactMap { tagById[$0] }
    }

    func asset(for id: String) -> StudyAsset? {
        assetById[id]
    }

    func resolveImageSource(for image: StudyImageReference) -> StudyResolvedImageSource? {
        if let inlineData = decodeDataURL(image.localURLString)
            ?? decodeDataURL(image.remoteURLString)
            ?? decodeDataURL(image.genericURLString)
            ?? decodeDataURL(image.thumbnailURLString) {
            return .inlineData(inlineData)
        }

        for candidate in [image.localURLString, image.genericURLString, image.remoteURLString, image.thumbnailURLString] {
            if let resolved = resolveURLCandidate(candidate) {
                return resolved
            }
        }

        if let storagePath = image.storagePath,
           let fileURL = resolveStoragePath(storagePath) {
            return .file(fileURL)
        }

        if let assetId = image.assetId,
           let asset = assetById[assetId],
           let fileURL = resolveStoragePath(asset.storagePath) {
            return .file(fileURL)
        }

        return nil
    }

    private func resolveURLCandidate(_ rawValue: String?) -> StudyResolvedImageSource? {
        guard let rawValue else { return nil }
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if let url = URL(string: trimmed) {
            if url.isFileURL {
                return .file(url)
            }
            if let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme) {
                return .remote(url)
            }
        }

        let pathURL = URL(fileURLWithPath: trimmed)
        if FileManager.default.fileExists(atPath: pathURL.path) {
            return .file(pathURL)
        }

        return nil
    }

    private func resolveStoragePath(_ storagePath: String) -> URL? {
        let trimmed = storagePath.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if let baseURL = assetBaseDirectoryURL {
            let candidate = baseURL.appendingPathComponent(trimmed)
            if FileManager.default.fileExists(atPath: candidate.path) {
                return candidate
            }

            let lastPathComponent = URL(fileURLWithPath: trimmed).lastPathComponent
            let flattened = baseURL.appendingPathComponent(lastPathComponent)
            if FileManager.default.fileExists(atPath: flattened.path) {
                return flattened
            }
        }

        if let bundled = Bundle.main.url(forResource: URL(fileURLWithPath: trimmed).deletingPathExtension().lastPathComponent,
                                         withExtension: URL(fileURLWithPath: trimmed).pathExtension.isEmpty ? nil : URL(fileURLWithPath: trimmed).pathExtension) {
            return bundled
        }

        return nil
    }

    private func decodeDataURL(_ rawValue: String?) -> Data? {
        guard let rawValue else { return nil }
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("data:"),
              let commaIndex = trimmed.firstIndex(of: ",") else {
            return nil
        }

        let header = trimmed[..<commaIndex]
        let payload = trimmed[trimmed.index(after: commaIndex)...]
        if header.contains(";base64") {
            return Data(base64Encoded: String(payload))
        }
        return String(payload).data(using: .utf8)
    }

    private func folderSort(lhs: StudyFolder, rhs: StudyFolder) -> Bool {
        if lhs.orderIndex == rhs.orderIndex {
            return lhs.folderName.localizedCaseInsensitiveCompare(rhs.folderName) == .orderedAscending
        }
        return lhs.orderIndex < rhs.orderIndex
    }

    private func cardSetSort(lhs: StudyCardSet, rhs: StudyCardSet) -> Bool {
        if lhs.orderIndex == rhs.orderIndex {
            return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
        }
        return lhs.orderIndex < rhs.orderIndex
    }

    private func cardSort(lhs: StudyCard, rhs: StudyCard) -> Bool {
        if lhs.orderIndex == rhs.orderIndex {
            return lhs.questionNumber.localizedCaseInsensitiveCompare(rhs.questionNumber) == .orderedAscending
        }
        return lhs.orderIndex < rhs.orderIndex
    }
}
