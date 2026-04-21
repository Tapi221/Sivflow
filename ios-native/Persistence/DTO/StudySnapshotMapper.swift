import Foundation

enum StudySnapshotMapper {
    static let map = { (dto: SnapshotDTO) -> StudySnapshot in
        let metadata = StudySnapshotMetadata(
            schemaVersion: dto.metadata.schemaVersion,
            generationCounter: dto.metadata.generationCounter,
            createdAt: dto.metadata.createdAt,
            appVersion: dto.metadata.appVersion,
            userId: dto.metadata.userId
        )

        let folders = dto.data.folders
            .filter { !$0.isDeleted }
            .map {
                StudyFolder(
                    id: $0.id,
                    folderId: $0.folderId,
                    folderName: $0.folderName,
                    folderColor: $0.folderColor,
                    parentFolderId: $0.parentFolderId,
                    cloudSyncEnabled: $0.cloudSyncEnabled ?? false,
                    orderIndex: $0.orderIndex ?? 0
                )
            }

        let cardSets = dto.data.cardSets
            .filter { !$0.isDeleted }
            .map {
                StudyCardSet(
                    id: $0.id,
                    folderId: $0.folderId,
                    name: $0.name,
                    descriptionText: $0.description,
                    orderIndex: $0.orderIndex ?? 0,
                    defaultDisplayMode: $0.defaultDisplayMode ?? "fixed"
                )
            }

        let cards = dto.data.cards
            .filter { !$0.isDeleted }
            .map {
                StudyCard(
                    id: $0.id,
                    cardSetId: $0.cardSetId,
                    folderId: $0.folderId,
                    questionNumber: $0.questionNumber,
                    title: $0.title,
                    orderIndex: $0.orderIndex ?? 0,
                    tagIds: $0.tagIds ?? [],
                    front: mapFace($0.front),
                    back: mapFace($0.back),
                    isDraft: $0.isDraft ?? false,
                    hasUncertainty: $0.hasUncertainty ?? false,
                    isCompleted: $0.isCompleted ?? false,
                    isSilent: $0.isSilent ?? false
                )
            }

        let tags = dto.data.tagRecords
            .filter { !($0.isDeleted ?? false) }
            .map {
                StudyTag(
                    id: $0.id,
                    name: $0.name,
                    color: $0.color
                )
            }

        return StudySnapshot(
            metadata: metadata,
            folders: folders,
            cardSets: cardSets,
            cards: cards,
            tags: tags
        )
    }

    private static let mapFace = { (face: CardFaceDTO) -> StudyCardFace in
        StudyCardFace(
            blocks: face.blocks
                .sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
                .map(mapBlock)
        )
    }

    private static let mapBlock = { (block: CardBlockDTO) -> StudyCardBlock in
        let type = StudyCardBlock.BlockType(rawValue: block.type) ?? .text
        let imageSummary = block.images?
            .map { image -> String in
                image.assetId ?? image.remoteUrl ?? image.localUrl ?? image.id
            }
            .joined(separator: ", ")
        let referenceSummary = block.references?
            .map { $0.name ?? $0.url }
            .joined(separator: ", ")

        return StudyCardBlock(
            id: block.id,
            type: type,
            orderIndex: block.orderIndex ?? 0,
            content: block.content,
            markdown: block.markdown,
            questionTitle: block.questionTitle,
            questionAnswer: block.questionAnswer,
            imageAssetSummary: imageSummary,
            referenceSummary: referenceSummary,
            mathLatex: block.math?.latex,
            codeText: block.code?.code
        )
    }
}
