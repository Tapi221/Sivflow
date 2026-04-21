import Foundation

protocol StudyBrowsingService {
    func listFolders() -> [StudyFolder]
    func listCardSets(folderId: String?) -> [StudyCardSet]
    func listCards(cardSetId: String) -> [StudyCard]
    func card(withId id: String) -> StudyCard?
}

struct InMemoryStudyBrowsingService: StudyBrowsingService {
    private let snapshot: StudySnapshot

    init(snapshot: StudySnapshot) {
        self.snapshot = snapshot
    }

    func listFolders() -> [StudyFolder] {
        snapshot.folders.sorted {
            if $0.orderIndex == $1.orderIndex {
                return $0.folderName.localizedCaseInsensitiveCompare($1.folderName) == .orderedAscending
            }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func listCardSets(folderId: String?) -> [StudyCardSet] {
        snapshot.cardSets
            .filter { $0.folderId == folderId }
            .sorted {
                if $0.orderIndex == $1.orderIndex {
                    return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
                }
                return $0.orderIndex < $1.orderIndex
            }
    }

    func listCards(cardSetId: String) -> [StudyCard] {
        snapshot.cards
            .filter { $0.cardSetId == cardSetId }
            .sorted {
                if $0.orderIndex == $1.orderIndex {
                    return $0.questionNumber.localizedCaseInsensitiveCompare($1.questionNumber) == .orderedAscending
                }
                return $0.orderIndex < $1.orderIndex
            }
    }

    func card(withId id: String) -> StudyCard? {
        snapshot.cards.first(where: { $0.id == id })
    }
}
