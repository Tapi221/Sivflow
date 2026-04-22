import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
#if canImport(Combine)
import Combine
#endif
#if !canImport(Combine)
protocol ObservableObject: AnyObject {}
@propertyWrapper struct Published<Value> {
    var wrappedValue: Value
    init(wrappedValue: Value) { self.wrappedValue = wrappedValue }
}
#endif
#if canImport(Security)
import Security
#endif

struct FirebaseConfiguration: Codable, Equatable {
    var apiKey: String
    var projectID: String

    var isComplete: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !projectID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

struct FirebaseAuthSession: Codable, Equatable {
    let localID: String
    let email: String
    var idToken: String
    var refreshToken: String
    var expiresAt: Date

    var isExpired: Bool {
        expiresAt.addingTimeInterval(-60) <= .now
    }
}

enum FirebaseServiceError: LocalizedError {
    case missingConfiguration
    case invalidResponse
    case server(String)
    case unauthenticated
    case missingRemoteSnapshot

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "Firebase configuration is incomplete. Add API key and project ID first."
        case .invalidResponse:
            return "Firebase returned an unreadable response."
        case .server(let message):
            return message
        case .unauthenticated:
            return "You need to sign in before using cloud sync."
        case .missingRemoteSnapshot:
            return "No cloud snapshot exists for this user yet."
        }
    }
}

private struct FirebaseAuthResponse: Decodable {
    let localId: String
    let email: String
    let idToken: String
    let refreshToken: String
    let expiresIn: String
}

private struct FirebaseRefreshResponse: Decodable {
    let user_id: String
    let id_token: String
    let refresh_token: String
    let expires_in: String
}

private struct FirestoreValue: Decodable {
    let stringValue: String?
    let timestampValue: String?
}

private struct FirestoreFields: Decodable {
    let snapshotJson: FirestoreValue?
    let updatedAt: FirestoreValue?
}

private struct FirestoreDocument: Decodable {
    let fields: FirestoreFields?
}

#if canImport(Security)
private enum KeychainStore {
    static let service = "FlashCardMasterNative.FirebaseAuth"

    static func save(data: Data, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        var updated = query
        updated[kSecValueData as String] = data
        SecItemAdd(updated as CFDictionary, nil)
    }

    static func load(account: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess else { return nil }
        return item as? Data
    }

    static func delete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
#else
private enum KeychainStore {
    static func save(data: Data, account: String) {
        UserDefaults.standard.set(data, forKey: "kc_\(account)")
    }

    static func load(account: String) -> Data? {
        UserDefaults.standard.data(forKey: "kc_\(account)")
    }

    static func delete(account: String) {
        UserDefaults.standard.removeObject(forKey: "kc_\(account)")
    }
}
#endif

@MainActor
final class FirebaseSyncManager: ObservableObject {
    static let shared = FirebaseSyncManager()

    @Published private(set) var configuration: FirebaseConfiguration?
    @Published private(set) var session: FirebaseAuthSession?
    @Published private(set) var isWorking = false
    @Published var statusMessage: String?

    private let configDefaultsKey = "flashcardmaster.firebase.configuration"
    private let sessionKeychainKey = "flashcardmaster.firebase.session"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        if let data = UserDefaults.standard.data(forKey: configDefaultsKey),
           let config = try? decoder.decode(FirebaseConfiguration.self, from: data) {
            configuration = config
        }
        if let data = KeychainStore.load(account: sessionKeychainKey),
           let restored = try? decoder.decode(FirebaseAuthSession.self, from: data) {
            session = restored
        }
    }

    func updateConfiguration(apiKey: String, projectID: String) {
        let config = FirebaseConfiguration(
            apiKey: apiKey.trimmingCharacters(in: .whitespacesAndNewlines),
            projectID: projectID.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        configuration = config
        if let data = try? encoder.encode(config) {
            UserDefaults.standard.set(data, forKey: configDefaultsKey)
        }
        statusMessage = config.isComplete ? "Firebase configuration saved." : "Firebase configuration cleared."
    }

    func clearConfiguration() {
        configuration = nil
        session = nil
        UserDefaults.standard.removeObject(forKey: configDefaultsKey)
        KeychainStore.delete(account: sessionKeychainKey)
        statusMessage = "Firebase configuration removed."
    }

    func signIn(email: String, password: String) async {
        await performTask {
            let response = try await self.authenticate(endpoint: "accounts:signInWithPassword", email: email, password: password)
            try self.storeSession(from: response)
            self.statusMessage = "Signed in as \(response.email)."
        }
    }

    func signUp(email: String, password: String) async {
        await performTask {
            let response = try await self.authenticate(endpoint: "accounts:signUp", email: email, password: password)
            try self.storeSession(from: response)
            self.statusMessage = "Created Firebase account for \(response.email)."
        }
    }

    func signOut() {
        session = nil
        KeychainStore.delete(account: sessionKeychainKey)
        statusMessage = "Signed out from Firebase."
    }

    func pushSnapshot(data: Data) async {
        await performTask {
            let current = try await self.refreshedSessionIfNeeded()
            let config = try self.requireConfiguration()
            let snapshotString = String(decoding: data, as: UTF8.self)
            let url = try self.firestoreDocumentURL(projectID: config.projectID, userID: current.localID)
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(current.idToken)", forHTTPHeaderField: "Authorization")
            let body: [String: Any] = [
                "fields": [
                    "snapshotJson": ["stringValue": snapshotString],
                    "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: .now)],
                    "platform": ["stringValue": "ios-native"],
                    "formatVersion": ["integerValue": "3"],
                ]
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw FirebaseServiceError.invalidResponse }
            guard (200..<300).contains(http.statusCode) else {
                throw FirebaseServiceError.server("Cloud push failed with status \(http.statusCode).")
            }
            self.statusMessage = "Cloud snapshot pushed to Firestore."
        }
    }

    func pullSnapshot() async throws -> Data {
        let value = try await self.performThrowingTask {
            let current = try await self.refreshedSessionIfNeeded()
            let config = try self.requireConfiguration()
            let url = try self.firestoreDocumentURL(projectID: config.projectID, userID: current.localID)
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(current.idToken)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw FirebaseServiceError.invalidResponse }
            if http.statusCode == 404 {
                throw FirebaseServiceError.missingRemoteSnapshot
            }
            guard (200..<300).contains(http.statusCode) else {
                throw FirebaseServiceError.server("Cloud pull failed with status \(http.statusCode).")
            }
            let document = try self.decoder.decode(FirestoreDocument.self, from: data)
            guard let json = document.fields?.snapshotJson?.stringValue else {
                throw FirebaseServiceError.missingRemoteSnapshot
            }
            self.statusMessage = "Pulled snapshot from Firestore."
            return Data(json.utf8)
        }
        return value
    }

    private func authenticate(endpoint: String, email: String, password: String) async throws -> FirebaseAuthResponse {
        let config = try self.requireConfiguration()
        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/\(endpoint)?key=\(config.apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "returnSecureToken": true,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateAuthHTTPResponse(data: data, response: response)
        return try decoder.decode(FirebaseAuthResponse.self, from: data)
    }

    private func validateAuthHTTPResponse(data: Data, response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw FirebaseServiceError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = object["error"] as? [String: Any],
               let message = error["message"] as? String {
                throw FirebaseServiceError.server(message.replacingOccurrences(of: "_", with: " ").capitalized)
            }
            throw FirebaseServiceError.server("Firebase auth failed with status \(http.statusCode).")
        }
    }

    private func storeSession(from response: FirebaseAuthResponse) throws {
        let expiresIn = TimeInterval(response.expiresIn) ?? 3600
        let session = FirebaseAuthSession(
            localID: response.localId,
            email: response.email,
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            expiresAt: .now.addingTimeInterval(expiresIn)
        )
        self.session = session
        let encoded = try encoder.encode(session)
        KeychainStore.save(data: encoded, account: sessionKeychainKey)
    }

    private func refreshedSessionIfNeeded() async throws -> FirebaseAuthSession {
        guard var session else {
            throw FirebaseServiceError.unauthenticated
        }
        if !session.isExpired {
            return session
        }
        let config = try self.requireConfiguration()
        let url = URL(string: "https://securetoken.googleapis.com/v1/token?key=\(config.apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let body = "grant_type=refresh_token&refresh_token=\(session.refreshToken.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? session.refreshToken)"
        request.httpBody = Data(body.utf8)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateAuthHTTPResponse(data: data, response: response)
        let refreshed = try decoder.decode(FirebaseRefreshResponse.self, from: data)
        session.idToken = refreshed.id_token
        session.refreshToken = refreshed.refresh_token
        session.expiresAt = .now.addingTimeInterval(TimeInterval(refreshed.expires_in) ?? 3600)
        self.session = session
        KeychainStore.save(data: try encoder.encode(session), account: sessionKeychainKey)
        return session
    }

    private func requireConfiguration() throws -> FirebaseConfiguration {
        guard let configuration, configuration.isComplete else {
            throw FirebaseServiceError.missingConfiguration
        }
        return configuration
    }

    private func firestoreDocumentURL(projectID: String, userID: String) throws -> URL {
        guard let encodedProject = projectID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let encodedUser = userID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(encodedProject)/databases/(default)/documents/users/\(encodedUser)/snapshots/current") else {
            throw FirebaseServiceError.invalidResponse
        }
        return url
    }

    private func performTask(_ block: @escaping () async throws -> Void) async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await block()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func performThrowingTask<T>(_ block: @escaping () async throws -> T) async throws -> T {
        isWorking = true
        defer { isWorking = false }
        do {
            return try await block()
        } catch {
            statusMessage = error.localizedDescription
            throw error
        }
    }
}
