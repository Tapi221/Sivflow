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
                ),
                StudyFolder(
                    id: "folder-2",
                    folderId: "folder-2",
                    folderName: "Dynamic Programming",
                    folderColor: "green",
                    parentFolderId: "folder-1",
                    cloudSyncEnabled: false,
                    orderIndex: 1
                )
            ],
            cardSets: [
                StudyCardSet(
                    id: "cardset-1",
                    folderId: "folder-1",
                    name: "Sorting",
                    descriptionText: "read-only native mock data",
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
                            questionTitle: nil,
                            questionAnswer: nil,
                            content: "Quick Sort の平均計算量は？",
                            markdown: nil,
                            code: nil,
                            images: [],
                            audios: [],
                            references: [],
                            math: nil
                        )
                    ]),
                    back: StudyCardFace(blocks: [
                        StudyCardBlock(
                            id: "block-2",
                            type: .markdown,
                            orderIndex: 0,
                            questionTitle: nil,
                            questionAnswer: nil,
                            content: nil,
                            markdown: "平均 **O(n log n)**",
                            code: nil,
                            images: [],
                            audios: [],
                            references: [],
                            math: nil
                        ),
                        StudyCardBlock(
                            id: "block-3",
                            type: .code,
                            orderIndex: 1,
                            questionTitle: nil,
                            questionAnswer: nil,
                            content: nil,
                            markdown: nil,
                            code: StudyCodeBlock(language: "swift", code: "let pivot = items[count / 2]"),
                            images: [],
                            audios: [],
                            references: [],
                            math: nil
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
            ],
            assets: [],
            assetBaseDirectoryURL: nil
        )
        backingService = InMemoryStudyBrowsingService(snapshot: snapshot)
    }

    var metadata: StudySnapshotMetadata { backingService.metadata }
    var assetBaseDirectoryURL: URL? { backingService.assetBaseDirectoryURL }

    func listFolders(parentFolderId: String?) -> [StudyFolder] {
        backingService.listFolders(parentFolderId: parentFolderId)
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

    func tags(for ids: [String]) -> [StudyTag] {
        backingService.tags(for: ids)
    }

    func asset(for id: String) -> StudyAsset? {
        backingService.asset(for: id)
    }

    func resolveImageSource(for image: StudyImageReference) -> StudyResolvedImageSource? {
        backingService.resolveImageSource(for: image)
    }
}
