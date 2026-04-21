import Foundation

// MARK: - Firebase Configuration

struct FirebaseConfig {
    let projectId: String
    let apiKey: String
    let authDomain: String
    let storageBucket: String
    let messagingSenderId: String
    let appId: String
    
    static let `default` = FirebaseConfig(
        projectId: ProcessInfo.processInfo.environment["FIREBASE_PROJECT_ID"] ?? "flashcard-master",
        apiKey: ProcessInfo.processInfo.environment["FIREBASE_API_KEY"] ?? "",
        authDomain: ProcessInfo.processInfo.environment["FIREBASE_AUTH_DOMAIN"] ?? "",
        storageBucket: ProcessInfo.processInfo.environment["FIREBASE_STORAGE_BUCKET"] ?? "",
        messagingSenderId: ProcessInfo.processInfo.environment["FIREBASE_MESSAGING_SENDER_ID"] ?? "",
        appId: ProcessInfo.processInfo.environment["FIREBASE_APP_ID"] ?? ""
    )
}

// MARK: - Firebase Manager

@MainActor
final class FirebaseManager: ObservableObject {
    @Published private(set) var isInitialized = false
    @Published private(set) var initializationError: String?
    
    static let shared = FirebaseManager()
    
    private init() {
        Task {
            await initialize()
        }
    }
    
    func initialize() async {
        do {
            // TODO: Initialize Firebase SDK when available
            // For now, this is a placeholder for future Firebase integration
            
            DispatchQueue.main.async {
                self.isInitialized = true
                self.initializationError = nil
            }
        } catch {
            DispatchQueue.main.async {
                self.isInitialized = false
                self.initializationError = error.localizedDescription
            }
        }
    }
}

// MARK: - Authentication Service Protocol

protocol AuthenticationService {
    var currentUser: User? { get }
    var isAuthenticated: Bool { get }
    
    func signInWithGoogle() async throws -> User
    func signOut() throws
    func refreshToken() async throws
}

// MARK: - User Model

struct User: Identifiable, Codable {
    let id: String
    let email: String
    let displayName: String?
    let photoURL: URL?
    let createdAt: Date
    let lastSignInAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id = "uid"
        case email
        case displayName
        case photoURL
        case createdAt
        case lastSignInAt
    }
}

// MARK: - Mock Authentication Service (for development)

final class MockAuthenticationService: AuthenticationService {
    @Published private(set) var currentUser: User?
    
    var isAuthenticated: Bool {
        currentUser != nil
    }
    
    func signInWithGoogle() async throws -> User {
        let mockUser = User(
            id: "mock-user-123",
            email: "user@example.com",
            displayName: "Mock User",
            photoURL: nil,
            createdAt: Date(),
            lastSignInAt: Date()
        )
        self.currentUser = mockUser
        return mockUser
    }
    
    func signOut() throws {
        self.currentUser = nil
    }
    
    func refreshToken() async throws {
        // Mock implementation
    }
}

// MARK: - Firestore Service Protocol

protocol FirestoreService {
    func uploadSnapshot(_ snapshot: StudySnapshot, userId: String) async throws
    func downloadSnapshot(userId: String) async throws -> StudySnapshot?
    func listSnapshots(userId: String) async throws -> [SnapshotMetadata]
    func deleteSnapshot(snapshotId: String, userId: String) async throws
}

struct SnapshotMetadata: Identifiable, Codable {
    let id: String
    let name: String
    let createdAt: Date
    let updatedAt: Date
    let size: Int
}

// MARK: - Mock Firestore Service (for development)

final class MockFirestoreService: FirestoreService {
    private var snapshots: [String: StudySnapshot] = [:]
    
    func uploadSnapshot(_ snapshot: StudySnapshot, userId: String) async throws {
        snapshots[userId] = snapshot
    }
    
    func downloadSnapshot(userId: String) async throws -> StudySnapshot? {
        snapshots[userId]
    }
    
    func listSnapshots(userId: String) async throws -> [SnapshotMetadata] {
        guard let snapshot = snapshots[userId] else { return [] }
        return [
            SnapshotMetadata(
                id: UUID().uuidString,
                name: "Snapshot",
                createdAt: Date(),
                updatedAt: Date(),
                size: 1024
            )
        ]
    }
    
    func deleteSnapshot(snapshotId: String, userId: String) async throws {
        snapshots.removeValue(forKey: userId)
    }
}
