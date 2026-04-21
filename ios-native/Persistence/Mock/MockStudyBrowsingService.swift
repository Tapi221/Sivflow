import Foundation

struct MockStudyBrowsingService: StudyBrowsingService {
    private let backingService: InMemoryStudyBrowsingService

    init() {
        let snapshot = StudySnapshot(
            metadata: StudySnapshotMetadata(
                schemaVersion: 3,
                generationCounter: 1,
                createdAt: "2026-04-21T00:00:00Z",
                appVersion: "1.0.0",
                userId: "mock-user"
            ),
            folders: [
                StudyFolder(
                    id: "folder-1",
                    folderId: "folder-1",
                    folderName: "Algorithms",
                    folderColor: "indigo",
                    parentFolderId: nil,
                    cloudSyncEnabled: false,
                    orderIndex: 0
                )
            ],
            cardSets: [
                StudyCardSet(
                    id: "cardset-1",
                    folderId: "folder-1",
                    name: "Sorting",
                    descriptionText: "read-only MVP 用の mock データ",
                    orderIndex: 0,
                    defaultDisplayMode: "fixed"
                )
            ],
            cards: [
                StudyCard(
                    id: "card-1",
                    cardSetId: "cardset-1",
                    folderId: "folder-1",
                    questionNumber: "Q1",
                    title: "Quick Sort",
                    orderIndex: 0,
                    tagIds: ["tag-algo"],
                    front: StudyCardFace(blocks: [
                        StudyCardBlock(
                            id: "block-1",
                            type: .text,
                            orderIndex: 0,
                            content: "Quick Sort の平均計算量は？",
                            markdown: nil,
                            questionTitle: nil,
                            questionAnswer: nil,
                            imageAssetSummary: nil,
                            referenceSummary: nil,
                            mathLatex: nil,
                            codeText: nil
                        )
                    ]),
                    back: StudyCardFace(blocks: [
                        StudyCardBlock(
                            id: "block-2",
                            type: .text,
                            orderIndex: 0,
                            content: "平均 O(n log n)",
                            markdown: nil,
                            questionTitle: nil,
                            questionAnswer: nil,
                            imageAssetSummary: nil,
                            referenceSummary: nil,
                            mathLatex: nil,
                            codeText: nil
                        )
                    ]),
                    isDraft: false,
                    hasUncertainty: false,
                    isCompleted: false,
                    isSilent: false
                )
            ],
            tags: [
                StudyTag(id: "tag-algo", name: "algorithm", color: "indigo")
            ]
        )
        backingService = InMemoryStudyBrowsingService(snapshot: snapshot)
    }

    func listFolders() -> [StudyFolder] {
        backingService.listFolders()
    }

    func listCardSets(folderId: String?) -> [StudyCardSet] {
        backingService.listCardSets(folderId: folderId)
    }

    func listCards(cardSetId: String) -> [StudyCard] {
        backingService.listCards(cardSetId: cardSetId)
    }

    func card(withId id: String) -> StudyCard? {
        backingService.card(withId: id)
    }
}
