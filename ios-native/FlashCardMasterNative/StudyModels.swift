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
    var tagIDs: [UUID]
    var flags: Set<CardFlag>
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        cardSetID: UUID,
        title: String,
        frontText: String,
        backText: String,
        tagIDs: [UUID] = [],
        flags: Set<CardFlag> = [],
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.cardSetID = cardSetID
        self.title = title
        self.frontText = frontText
        self.backText = backText
        self.tagIDs = tagIDs
        self.flags = flags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var searchText: String {
        [title, frontText, backText].joined(separator: "\n").lowercased()
    }
}

struct StudySnapshot: Codable {
    var version: Int
    var theme: AppTheme
    var folders: [StudyFolder]
    var cardSets: [StudyCardSet]
    var cards: [StudyCard]
    var tags: [StudyTag]

    static let currentVersion = 1
}

extension StudySnapshot {
    static var sample: StudySnapshot {
        let basicsTag = StudyTag(name: "Basics", colorName: .blue)
        let swiftTag = StudyTag(name: "Swift", colorName: .purple)
        let reviewTag = StudyTag(name: "Review", colorName: .amber)
        let uiTag = StudyTag(name: "UI", colorName: .green)

        let rootFolder = StudyFolder(name: "iOS", colorName: .blue)
        let childFolder = StudyFolder(name: "SwiftUI", colorName: .purple, parentID: rootFolder.id)

        let syntaxSet = StudyCardSet(name: "Swift Syntax", colorName: .green, parentFolderID: rootFolder.id)
        let viewSet = StudyCardSet(name: "View Lifecycle", colorName: .rose, parentFolderID: childFolder.id)
        let rootSet = StudyCardSet(name: "Interview Notes", colorName: .amber, parentFolderID: nil)

        let cards = [
            StudyCard(
                cardSetID: syntaxSet.id,
                title: "Value vs Reference",
                frontText: "Explain the difference between structs and classes in Swift.",
                backText: "Structs are value types copied on assignment. Classes are reference types shared across references. Structs are preferred by default unless identity or shared mutable state is required.",
                tagIDs: [basicsTag.id, swiftTag.id],
                flags: [.complete]
            ),
            StudyCard(
                cardSetID: syntaxSet.id,
                title: "Async Await",
                frontText: "When should async/await be preferred over callbacks?",
                backText: "Use async/await for readable sequential async flows, structured concurrency, and easier error propagation. Prefer callbacks only when integrating legacy APIs or very low-level event streams.",
                tagIDs: [swiftTag.id, reviewTag.id],
                flags: [.uncertain]
            ),
            StudyCard(
                cardSetID: viewSet.id,
                title: "StateObject",
                frontText: "Why use @StateObject in a root SwiftUI screen?",
                backText: "Use @StateObject when the view owns the observable object's lifecycle. It prevents recreation across view reloads and keeps state stable.",
                tagIDs: [uiTag.id, swiftTag.id],
                flags: [.draft]
            ),
            StudyCard(
                cardSetID: rootSet.id,
                title: "Apple HIG",
                frontText: "What is one practical rule from Apple Human Interface Guidelines?",
                backText: "Make primary actions obvious, keep navigation predictable, and use platform-standard controls unless a custom interaction clearly improves the task.",
                tagIDs: [uiTag.id, basicsTag.id],
                flags: [.complete]
            )
        ]

        return StudySnapshot(
            version: StudySnapshot.currentVersion,
            theme: .system,
            folders: [rootFolder, childFolder],
            cardSets: [syntaxSet, viewSet, rootSet],
            cards: cards,
            tags: [basicsTag, swiftTag, reviewTag, uiTag]
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
        return queryMatches && statusMatches && tagsMatch
    }
}