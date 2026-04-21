import Foundation

struct StudySnapshot: Equatable {
    let metadata: StudySnapshotMetadata
    let folders: [StudyFolder]
    let cardSets: [StudyCardSet]
    let cards: [StudyCard]
    let tags: [StudyTag]
    let assets: [StudyAsset]
    let assetBaseDirectoryURL: URL?
}

struct StudySnapshotMetadata: Equatable {
    let schemaVersion: Int
    let generationCounter: Int
    let createdAt: String
    let appVersion: String
    let userId: String
}

struct StudyFolder: Identifiable, Hashable {
    let id: String
    let folderId: String
    let folderName: String
    let folderColor: String?
    let parentFolderId: String?
    let cloudSyncEnabled: Bool
    let orderIndex: Int
}

struct StudyCardSet: Identifiable, Hashable {
    let id: String
    let folderId: String?
    let name: String
    let descriptionText: String?
    let orderIndex: Int
    let defaultDisplayMode: String
}

struct StudyCard: Identifiable, Hashable {
    let id: String
    let cardSetId: String
    let folderId: String?
    let questionNumber: String
    let title: String?
    let orderIndex: Int
    let tagIds: [String]
    let front: StudyCardFace
    let back: StudyCardFace
    let isDraft: Bool
    let hasUncertainty: Bool
    let isCompleted: Bool
    let isSilent: Bool

    var displayTitle: String {
        if let title, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return title
        }

        if let firstFrontText = front.blocks.compactMap(\.primaryText).first(where: { !$0.isEmpty }) {
            return firstFrontText
        }

        return "Untitled Card"
    }

    var badges: [String] {
        var result: [String] = []
        if isDraft { result.append("Draft") }
        if hasUncertainty { result.append("Uncertain") }
        if isCompleted { result.append("Done") }
        if isSilent { result.append("Silent") }
        return result
    }
}

struct StudyCardFace: Hashable {
    let blocks: [StudyCardBlock]
}

struct StudyCardBlock: Identifiable, Hashable {
    enum BlockType: String, Hashable {
        case text
        case question
        case code
        case image
        case audio
        case reference
        case math
        case markdown
    }

    let id: String
    let type: BlockType
    let orderIndex: Int
    let questionTitle: String?
    let questionAnswer: String?
    let content: String?
    let markdown: String?
    let code: StudyCodeBlock?
    let images: [StudyImageReference]
    let audios: [StudyAudioReference]
    let references: [StudyReference]
    let math: StudyMathBlock?

    var primaryText: String? {
        switch type {
        case .text:
            return normalized(content)
        case .markdown:
            return normalized(markdown ?? content)
        case .question:
            return normalized(questionTitle)
        case .code:
            return normalized(code?.code ?? content)
        case .image:
            return normalized(images.first?.displayLabel)
        case .audio:
            return normalized(audios.first?.filename ?? audios.first?.url)
        case .reference:
            return normalized(references.first?.displayLabel)
        case .math:
            return normalized(math?.latex ?? content)
        }
    }

    private func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

struct StudyCodeBlock: Hashable {
    let language: String?
    let code: String
}

struct StudyMathBlock: Hashable {
    let latex: String
    let displayMode: DisplayMode
    let note: String?

    enum DisplayMode: String, Hashable {
        case block
        case inline
    }
}

struct StudyImageReference: Identifiable, Hashable {
    let id: String
    let assetId: String?
    let localURLString: String?
    let remoteURLString: String?
    let genericURLString: String?
    let storagePath: String?
    let thumbnailURLString: String?
    let naturalWidth: Double?
    let naturalHeight: Double?

    var displayLabel: String {
        assetId
        ?? storagePath
        ?? remoteURLString
        ?? localURLString
        ?? genericURLString
        ?? id
    }
}

struct StudyAudioReference: Identifiable, Hashable {
    let id: String
    let url: String
    let filename: String
    let order: Int
}

struct StudyReference: Identifiable, Hashable {
    let id: String
    let url: String
    let name: String?

    var displayLabel: String {
        if let name, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return name
        }
        return url
    }
}

struct StudyTag: Identifiable, Hashable {
    let id: String
    let name: String
    let color: String
}

struct StudyAsset: Identifiable, Hashable {
    let id: String
    let storagePath: String
    let mime: String
    let naturalWidth: Double?
    let naturalHeight: Double?
    let createdAt: String
    let updatedAt: String
}

enum StudyResolvedImageSource: Equatable {
    case inlineData(Data)
    case file(URL)
    case remote(URL)
}
