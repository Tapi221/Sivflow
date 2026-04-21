import Foundation

enum StudySnapshotMapper {
    enum MapperError: LocalizedError {
        case emptyCardSetIdentifier(String)

        var errorDescription: String? {
            switch self {
            case .emptyCardSetIdentifier(let cardId):
                return "Card \(cardId) does not have a valid cardSetId."
            }
        }
    }

    static func map(dto: SnapshotDTO, assetBaseDirectoryURL: URL?) throws -> StudySnapshot {
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
                    folderId: normalized($0.folderId),
                    name: $0.name,
                    descriptionText: normalized($0.description),
                    orderIndex: $0.orderIndex ?? 0,
                    defaultDisplayMode: normalized($0.defaultDisplayMode) ?? "fixed"
                )
            }

        let cards = try dto.data.cards
            .filter { !$0.isDeleted }
            .map { cardDTO in
                guard !cardDTO.cardSetId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    throw MapperError.emptyCardSetIdentifier(cardDTO.id)
                }

                return StudyCard(
                    id: cardDTO.id,
                    cardSetId: cardDTO.cardSetId,
                    folderId: normalized(cardDTO.folderId),
                    questionNumber: cardDTO.questionNumber,
                    title: normalized(cardDTO.title),
                    orderIndex: cardDTO.orderIndex ?? 0,
                    tagIds: cardDTO.tagIds ?? [],
                    front: mapFace(cardDTO.front),
                    back: mapFace(cardDTO.back),
                    isDraft: cardDTO.isDraft ?? false,
                    hasUncertainty: cardDTO.hasUncertainty ?? false,
                    isCompleted: cardDTO.isCompleted ?? false,
                    isSilent: cardDTO.isSilent ?? false
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

        let assets = dto.data.assets.map {
            StudyAsset(
                id: $0.assetId,
                storagePath: $0.storagePath,
                mime: $0.mime,
                naturalWidth: $0.naturalW,
                naturalHeight: $0.naturalH,
                createdAt: $0.createdAt,
                updatedAt: $0.updatedAt
            )
        }

        return StudySnapshot(
            metadata: metadata,
            folders: folders,
            cardSets: cardSets,
            cards: cards,
            tags: tags,
            assets: assets,
            assetBaseDirectoryURL: assetBaseDirectoryURL
        )
    }

    private static func mapFace(_ face: CardFaceDTO) -> StudyCardFace {
        let baseBlocks = face.blocks.map(mapBlock)
        let attachmentStartOrder = (baseBlocks.map(\.orderIndex).max() ?? -1) + 1
        let attachmentBlocks = mapAttachments(face.attachments, startOrderIndex: attachmentStartOrder)

        return StudyCardFace(
            blocks: (baseBlocks + attachmentBlocks).sorted { lhs, rhs in
                if lhs.orderIndex == rhs.orderIndex {
                    return lhs.id.localizedCaseInsensitiveCompare(rhs.id) == .orderedAscending
                }
                return lhs.orderIndex < rhs.orderIndex
            }
        )
    }

    private static func mapBlock(_ block: CardBlockDTO) -> StudyCardBlock {
        let type = StudyCardBlock.BlockType(rawValue: block.type) ?? .text

        return StudyCardBlock(
            id: block.id,
            type: type,
            orderIndex: block.orderIndex ?? 0,
            questionTitle: normalized(block.questionTitle),
            questionAnswer: normalized(block.questionAnswer),
            content: normalized(block.content),
            markdown: normalized(block.markdown),
            code: mapCode(block.code),
            images: (block.images ?? []).map(mapImage),
            audios: (block.audios ?? []).map(mapAudio),
            references: (block.references ?? []).enumerated().map(mapReference),
            math: mapMath(block.math)
        )
    }

    private static func mapAttachments(
        _ attachments: CardFaceAttachmentsDTO?,
        startOrderIndex: Int
    ) -> [StudyCardBlock] {
        guard let attachments else { return [] }

        var nextOrder = startOrderIndex
        var blocks: [StudyCardBlock] = []

        if !attachments.images.isEmpty {
            blocks.append(
                StudyCardBlock(
                    id: "attachments-image-\(startOrderIndex)",
                    type: .image,
                    orderIndex: nextOrder,
                    questionTitle: nil,
                    questionAnswer: nil,
                    content: nil,
                    markdown: nil,
                    code: nil,
                    images: attachments.images.map(mapImage),
                    audios: [],
                    references: [],
                    math: nil
                )
            )
            nextOrder += 1
        }

        if !attachments.audios.isEmpty {
            blocks.append(
                StudyCardBlock(
                    id: "attachments-audio-\(nextOrder)",
                    type: .audio,
                    orderIndex: nextOrder,
                    questionTitle: nil,
                    questionAnswer: nil,
                    content: nil,
                    markdown: nil,
                    code: nil,
                    images: [],
                    audios: attachments.audios.map(mapAudio),
                    references: [],
                    math: nil
                )
            )
            nextOrder += 1
        }

        if !attachments.references.isEmpty {
            blocks.append(
                StudyCardBlock(
                    id: "attachments-reference-\(nextOrder)",
                    type: .reference,
                    orderIndex: nextOrder,
                    questionTitle: nil,
                    questionAnswer: nil,
                    content: nil,
                    markdown: nil,
                    code: nil,
                    images: [],
                    audios: [],
                    references: attachments.references.enumerated().map(mapReference),
                    math: nil
                )
            )
        }

        return blocks
    }

    private static func mapCode(_ dto: CodeBlockDTO?) -> StudyCodeBlock? {
        guard let dto, let code = normalized(dto.code) else {
            return nil
        }
        return StudyCodeBlock(language: normalized(dto.language), code: code)
    }

    private static func mapMath(_ dto: MathBlockDTO?) -> StudyMathBlock? {
        guard let dto, let latex = normalized(dto.latex) else {
            return nil
        }
        let displayMode = StudyMathBlock.DisplayMode(rawValue: normalized(dto.displayMode) ?? "block") ?? .block
        return StudyMathBlock(latex: latex, displayMode: displayMode, note: normalized(dto.note))
    }

    private static func mapImage(_ dto: UploadedImageDTO) -> StudyImageReference {
        StudyImageReference(
            id: dto.id,
            assetId: normalized(dto.assetId),
            localURLString: normalized(dto.localUrl),
            remoteURLString: normalized(dto.remoteUrl),
            genericURLString: normalized(dto.url),
            storagePath: normalized(dto.storagePath),
            thumbnailURLString: normalized(dto.thumbnailUrl),
            naturalWidth: dto.naturalW,
            naturalHeight: dto.naturalH
        )
    }

    private static func mapAudio(_ dto: AudioAttachmentDTO) -> StudyAudioReference {
        StudyAudioReference(
            id: "audio-\(dto.order)-\(dto.filename)",
            url: dto.url,
            filename: dto.filename,
            order: dto.order
        )
    }

    private static func mapReference(_ entry: (offset: Int, element: ReferenceBlockDTO)) -> StudyReference {
        StudyReference(
            id: "reference-\(entry.offset)-\(entry.element.url)",
            url: entry.element.url,
            name: normalized(entry.element.name)
        )
    }

    private static func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
