import Foundation

private enum SnapshotContract {
    static let supportedSchemaVersion = 3
    static let sampleSnapshotFileName = "sample-snapshot"
    static let cachedSnapshotFileName = "imported-snapshot-cache.json"
    static let bookmarkFileName = "imported-snapshot.bookmark"
}

enum BootstrapSource: String {
    case persistedImport = "Imported Snapshot"
    case cachedImport = "Cached Snapshot"
    case bundleSample = "Bundle Sample"
    case mockFallback = "Mock Fallback"
}

struct RuntimeSession {
    let service: StudyBrowsingService
    let source: BootstrapSource
    let bootstrapError: String?
    let sourceDescription: String
}

@MainActor
final class StudyRuntimeStore: ObservableObject {
    @Published private(set) var session: RuntimeSession

    private let persistence: SnapshotDocumentPersistence
    private let loader: SnapshotBundleLoader

    init(
        session: RuntimeSession,
        persistence: SnapshotDocumentPersistence = SnapshotDocumentPersistence(),
        loader: SnapshotBundleLoader = SnapshotBundleLoader()
    ) {
        self.session = session
        self.persistence = persistence
        self.loader = loader
    }

    static let bootstrap: () -> StudyRuntimeStore = {
        let persistence = SnapshotDocumentPersistence()
        let loader = SnapshotBundleLoader()
        let session = buildInitialSession(persistence: persistence, loader: loader)
        return StudyRuntimeStore(session: session, persistence: persistence, loader: loader)
    }

    func importSnapshot(from url: URL) async {
        do {
            let persistedDocument = try persistence.persistImportedDocument(from: url)
            let session = try StudyRuntimeStore.makeSession(
                from: persistedDocument,
                source: .persistedImport,
                loader: loader,
                bootstrapError: nil
            )
            self.session = session
        } catch {
            let errorMessage = error.localizedDescription
            self.session = RuntimeSession(
                service: session.service,
                source: session.source,
                bootstrapError: "Import failed: \(errorMessage)",
                sourceDescription: session.sourceDescription
            )
        }
    }

    func resetToBundledSample() {
        do {
            try persistence.clearImportedDocument()
            self.session = try StudyRuntimeStore.makeBundledSampleSession(loader: loader)
        } catch {
            self.session = StudyRuntimeStore.mockSession(
                errorMessage: "Failed to reset imported snapshot: \(error.localizedDescription)"
            )
        }
    }

    private static func buildInitialSession(
        persistence: SnapshotDocumentPersistence,
        loader: SnapshotBundleLoader
    ) -> RuntimeSession {
        do {
            if let persisted = try persistence.loadPreferredDocument() {
                return try makeSession(
                    from: persisted.document,
                    source: persisted.source,
                    loader: loader,
                    bootstrapError: nil
                )
            }

            return try makeBundledSampleSession(loader: loader)
        } catch {
            return fallbackSession(
                persistence: persistence,
                loader: loader,
                preferredError: error.localizedDescription
            )
        }
    }

    private static func fallbackSession(
        persistence: SnapshotDocumentPersistence,
        loader: SnapshotBundleLoader,
        preferredError: String
    ) -> RuntimeSession {
        do {
            return try makeBundledSampleSession(loader: loader, bootstrapError: preferredError)
        } catch {
            return mockSession(
                errorMessage: "\(preferredError) / bundled sample failed: \(error.localizedDescription)"
            )
        }
    }

    private static func makeBundledSampleSession(
        loader: SnapshotBundleLoader,
        bootstrapError: String? = nil
    ) throws -> RuntimeSession {
        let bundleDocument = try loader.loadBundledSample(named: SnapshotContract.sampleSnapshotFileName)
        let snapshot = try StudySnapshotMapper.map(
            dto: bundleDocument.snapshot,
            assetBaseDirectoryURL: bundleDocument.assetBaseDirectoryURL
        )
        let service = InMemoryStudyBrowsingService(snapshot: snapshot)
        return RuntimeSession(
            service: service,
            source: .bundleSample,
            bootstrapError: bootstrapError,
            sourceDescription: bundleDocument.sourceDescription
        )
    }

    private static func makeSession(
        from document: SnapshotLoadedDocument,
        source: BootstrapSource,
        loader: SnapshotBundleLoader,
        bootstrapError: String?
    ) throws -> RuntimeSession {
        let validatedDocument = try loader.validate(document: document)
        let snapshot = try StudySnapshotMapper.map(
            dto: validatedDocument.snapshot,
            assetBaseDirectoryURL: validatedDocument.assetBaseDirectoryURL
        )
        let service = InMemoryStudyBrowsingService(snapshot: snapshot)
        return RuntimeSession(
            service: service,
            source: source,
            bootstrapError: bootstrapError,
            sourceDescription: validatedDocument.sourceDescription
        )
    }

    private static func mockSession(errorMessage: String) -> RuntimeSession {
        RuntimeSession(
            service: MockStudyBrowsingService(),
            source: .mockFallback,
            bootstrapError: errorMessage,
            sourceDescription: "Mock data baked into app"
        )
    }
}

struct PersistedSnapshotLoadResult {
    let document: SnapshotLoadedDocument
    let source: BootstrapSource
}

struct SnapshotLoadedDocument {
    let snapshot: SnapshotDTO
    let sourceURL: URL?
    let assetBaseDirectoryURL: URL?
    let sourceDescription: String
}

struct SnapshotBundleLoader {
    enum LoaderError: LocalizedError {
        case unsupportedSchemaVersion(Int)
        case invalidSnapshotShape
        case unreadableData
        case missingFile(String)

        var errorDescription: String? {
            switch self {
            case .unsupportedSchemaVersion(let version):
                return "Unsupported snapshot schema version: \(version)"
            case .invalidSnapshotShape:
                return "Snapshot file shape is invalid."
            case .unreadableData:
                return "Failed to read snapshot data."
            case .missingFile(let fileName):
                return "Bundle is missing \(fileName).json"
            }
        }
    }

    private let decoder: JSONDecoder

    init(decoder: JSONDecoder = JSONDecoder()) {
        self.decoder = decoder
    }

    func loadBundledSample(named fileName: String, bundle: Bundle = .main) throws -> SnapshotLoadedDocument {
        guard let url = bundle.url(forResource: fileName, withExtension: "json") else {
            throw LoaderError.missingFile(fileName)
        }
        let data = try Data(contentsOf: url)
        let document = try loadDocument(
            from: data,
            sourceURL: url,
            assetBaseDirectoryURL: url.deletingLastPathComponent(),
            sourceDescription: url.lastPathComponent
        )
        return try validate(document: document)
    }

    func loadImportedDocument(from url: URL) throws -> SnapshotLoadedDocument {
        let data = try Data(contentsOf: url)
        let description = url.lastPathComponent
        return try validate(document: loadDocument(
            from: data,
            sourceURL: url,
            assetBaseDirectoryURL: url.deletingLastPathComponent(),
            sourceDescription: description
        ))
    }

    func loadCachedDocument(from url: URL) throws -> SnapshotLoadedDocument {
        let data = try Data(contentsOf: url)
        return try validate(document: loadDocument(
            from: data,
            sourceURL: url,
            assetBaseDirectoryURL: url.deletingLastPathComponent(),
            sourceDescription: url.lastPathComponent
        ))
    }

    func validate(document: SnapshotLoadedDocument) throws -> SnapshotLoadedDocument {
        guard document.snapshot.metadata.schemaVersion <= SnapshotContract.supportedSchemaVersion else {
            throw LoaderError.unsupportedSchemaVersion(document.snapshot.metadata.schemaVersion)
        }
        return document
    }

    private func loadDocument(
        from data: Data,
        sourceURL: URL?,
        assetBaseDirectoryURL: URL?,
        sourceDescription: String
    ) throws -> SnapshotLoadedDocument {
        let snapshot = try decoder.decode(SnapshotDTO.self, from: data)
        return SnapshotLoadedDocument(
            snapshot: snapshot,
            sourceURL: sourceURL,
            assetBaseDirectoryURL: assetBaseDirectoryURL,
            sourceDescription: sourceDescription
        )
    }
}

struct SnapshotDocumentPersistence {
    enum PersistenceError: LocalizedError {
        case applicationSupportUnavailable
        case bookmarkResolutionFailed
        case fileAccessDenied

        var errorDescription: String? {
            switch self {
            case .applicationSupportUnavailable:
                return "Application Support directory is unavailable."
            case .bookmarkResolutionFailed:
                return "Failed to resolve imported snapshot bookmark."
            case .fileAccessDenied:
                return "Could not access imported snapshot file."
            }
        }
    }

    private let fileManager: FileManager
    private let loader: SnapshotBundleLoader

    init(
        fileManager: FileManager = .default,
        loader: SnapshotBundleLoader = SnapshotBundleLoader()
    ) {
        self.fileManager = fileManager
        self.loader = loader
    }

    func loadPreferredDocument() throws -> PersistedSnapshotLoadResult? {
        if let bookmarkedDocument = try? loadImportedDocumentUsingBookmark(),
           let original = bookmarkedDocument {
            return PersistedSnapshotLoadResult(document: original, source: .persistedImport)
        }

        if let cachedDocument = try? loadCachedDocument(),
           let cached = cachedDocument {
            return PersistedSnapshotLoadResult(document: cached, source: .cachedImport)
        }

        return nil
    }

    func persistImportedDocument(from externalURL: URL) throws -> SnapshotLoadedDocument {
        let securityScoped = externalURL.startAccessingSecurityScopedResource()
        defer {
            if securityScoped {
                externalURL.stopAccessingSecurityScopedResource()
            }
        }

        let document = try loader.loadImportedDocument(from: externalURL)
        let snapshotCacheURL = try cachedSnapshotURL()
        let bookmarkURL = try bookmarkURL()
        let data = try Data(contentsOf: externalURL)

        try ensureApplicationSupportDirectoryExists()
        try data.write(to: snapshotCacheURL, options: .atomic)

        let bookmarkData = try externalURL.bookmarkData(
            options: [.withSecurityScope],
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        try bookmarkData.write(to: bookmarkURL, options: .atomic)
        return document
    }

    func clearImportedDocument() throws {
        let bookmark = try bookmarkURL()
        let cache = try cachedSnapshotURL()

        if fileManager.fileExists(atPath: bookmark.path) {
            try fileManager.removeItem(at: bookmark)
        }
        if fileManager.fileExists(atPath: cache.path) {
            try fileManager.removeItem(at: cache)
        }
    }

    private func loadImportedDocumentUsingBookmark() throws -> SnapshotLoadedDocument? {
        let bookmarkFileURL = try bookmarkURL()
        guard fileManager.fileExists(atPath: bookmarkFileURL.path) else {
            return nil
        }

        let bookmarkData = try Data(contentsOf: bookmarkFileURL)
        var isStale = false
        let resolvedURL = try URL(
            resolvingBookmarkData: bookmarkData,
            options: [.withSecurityScope],
            relativeTo: nil,
            bookmarkDataIsStale: &isStale
        )

        let didAccess = resolvedURL.startAccessingSecurityScopedResource()
        defer {
            if didAccess {
                resolvedURL.stopAccessingSecurityScopedResource()
            }
        }

        guard didAccess || fileManager.isReadableFile(atPath: resolvedURL.path) else {
            return nil
        }

        let document = try loader.loadImportedDocument(from: resolvedURL)
        if isStale {
            _ = try? persistImportedDocument(from: resolvedURL)
        }
        return document
    }

    private func loadCachedDocument() throws -> SnapshotLoadedDocument? {
        let cacheURL = try cachedSnapshotURL()
        guard fileManager.fileExists(atPath: cacheURL.path) else {
            return nil
        }
        return try loader.loadCachedDocument(from: cacheURL)
    }

    private func ensureApplicationSupportDirectoryExists() throws {
        let directory = try applicationSupportDirectory()
        if !fileManager.fileExists(atPath: directory.path) {
            try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        }
    }

    private func applicationSupportDirectory() throws -> URL {
        guard let url = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            throw PersistenceError.applicationSupportUnavailable
        }
        return url.appendingPathComponent("FlashCardMasterNative", isDirectory: true)
    }

    private func cachedSnapshotURL() throws -> URL {
        try applicationSupportDirectory().appendingPathComponent(SnapshotContract.cachedSnapshotFileName)
    }

    private func bookmarkURL() throws -> URL {
        try applicationSupportDirectory().appendingPathComponent(SnapshotContract.bookmarkFileName)
    }
}
