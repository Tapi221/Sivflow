import Foundation

struct SnapshotDTO: Decodable {
    let metadata: SnapshotMetadataDTO
    let data: SnapshotDataDTO
}

struct SnapshotMetadataDTO: Decodable {
    let schemaVersion: Int
    let generationCounter: Int
    let createdAt: String
    let appVersion: String
    let userId: String
}

struct SnapshotDataDTO: Decodable {
    let cards: [CardDTO]
    let cardSets: [CardSetDTO]
    let folders: [FolderDTO]
    let reviews: [ReviewLogDTO]
    let settings: UserSettingsDTO?
    let assets: [SnapshotAssetDTO]
    let tagRecords: [TagRecordDTO]

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        cards = try container.decodeIfPresent([CardDTO].self, forKey: .cards) ?? []
        cardSets = try container.decodeIfPresent([CardSetDTO].self, forKey: .cardSets) ?? []
        folders = try container.decodeIfPresent([FolderDTO].self, forKey: .folders) ?? []
        reviews = try container.decodeIfPresent([ReviewLogDTO].self, forKey: .reviews) ?? []
        settings = try container.decodeIfPresent(UserSettingsDTO.self, forKey: .settings)
        assets = try container.decodeIfPresent([SnapshotAssetDTO].self, forKey: .assets) ?? []
        tagRecords = try container.decodeIfPresent([TagRecordDTO].self, forKey: .tagRecords) ?? []
    }
}

struct FolderDTO: Decodable {
    let id: String
    let userId: String
    let deviceId: String
    let createdAt: String
    let updatedAt: String
    let isDeleted: Bool
    let parentFolderId: String?
    let folderId: String
    let folderName: String
    let folderColor: String?
    let orderIndex: Int?
    let cloudSyncEnabled: Bool?
}

struct CardSetDTO: Decodable {
    let id: String
    let userId: String
    let deviceId: String
    let createdAt: String
    let updatedAt: String
    let isDeleted: Bool
    let folderId: String?
    let name: String
    let description: String?
    let orderIndex: Int?
    let defaultDisplayMode: String?
}

struct CardDTO: Decodable {
    let id: String
    let userId: String
    let deviceId: String
    let createdAt: String
    let updatedAt: String
    let isDeleted: Bool
    let cardSetId: String
    let folderId: String?
    let orderIndex: Int?
    let questionNumber: String
    let title: String?
    let tagIds: [String]?
    let front: CardFaceDTO
    let back: CardFaceDTO
    let isDraft: Bool?
    let hasUncertainty: Bool?
    let isCompleted: Bool?
    let isSilent: Bool?
}

struct CardFaceDTO: Decodable {
    let blocks: [CardBlockDTO]

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        blocks = try container.decodeIfPresent([CardBlockDTO].self, forKey: .blocks) ?? []
    }
}

struct CardBlockDTO: Decodable {
    let id: String
    let type: String
    let orderIndex: Int?
    let questionTitle: String?
    let questionAnswer: String?
    let content: String?
    let markdown: String?
    let code: CodeBlockDTO?
    let images: [UploadedImageDTO]?
    let references: [ReferenceBlockDTO]?
    let math: MathBlockDTO?
}

struct CodeBlockDTO: Decodable {
    let code: String?
    let language: String?
}

struct UploadedImageDTO: Decodable {
    let id: String
    let assetId: String?
    let remoteUrl: String?
    let localUrl: String?
    let storagePath: String?
}

struct ReferenceBlockDTO: Decodable {
    let url: String
    let name: String?
}

struct MathBlockDTO: Decodable {
    let latex: String
    let displayMode: String?
    let note: String?
}

struct TagRecordDTO: Decodable {
    let id: String
    let name: String
    let nameLower: String?
    let color: String
    let userId: String
    let createdAt: String?
    let updatedAt: String
    let deviceId: String?
    let isDeleted: Bool?
    let deletedAt: String?
    let categoryId: String?
    let parentId: String?
}

struct SnapshotAssetDTO: Decodable {
    let assetId: String
    let storagePath: String
    let mime: String
    let naturalW: Double?
    let naturalH: Double?
    let createdAt: String
    let updatedAt: String
}

struct ReviewLogDTO: Decodable {
    let id: String
    let cardId: String
    let folderId: String
    let reviewedAt: String
    let subjectiveScore: Int
    let responseTimeSeconds: Double
    let stabilityBefore: Double
    let stabilityAfter: Double
}

struct UserSettingsDTO: Decodable {
    let dailyGoal: Int
    let notificationsEnabled: Bool
}
