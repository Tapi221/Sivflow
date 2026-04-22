import Foundation

enum StudyColorName: String, Codable, CaseIterable, Identifiable {
    case slate
    case blue
    case green
    case amber
    case rose
    case purple

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .slate: return "Slate"
        case .blue: return "Blue"
        case .green: return "Green"
        case .amber: return "Amber"
        case .rose: return "Rose"
        case .purple: return "Purple"
        }
    }
}

enum CardFlag: String, Codable, CaseIterable, Hashable, Identifiable {
    case draft
    case uncertain
    case complete
    case silent

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .uncertain: return "Uncertain"
        case .complete: return "Complete"
        case .silent: return "Silent"
        }
    }
}

enum AppTheme: String, Codable, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}

struct StudyTag: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var colorName: StudyColorName
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        colorName: StudyColorName,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.colorName = colorName
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct StudyFolder: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var colorName: StudyColorName
    var parentID: UUID?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        colorName: StudyColorName,
        parentID: UUID? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.colorName = colorName
        self.parentID = parentID
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct StudyCardSet: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var colorName: StudyColorName
    var parentFolderID: UUID?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        colorName: StudyColorName,
        parentFolderID: UUID? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.colorName = colorName
        self.parentFolderID = parentFolderID
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct StudyCard: Identifiable, Codable, Hashable {
    var id: UUID
    var cardSetID: UUID
    var title: String
    var frontText: String
    var backText: String
    var noteText: String
    var imageURL: String?
    var sourceURL: String?
    var pdfURL: String?
    var tagIDs: [UUID]
    var flags: Set<CardFlag>
    var createdAt: Date
    var updatedAt: Date
    var nextReviewAt: Date?
    var lastStudiedAt: Date?
    var studyCount: Int
    var deletedAt: Date?

    init(
        id: UUID = UUID(),
        cardSetID: UUID,
        title: String,
        frontText: String,
        backText: String,
        noteText: String = "",
        imageURL: String? = nil,
        sourceURL: String? = nil,
        pdfURL: String? = nil,
        tagIDs: [UUID] = [],
        flags: Set<CardFlag> = [],
        createdAt: Date = .now,
        updatedAt: Date = .now,
        nextReviewAt: Date? = nil,
        lastStudiedAt: Date? = nil,
        studyCount: Int = 0,
        deletedAt: Date? = nil
    ) {
        self.id = id
        self.cardSetID = cardSetID
        self.title = title
        self.frontText = frontText
        self.backText = backText
        self.noteText = noteText
        self.imageURL = imageURL
        self.sourceURL = sourceURL
        self.pdfURL = pdfURL
        self.tagIDs = tagIDs
        self.flags = flags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.nextReviewAt = nextReviewAt
        self.lastStudiedAt = lastStudiedAt
        self.studyCount = studyCount
        self.deletedAt = deletedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case cardSetID
        case title
        case frontText
        case backText
        case noteText
        case imageURL
        case sourceURL
        case pdfURL
        case tagIDs
        case flags
        case createdAt
        case updatedAt
        case nextReviewAt
        case lastStudiedAt
        case studyCount
        case deletedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        cardSetID = try container.decode(UUID.self, forKey: .cardSetID)
        title = try container.decode(String.self, forKey: .title)
        frontText = try container.decode(String.self, forKey: .frontText)
        backText = try container.decode(String.self, forKey: .backText)
        noteText = try container.decodeIfPresent(String.self, forKey: .noteText) ?? ""
        imageURL = try container.decodeIfPresent(String.self, forKey: .imageURL)
        sourceURL = try container.decodeIfPresent(String.self, forKey: .sourceURL)
        pdfURL = try container.decodeIfPresent(String.self, forKey: .pdfURL)
        tagIDs = try container.decodeIfPresent([UUID].self, forKey: .tagIDs) ?? []
        flags = try container.decodeIfPresent(Set<CardFlag>.self, forKey: .flags) ?? []
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? .now
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt) ?? .now
        nextReviewAt = try container.decodeIfPresent(Date.self, forKey: .nextReviewAt)
        lastStudiedAt = try container.decodeIfPresent(Date.self, forKey: .lastStudiedAt)
        studyCount = try container.decodeIfPresent(Int.self, forKey: .studyCount) ?? 0
        deletedAt = try container.decodeIfPresent(Date.self, forKey: .deletedAt)
    }

    var isDeleted: Bool { deletedAt != nil }

    var searchText: String {
        [title, frontText, backText, noteText, sourceURL ?? "", pdfURL ?? ""].joined(separator: "\n").lowercased()
    }
}

struct StudySnapshot: Codable {
    var version: Int
    var theme: AppTheme
    var folders: [StudyFolder]
    var cardSets: [StudyCardSet]
    var cards: [StudyCard]
    var tags: [StudyTag]

    static let currentVersion = 3
}

extension StudySnapshot {
    static var sample: StudySnapshot {
        let basicsTag = StudyTag(name: "Basics", colorName: .blue)
        let swiftTag = StudyTag(name: "Swift", colorName: .purple)
        let reviewTag = StudyTag(name: "Review", colorName: .amber)
        let uiTag = StudyTag(name: "UI", colorName: .green)
        let systemTag = StudyTag(name: "System Design", colorName: .rose)

        let rootFolder = StudyFolder(name: "iOS", colorName: .blue)
        let childFolder = StudyFolder(name: "SwiftUI", colorName: .purple, parentID: rootFolder.id)
        let systemFolder = StudyFolder(name: "Architecture", colorName: .rose)

        let syntaxSet = StudyCardSet(name: "Swift Syntax", colorName: .green, parentFolderID: rootFolder.id)
        let viewSet = StudyCardSet(name: "View Lifecycle", colorName: .rose, parentFolderID: childFolder.id)
        let rootSet = StudyCardSet(name: "Interview Notes", colorName: .amber, parentFolderID: nil)
        let architectureSet = StudyCardSet(name: "App Design", colorName: .purple, parentFolderID: systemFolder.id)

        let cards = [
            StudyCard(
                cardSetID: syntaxSet.id,
                title: "Value vs Reference",
                frontText: "Explain the difference between structs and classes in Swift.",
                backText: "Structs are value types copied on assignment. Classes are reference types shared across references. Prefer structs until identity or shared mutable state becomes necessary.",
                noteText: "Maps to interview fundamentals and dictionary terms.",
                sourceURL: "https://developer.apple.com/documentation/swift",
                pdfURL: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                tagIDs: [basicsTag.id, swiftTag.id],
                flags: [.complete],
                nextReviewAt: Calendar.current.date(byAdding: .day, value: 2, to: .now),
                studyCount: 4
            ),
            StudyCard(
                cardSetID: syntaxSet.id,
                title: "Async Await",
                frontText: "When should async/await be preferred over callbacks?",
                backText: "Use async/await for readable sequential async flows, structured concurrency, and easier error propagation.",
                noteText: "React/Electron has cloud sync startup tasks. iOS local-first build keeps the same learning shape, minus cloud.",
                sourceURL: "https://developer.apple.com/documentation/swift/concurrency",
                tagIDs: [swiftTag.id, reviewTag.id],
                flags: [.uncertain],
                nextReviewAt: Calendar.current.date(byAdding: .hour, value: -3, to: .now),
                studyCount: 2
            ),
            StudyCard(
                cardSetID: viewSet.id,
                title: "StateObject",
                frontText: "Why use @StateObject in a root SwiftUI screen?",
                backText: "Use @StateObject when the view owns the observable object's lifecycle. It prevents recreation across redraws.",
                noteText: "Tie this to folder and tag filters when building cross-platform parity.",
                imageURL: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
                tagIDs: [uiTag.id, swiftTag.id],
                flags: [.draft],
                nextReviewAt: Calendar.current.date(byAdding: .day, value: 1, to: .now)
            ),
            StudyCard(
                cardSetID: rootSet.id,
                title: "Apple HIG",
                frontText: "What is one practical rule from Apple Human Interface Guidelines?",
                backText: "Make primary actions obvious, keep navigation predictable, and use platform-standard controls unless a custom interaction clearly improves the task.",
                tagIDs: [uiTag.id, basicsTag.id],
                flags: [.complete],
                nextReviewAt: Calendar.current.date(byAdding: .day, value: 5, to: .now),
                studyCount: 7
            ),
            StudyCard(
                cardSetID: architectureSet.id,
                title: "Offline-first Storage",
                frontText: "Why is offline-first storage valuable in a learning app?",
                backText: "It reduces perceived latency, improves reliability, and allows eventual sync instead of blocking the core study loop on the network.",
                noteText: "Electron/Web uses Dexie + Firebase. iOS parity build uses JSON snapshot locally.",
                tagIDs: [systemTag.id, reviewTag.id],
                flags: [.uncertain],
                nextReviewAt: Calendar.current.date(byAdding: .minute, value: -30, to: .now),
                studyCount: 1
            )
        ]

        return StudySnapshot(
            version: StudySnapshot.currentVersion,
            theme: .system,
            folders: [rootFolder, childFolder, systemFolder],
            cardSets: [syntaxSet, viewSet, rootSet, architectureSet],
            cards: cards,
            tags: [basicsTag, swiftTag, reviewTag, uiTag, systemTag]
        )
    }
}

struct SearchFilter {
    var query: String = ""
    var status: CardFlag?
    var selectedTagIDs: Set<UUID> = []

    func matches(card: StudyCard) -> Bool {
        let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let queryMatches = normalizedQuery.isEmpty || card.searchText.contains(normalizedQuery)
        let statusMatches = status == nil || card.flags.contains(status!)
        let tagsMatch = selectedTagIDs.isEmpty || selectedTagIDs.isSubset(of: Set(card.tagIDs))
        return queryMatches && statusMatches && tagsMatch && !card.isDeleted
    }
}
