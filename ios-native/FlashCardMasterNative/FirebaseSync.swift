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
#if canImport(AuthenticationServices)
import AuthenticationServices
#endif
#if canImport(CryptoKit)
import CryptoKit
#endif
#if canImport(UIKit)
import UIKit
#endif

struct FirebaseConfiguration: Codable, Equatable {
    static let defaultGoogleRedirectScheme = "com.akari221.flashcardmasternative.auth"
    static let defaultGoogleRedirectPath = "/oauth2redirect"

    var apiKey: String
    var projectID: String
    var googleClientID: String
    var googleRedirectScheme: String

    init(
        apiKey: String = "",
        projectID: String = "",
        googleClientID: String = "",
        googleRedirectScheme: String = FirebaseConfiguration.defaultGoogleRedirectScheme
    ) {
        self.apiKey = apiKey
        self.projectID = projectID
        self.googleClientID = googleClientID
        self.googleRedirectScheme = googleRedirectScheme
    }

    var isComplete: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !projectID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var canUseGoogleSignIn: Bool {
        isComplete && !googleClientID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var googleRedirectURI: String {
        let trimmedScheme = googleRedirectScheme.trimmingCharacters(in: .whitespacesAndNewlines)
        return "\(trimmedScheme):\(FirebaseConfiguration.defaultGoogleRedirectPath)"
    }
}

struct FirebaseAuthSession: Codable, Equatable {
    let localID: String
    let email: String
    var idToken: String
    var refreshToken: String
    var expiresAt: Date
    var providerID: String

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
    case googleSignInUnavailable
    case invalidCallbackURL
    case oauth(String)

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
        case .googleSignInUnavailable:
            return "Google Sign-In requires AuthenticationServices on iOS."
        case .invalidCallbackURL:
            return "Google Sign-In returned an invalid callback URL."
        case .oauth(let message):
            return message
        }
    }
}

private struct FirebaseAuthResponse: Decodable {
    let localId: String
    let email: String?
    let idToken: String
    let refreshToken: String
    let expiresIn: String
    let providerId: String?
}

private struct FirebaseRefreshResponse: Decodable {
    let user_id: String
    let id_token: String
    let refresh_token: String
    let expires_in: String
}

private struct GoogleTokenResponse: Decodable {
    let access_token: String
    let id_token: String?
}

private struct FirestoreValue: Decodable {
    let stringValue: String?
    let timestampValue: String?
}

private struct FirestoreFields: Decodable {
    let payloadJson: FirestoreValue?
    let snapshotJson: FirestoreValue?
    let updatedAt: FirestoreValue?
    let writerDeviceID: FirestoreValue?
    let contentHash: FirestoreValue?
}

private struct FirestoreDocument: Decodable {
    let fields: FirestoreFields?
}

private struct FirebaseCloudEnvelope: Codable, Equatable {
    var schemaVersion: Int
    var updatedAt: Date
    var writerDeviceID: String
    var snapshot: StudySnapshot

    init(
        schemaVersion: Int = 2,
        updatedAt: Date = .now,
        writerDeviceID: String,
        snapshot: StudySnapshot
    ) {
        self.schemaVersion = schemaVersion
        self.updatedAt = updatedAt
        self.writerDeviceID = writerDeviceID
        self.snapshot = snapshot
    }
}

private struct RemoteEnvelopePayload {
    let envelope: FirebaseCloudEnvelope
    let contentHash: String
}

private struct GoogleOAuthCredential {
    let accessToken: String
    let idToken: String?
}

#if canImport(Security)
private enum KeychainStore {
    static let service = "FlashCardMasterNative.FirebaseAuth"
    static func save(data: Data, account: String) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(query as CFDictionary)
        var updated = query
        updated[kSecValueData as String] = data
        SecItemAdd(updated as CFDictionary, nil)
    }
    static func load(account: String) -> Data? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess else { return nil }
        return item as? Data
    }
    static func delete(account: String) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(query as CFDictionary)
    }
}
#else
private enum KeychainStore {
    static func save(data: Data, account: String) { UserDefaults.standard.set(data, forKey: "kc_\(account)") }
    static func load(account: String) -> Data? { UserDefaults.standard.data(forKey: "kc_\(account)") }
    static func delete(account: String) { UserDefaults.standard.removeObject(forKey: "kc_\(account)") }
}
#endif

#if canImport(AuthenticationServices) && canImport(UIKit) && canImport(CryptoKit)
private final class GoogleOAuthSessionCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }

    func authenticate(clientID: String, redirectScheme: String, redirectURI: String) async throws -> GoogleOAuthCredential {
        let state = UUID().uuidString
        let verifier = Self.randomBase64URL(byteCount: 32)
        let challenge = Self.sha256Base64URL(verifier)
        let authURL = try Self.makeAuthorizationURL(clientID: clientID, redirectURI: redirectURI, state: state, codeChallenge: challenge)

        let callbackURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
            let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: redirectScheme) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: FirebaseServiceError.invalidCallbackURL)
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.session = session
            session.start()
        }

        let code = try Self.extractQueryItem(named: "code", from: callbackURL)
        let returnedState = try Self.extractQueryItem(named: "state", from: callbackURL)
        guard returnedState == state else { throw FirebaseServiceError.oauth("Google Sign-In returned a mismatched state value.") }
        return try await Self.exchangeCodeForToken(code: code, clientID: clientID, redirectURI: redirectURI, codeVerifier: verifier)
    }

    private static func makeAuthorizationURL(clientID: String, redirectURI: String, state: String, codeChallenge: String) throws -> URL {
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account"),
            URLQueryItem(name: "access_type", value: "offline"),
        ]
        guard let url = components?.url else { throw FirebaseServiceError.invalidResponse }
        return url
    }

    private static func exchangeCodeForToken(code: String, clientID: String, redirectURI: String, codeVerifier: String) async throws -> GoogleOAuthCredential {
        let url = URL(string: "https://oauth2.googleapis.com/token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = formEncodedBody(["code": code, "client_id": clientID, "redirect_uri": redirectURI, "grant_type": "authorization_code", "code_verifier": codeVerifier])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw FirebaseServiceError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let message = Self.oauthErrorMessage(from: data) ?? "Google token exchange failed with status \(http.statusCode)."
            throw FirebaseServiceError.oauth(message)
        }
        let token = try JSONDecoder().decode(GoogleTokenResponse.self, from: data)
        return GoogleOAuthCredential(accessToken: token.access_token, idToken: token.id_token)
    }

    private static func extractQueryItem(named name: String, from url: URL) throws -> String {
        guard let value = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == name })?.value, !value.isEmpty else {
            throw FirebaseServiceError.invalidCallbackURL
        }
        return value
    }

    private static func randomBase64URL(byteCount: Int) -> String {
        let data = Data((0..<byteCount).map { _ in UInt8.random(in: .min ... .max) })
        return data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    private static func sha256Base64URL(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return Data(digest).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    private static func oauthErrorMessage(from data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let error = object["error"] as? String, let description = object["error_description"] as? String { return "\(error): \(description)" }
        return object["error_description"] as? String ?? object["error"] as? String
    }
}
#endif

@MainActor
final class FirebaseSyncManager: ObservableObject {
    static let shared = FirebaseSyncManager()

    @Published private(set) var configuration: FirebaseConfiguration?
    @Published private(set) var session: FirebaseAuthSession?
    @Published private(set) var isWorking = false
    @Published private(set) var autoSyncEnabled = false
    @Published private(set) var liveSyncState = "Cloud sync is off."
    @Published var statusMessage: String?

    private let configDefaultsKey = "flashcardmaster.firebase.configuration"
    private let autoSyncDefaultsKey = "flashcardmaster.firebase.autoSyncEnabled"
    private let deviceIDDefaultsKey = "flashcardmaster.firebase.deviceID"
    private let sessionKeychainKey = "flashcardmaster.firebase.session"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let deviceID: String
    private let syncPollIntervalNanoseconds: UInt64 = 4_000_000_000

    private weak var store: StudyStore?
    private var storeObserver: NSObjectProtocol?
    private var backgroundSyncTask: Task<Void, Never>?
    private var pendingPushTask: Task<Void, Never>?
    private var ignoreNextLocalPersist = false
    private var lastAppliedRemoteHash: String?
    private var lastPushedContentHash: String?

    private init() {
        encoder.outputFormatting = [.sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601

        if let existingDeviceID = UserDefaults.standard.string(forKey: deviceIDDefaultsKey), !existingDeviceID.isEmpty {
            deviceID = existingDeviceID
        } else {
            let newValue = UUID().uuidString
            UserDefaults.standard.set(newValue, forKey: deviceIDDefaultsKey)
            deviceID = newValue
        }

        if let data = UserDefaults.standard.data(forKey: configDefaultsKey), let config = try? decoder.decode(FirebaseConfiguration.self, from: data) { configuration = config }
        if let data = KeychainStore.load(account: sessionKeychainKey), let restored = try? decoder.decode(FirebaseAuthSession.self, from: data) { session = restored }
        autoSyncEnabled = UserDefaults.standard.bool(forKey: autoSyncDefaultsKey)
        if autoSyncEnabled { liveSyncState = "Live merge sync will start when a store is attached." }
    }

    func attach(store: StudyStore) {
        self.store = store
        if storeObserver == nil {
            storeObserver = NotificationCenter.default.addObserver(forName: .studyStoreDidPersist, object: store, queue: .main) { [weak self] notification in
                Task { @MainActor in await self?.handleLocalPersist(notification: notification) }
            }
        }
        startBackgroundSyncIfPossible(forceRestart: false)
    }

    func updateConfiguration(apiKey: String, projectID: String, googleClientID: String, googleRedirectScheme: String) {
        let config = FirebaseConfiguration(
            apiKey: apiKey.trimmingCharacters(in: .whitespacesAndNewlines),
            projectID: projectID.trimmingCharacters(in: .whitespacesAndNewlines),
            googleClientID: googleClientID.trimmingCharacters(in: .whitespacesAndNewlines),
            googleRedirectScheme: googleRedirectScheme.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? FirebaseConfiguration.defaultGoogleRedirectScheme : googleRedirectScheme.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        configuration = config
        if let data = try? encoder.encode(config) { UserDefaults.standard.set(data, forKey: configDefaultsKey) }
        statusMessage = config.isComplete ? "Firebase configuration saved." : "Firebase configuration cleared."
        startBackgroundSyncIfPossible(forceRestart: true)
    }

    func clearConfiguration() {
        configuration = nil
        session = nil
        UserDefaults.standard.removeObject(forKey: configDefaultsKey)
        KeychainStore.delete(account: sessionKeychainKey)
        stopBackgroundSync()
        statusMessage = "Firebase configuration removed."
    }

    func setAutoSyncEnabled(_ enabled: Bool) {
        autoSyncEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: autoSyncDefaultsKey)
        if enabled {
            liveSyncState = "Live merge sync enabled. Waiting for authentication."
            startBackgroundSyncIfPossible(forceRestart: true)
        } else {
            stopBackgroundSync()
            liveSyncState = "Cloud sync is off."
        }
    }

    func signIn(email: String, password: String) async {
        await performTask {
            let response = try await self.authenticate(endpoint: "accounts:signInWithPassword", email: email, password: password)
            try self.storeSession(from: response, providerID: response.providerId ?? "password")
            self.statusMessage = "Signed in as \(response.email ?? email)."
            self.startBackgroundSyncIfPossible(forceRestart: true)
        }
    }

    func signUp(email: String, password: String) async {
        await performTask {
            let response = try await self.authenticate(endpoint: "accounts:signUp", email: email, password: password)
            try self.storeSession(from: response, providerID: response.providerId ?? "password")
            self.statusMessage = "Created Firebase account for \(response.email ?? email)."
            self.startBackgroundSyncIfPossible(forceRestart: true)
        }
    }

    func signInWithGoogle() async {
        await performTask {
            let config = try self.requireConfiguration()
            guard config.canUseGoogleSignIn else { throw FirebaseServiceError.server("Add a Google OAuth client ID before using Google Sign-In.") }
            #if canImport(AuthenticationServices) && canImport(UIKit) && canImport(CryptoKit)
            let coordinator = GoogleOAuthSessionCoordinator()
            let credential = try await coordinator.authenticate(clientID: config.googleClientID, redirectScheme: config.googleRedirectScheme, redirectURI: config.googleRedirectURI)
            let firebaseResponse = try await self.signInWithGoogleCredential(credential, configuration: config)
            try self.storeSession(from: firebaseResponse, providerID: firebaseResponse.providerId ?? "google.com")
            self.statusMessage = "Signed in with Google as \(firebaseResponse.email ?? "your Google account")."
            self.startBackgroundSyncIfPossible(forceRestart: true)
            #else
            throw FirebaseServiceError.googleSignInUnavailable
            #endif
        }
    }

    func signOut() {
        session = nil
        KeychainStore.delete(account: sessionKeychainKey)
        stopBackgroundSync()
        liveSyncState = autoSyncEnabled ? "Live merge sync enabled. Waiting for authentication." : "Cloud sync is off."
        statusMessage = "Signed out from Firebase."
    }

    func pushSnapshot(data: Data) async { await performTask { _ = try await self.pushSnapshotInternal(data: data, reason: "manual push") } }

    func pullSnapshot() async throws -> Data {
        try await performThrowingTask {
            let remote = try await self.fetchRemoteEnvelope()
            self.lastAppliedRemoteHash = remote.contentHash
            self.liveSyncState = "Pulled remote snapshot from Firestore."
            self.statusMessage = "Pulled snapshot from Firestore."
            return try self.encoder.encode(remote.envelope.snapshot)
        }
    }

    private func handleLocalPersist(notification: Notification) async {
        guard !ignoreNextLocalPersist else { ignoreNextLocalPersist = false; return }
        guard autoSyncEnabled, configuration?.isComplete == true, session != nil, let snapshotData = notification.userInfo?["snapshotData"] as? Data else { return }
        pendingPushTask?.cancel()
        pendingPushTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            guard let self, !Task.isCancelled else { return }
            do {
                _ = try await self.pushSnapshotInternal(data: snapshotData, reason: "auto push")
                self.liveSyncState = "Live merge sync: local changes uploaded."
            } catch {
                self.statusMessage = error.localizedDescription
                self.liveSyncState = "Live merge sync error: \(error.localizedDescription)"
            }
        }
    }

    private func startBackgroundSyncIfPossible(forceRestart: Bool) {
        guard autoSyncEnabled else { return }
        guard configuration?.isComplete == true else { liveSyncState = "Live merge sync enabled. Add Firebase configuration first."; return }
        guard session != nil else { liveSyncState = "Live merge sync enabled. Sign in to start syncing."; return }
        guard store != nil else { liveSyncState = "Live merge sync enabled. Waiting for the app store to attach."; return }
        if forceRestart { stopBackgroundSync(cancelMessage: false) }
        guard backgroundSyncTask == nil else { return }
        liveSyncState = "Live merge sync connected. Polling Firestore for changes."
        backgroundSyncTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    try await self.syncLoopTick()
                } catch {
                    await MainActor.run {
                        self.statusMessage = error.localizedDescription
                        self.liveSyncState = "Live merge sync error: \(error.localizedDescription)"
                    }
                }
                try? await Task.sleep(nanoseconds: self.syncPollIntervalNanoseconds)
            }
        }
    }

    private func stopBackgroundSync(cancelMessage: Bool = true) {
        backgroundSyncTask?.cancel(); backgroundSyncTask = nil
        pendingPushTask?.cancel(); pendingPushTask = nil
        if cancelMessage { liveSyncState = autoSyncEnabled ? "Live merge sync paused." : "Cloud sync is off." }
    }

    private func syncLoopTick() async throws {
        guard let store else { return }
        let remote = try await fetchRemoteEnvelope()
        let localData = try store.snapshotData()
        let localSnapshot = try decoder.decode(StudySnapshot.self, from: localData)
        let merged = mergeSnapshots(local: localSnapshot, remote: remote.envelope.snapshot)
        let mergedData = try encoder.encode(merged)
        let mergedHash = hashString(for: mergedData)
        let localHash = hashString(for: localData)
        if remote.contentHash != lastAppliedRemoteHash, remote.contentHash != lastPushedContentHash, mergedHash != localHash {
            ignoreNextLocalPersist = true
            store.replaceSnapshotFromCloudMerge(with: merged)
            lastAppliedRemoteHash = remote.contentHash
            liveSyncState = "Live merge sync: remote changes merged into local data."
            statusMessage = "Merged remote Firestore changes into the local snapshot."
        } else {
            lastAppliedRemoteHash = remote.contentHash
            liveSyncState = "Live merge sync connected. Up to date."
        }
    }

    private func authenticate(endpoint: String, email: String, password: String) async throws -> FirebaseAuthResponse {
        let config = try requireConfiguration()
        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/\(endpoint)?key=\(config.apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password, "returnSecureToken": true], options: [])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(data: data, response: response, defaultMessage: "Firebase auth failed.")
        return try decoder.decode(FirebaseAuthResponse.self, from: data)
    }

    private func signInWithGoogleCredential(_ credential: GoogleOAuthCredential, configuration: FirebaseConfiguration) async throws -> FirebaseAuthResponse {
        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=\(configuration.apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var postBodyParts = ["providerId=google.com", "access_token=\((credential.accessToken.addingPercentEncoding(withAllowedCharacters: CharacterSet.urlQueryAllowed) ?? credential.accessToken))"]
        if let idToken = credential.idToken, !idToken.isEmpty { postBodyParts.append("id_token=\((idToken.addingPercentEncoding(withAllowedCharacters: CharacterSet.urlQueryAllowed) ?? idToken))") }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["requestUri": configuration.googleRedirectURI, "postBody": postBodyParts.joined(separator: "&"), "returnSecureToken": true, "returnIdpCredential": true], options: [])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(data: data, response: response, defaultMessage: "Firebase Google sign-in failed.")
        return try decoder.decode(FirebaseAuthResponse.self, from: data)
    }

    private func pushSnapshotInternal(data: Data, reason: String) async throws -> String {
        let current = try await refreshedSessionIfNeeded()
        let config = try requireConfiguration()
        let snapshot = try decoder.decode(StudySnapshot.self, from: data)
        let envelope = FirebaseCloudEnvelope(writerDeviceID: deviceID, snapshot: normalize(snapshot: snapshot))
        let payloadData = try encoder.encode(envelope)
        let payloadString = String(decoding: payloadData, as: UTF8.self)
        let contentHash = hashString(for: payloadData)
        let url = try firestoreDocumentURL(projectID: config.projectID, userID: current.localID)
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(current.idToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["fields": ["payloadJson": ["stringValue": payloadString], "updatedAt": ["timestampValue": ISO8601DateFormatter().string(from: envelope.updatedAt)], "writerDeviceID": ["stringValue": deviceID], "contentHash": ["stringValue": contentHash]]], options: [])
        let (responseData, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(data: responseData, response: response, defaultMessage: "Cloud push failed.")
        lastPushedContentHash = contentHash
        statusMessage = "Cloud snapshot uploaded (\(reason))."
        return contentHash
    }

    private func fetchRemoteEnvelope() async throws -> RemoteEnvelopePayload {
        let current = try await refreshedSessionIfNeeded()
        let config = try requireConfiguration()
        let url = try firestoreDocumentURL(projectID: config.projectID, userID: current.localID)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(current.idToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw FirebaseServiceError.invalidResponse }
        if http.statusCode == 404 { throw FirebaseServiceError.missingRemoteSnapshot }
        try validateHTTPResponse(data: data, response: response, defaultMessage: "Cloud pull failed.")
        let document = try decoder.decode(FirestoreDocument.self, from: data)
        guard let fields = document.fields else { throw FirebaseServiceError.missingRemoteSnapshot }
        if let payloadJson = fields.payloadJson?.stringValue {
            let payloadData = Data(payloadJson.utf8)
            let envelope = try decoder.decode(FirebaseCloudEnvelope.self, from: payloadData)
            let contentHash = fields.contentHash?.stringValue ?? hashString(for: payloadData)
            return RemoteEnvelopePayload(envelope: normalize(envelope: envelope), contentHash: contentHash)
        }
        if let legacySnapshotJson = fields.snapshotJson?.stringValue {
            let snapshotData = Data(legacySnapshotJson.utf8)
            let snapshot = try decoder.decode(StudySnapshot.self, from: snapshotData)
            let updatedAtString = fields.updatedAt?.timestampValue
            let updatedAt = updatedAtString.flatMap { ISO8601DateFormatter().date(from: $0) } ?? .now
            let writerDeviceID = fields.writerDeviceID?.stringValue ?? "legacy"
            return RemoteEnvelopePayload(envelope: FirebaseCloudEnvelope(updatedAt: updatedAt, writerDeviceID: writerDeviceID, snapshot: normalize(snapshot: snapshot)), contentHash: hashString(for: snapshotData))
        }
        throw FirebaseServiceError.missingRemoteSnapshot
    }

    private func validateHTTPResponse(data: Data, response: URLResponse, defaultMessage: String) throws {
        guard let http = response as? HTTPURLResponse else { throw FirebaseServiceError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                if let error = object["error"] as? [String: Any], let message = error["message"] as? String { throw FirebaseServiceError.server(message.replacingOccurrences(of: "_", with: " ").capitalized) }
                if let message = object["error_description"] as? String { throw FirebaseServiceError.server(message) }
                if let message = object["error"] as? String { throw FirebaseServiceError.server(message) }
            }
            throw FirebaseServiceError.server("\(defaultMessage) Status \(http.statusCode).")
        }
    }

    private func storeSession(from response: FirebaseAuthResponse, providerID: String) throws {
        let session = FirebaseAuthSession(localID: response.localId, email: response.email ?? "", idToken: response.idToken, refreshToken: response.refreshToken, expiresAt: .now.addingTimeInterval(TimeInterval(response.expiresIn) ?? 3600), providerID: providerID)
        self.session = session
        KeychainStore.save(data: try encoder.encode(session), account: sessionKeychainKey)
    }

    private func refreshedSessionIfNeeded() async throws -> FirebaseAuthSession {
        guard var session else { throw FirebaseServiceError.unauthenticated }
        if !session.isExpired { return session }
        let config = try requireConfiguration()
        let url = URL(string: "https://securetoken.googleapis.com/v1/token?key=\(config.apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = formEncodedBody(["grant_type": "refresh_token", "refresh_token": session.refreshToken])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(data: data, response: response, defaultMessage: "Firebase token refresh failed.")
        let refreshed = try decoder.decode(FirebaseRefreshResponse.self, from: data)
        session.idToken = refreshed.id_token
        session.refreshToken = refreshed.refresh_token
        session.expiresAt = .now.addingTimeInterval(TimeInterval(refreshed.expires_in) ?? 3600)
        self.session = session
        KeychainStore.save(data: try encoder.encode(session), account: sessionKeychainKey)
        return session
    }

    private func requireConfiguration() throws -> FirebaseConfiguration {
        guard let configuration, configuration.isComplete else { throw FirebaseServiceError.missingConfiguration }
        return configuration
    }

    private func firestoreDocumentURL(projectID: String, userID: String) throws -> URL {
        guard let encodedProject = projectID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed), let encodedUser = userID.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed), let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(encodedProject)/databases/(default)/documents/users/\(encodedUser)/snapshots/current") else { throw FirebaseServiceError.invalidResponse }
        return url
    }

    private func performTask(_ block: @escaping () async throws -> Void) async {
        isWorking = true; defer { isWorking = false }
        do { try await block() } catch { statusMessage = error.localizedDescription }
    }

    private func performThrowingTask<T>(_ block: @escaping () async throws -> T) async throws -> T {
        isWorking = true; defer { isWorking = false }
        do { return try await block() } catch { statusMessage = error.localizedDescription; throw error }
    }

    private func normalize(envelope: FirebaseCloudEnvelope) -> FirebaseCloudEnvelope {
        var copy = envelope
        copy.snapshot = normalize(snapshot: envelope.snapshot)
        return copy
    }

    private func normalize(snapshot: StudySnapshot) -> StudySnapshot {
        var copy = snapshot
        copy.version = max(copy.version, StudySnapshot.currentVersion)
        copy.syncState = prune(syncState: copy.syncState, against: copy)
        return copy
    }

    private func prune(syncState: SnapshotSyncState, against snapshot: StudySnapshot) -> SnapshotSyncState {
        var pruned = syncState
        for folder in snapshot.folders where (pruned.deletedFolderTimestamps[folder.id.uuidString] ?? .distantPast) < folder.updatedAt { pruned.deletedFolderTimestamps.removeValue(forKey: folder.id.uuidString) }
        for cardSet in snapshot.cardSets where (pruned.deletedCardSetTimestamps[cardSet.id.uuidString] ?? .distantPast) < cardSet.updatedAt { pruned.deletedCardSetTimestamps.removeValue(forKey: cardSet.id.uuidString) }
        for tag in snapshot.tags where (pruned.deletedTagTimestamps[tag.id.uuidString] ?? .distantPast) < tag.updatedAt { pruned.deletedTagTimestamps.removeValue(forKey: tag.id.uuidString) }
        for card in snapshot.cards where (pruned.deletedCardTimestamps[card.id.uuidString] ?? .distantPast) < card.updatedAt { pruned.deletedCardTimestamps.removeValue(forKey: card.id.uuidString) }
        return pruned
    }

    private func mergeSnapshots(local: StudySnapshot, remote: StudySnapshot) -> StudySnapshot {
        let mergedSyncState = SnapshotSyncState(
            deletedFolderTimestamps: mergeTimestamps(local.syncState.deletedFolderTimestamps, remote.syncState.deletedFolderTimestamps),
            deletedCardSetTimestamps: mergeTimestamps(local.syncState.deletedCardSetTimestamps, remote.syncState.deletedCardSetTimestamps),
            deletedTagTimestamps: mergeTimestamps(local.syncState.deletedTagTimestamps, remote.syncState.deletedTagTimestamps),
            deletedCardTimestamps: mergeTimestamps(local.syncState.deletedCardTimestamps, remote.syncState.deletedCardTimestamps)
        )
        let mergedFolders = mergeEntities(local: local.folders, remote: remote.folders, tombstones: mergedSyncState.deletedFolderTimestamps, id: { $0.id }, updatedAt: { $0.updatedAt })
        let mergedCardSets = mergeEntities(local: local.cardSets, remote: remote.cardSets, tombstones: mergedSyncState.deletedCardSetTimestamps, id: { $0.id }, updatedAt: { $0.updatedAt })
        let mergedTags = mergeEntities(local: local.tags, remote: remote.tags, tombstones: mergedSyncState.deletedTagTimestamps, id: { $0.id }, updatedAt: { $0.updatedAt })
        let mergedCards = mergeEntities(local: local.cards, remote: remote.cards, tombstones: mergedSyncState.deletedCardTimestamps, id: { $0.id }, updatedAt: { $0.updatedAt })
        let mergedTheme = snapshotActivityDate(remote) > snapshotActivityDate(local) ? remote.theme : local.theme
        return normalize(snapshot: StudySnapshot(version: max(local.version, remote.version, StudySnapshot.currentVersion), theme: mergedTheme, folders: mergedFolders, cardSets: mergedCardSets, cards: mergedCards, tags: mergedTags, syncState: mergedSyncState))
    }

    private func mergeEntities<T>(local: [T], remote: [T], tombstones: [String: Date], id: (T) -> UUID, updatedAt: (T) -> Date) -> [T] {
        let localMap = Dictionary(uniqueKeysWithValues: local.map { (id($0).uuidString, $0) })
        let remoteMap = Dictionary(uniqueKeysWithValues: remote.map { (id($0).uuidString, $0) })
        let allIDs = Set(localMap.keys).union(remoteMap.keys).union(tombstones.keys)
        var merged: [T] = []
        for objectID in allIDs.sorted() {
            let chosen: T?
            switch (localMap[objectID], remoteMap[objectID]) {
            case let (left?, right?): chosen = updatedAt(left) >= updatedAt(right) ? left : right
            case let (left?, nil): chosen = left
            case let (nil, right?): chosen = right
            default: chosen = nil
            }
            guard let chosen else { continue }
            if let tombstoneDate = tombstones[objectID], tombstoneDate >= updatedAt(chosen) { continue }
            merged.append(chosen)
        }
        return merged
    }

    private func mergeTimestamps(_ lhs: [String: Date], _ rhs: [String: Date]) -> [String: Date] {
        var merged = lhs
        for (key, value) in rhs where (merged[key] ?? .distantPast) < value { merged[key] = value }
        return merged
    }

    private func snapshotActivityDate(_ snapshot: StudySnapshot) -> Date {
        let entityDates = snapshot.folders.map(\.updatedAt) + snapshot.cardSets.map(\.updatedAt) + snapshot.cards.map(\.updatedAt) + snapshot.tags.map(\.updatedAt)
        let tombstoneDates = Array(snapshot.syncState.deletedFolderTimestamps.values) + Array(snapshot.syncState.deletedCardSetTimestamps.values) + Array(snapshot.syncState.deletedTagTimestamps.values) + Array(snapshot.syncState.deletedCardTimestamps.values)
        return (entityDates + tombstoneDates).max() ?? .distantPast
    }

    private func hashString(for data: Data) -> String {
        #if canImport(CryptoKit)
        return SHA256.hash(data: data).compactMap { String(format: "%02x", $0) }.joined()
        #else
        return data.base64EncodedString()
        #endif
    }
}

private func formEncodedBody(_ values: [String: String]) -> Data {
    let body = values.map { key, value in
        let encodedKey = key.addingPercentEncoding(withAllowedCharacters: CharacterSet.urlQueryAllowed) ?? key
        let encodedValue = value.addingPercentEncoding(withAllowedCharacters: CharacterSet.urlQueryAllowed) ?? value
        return "\(encodedKey)=\(encodedValue)"
    }.sorted().joined(separator: "&")
    return Data(body.utf8)
}
