import Foundation

struct StudySnapshot: Equatable {
    let metadata: StudySnapshotMetadata
    let folders: [StudyFolder]
    let cardSets: [StudyCardSet]
    let cards: [StudyCard]
    let tags: [StudyTag]
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

        if let firstFrontText = front.blocks.first(where: { $0.primaryText != nil })?.primaryText,
           !firstFrontText.isEmpty {
            return firstFrontText
        }

        return "Untitled Card"
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
    let content: String?
    let markdown: String?
    let questionTitle: String?
    let questionAnswer: String?
    let imageAssetSummary: String?
    let referenceSummary: String?
    let mathLatex: String?
    let codeText: String?

    var primaryText: String? {
        switch type {
        case .text:
            return content
        case .markdown:
            return markdown ?? content
        case .question:
            return questionTitle
        case .code:
            return codeText ?? content
        case .image:
            return imageAssetSummary
        case .audio:
            return content
        case .reference:
            return referenceSummary ?? content
        case .math:
            return mathLatex ?? content
        }
    }
}

struct StudyTag: Identifiable, Hashable {
    let id: String
    let name: String
    let color: String
}
