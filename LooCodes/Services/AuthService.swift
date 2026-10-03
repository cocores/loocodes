import AuthenticationServices
import CryptoKit
import FirebaseAuth
import GoogleSignIn
import Observation
import UIKit

/// Wraps Firebase Auth for the app's two sign-in methods. Apple uses the
/// native ASAuthorizationController flow (required for the "Sign in with
/// Apple" button/branding — a generic web-based OAuth flow isn't accepted
/// here); Google uses the GoogleSignIn SDK rather than Firebase's generic
/// OAuthProvider, since Google's own sign-in endpoint blocks the embedded
/// web views that generic OAuth would otherwise use.
@Observable
final class AuthService {
    var user: User?
    var isLoading = true
    var errorMessage: String?
    /// Stored on this account's Firestore profile, not locally, so it's
    /// consistent across every device this account signs into.
    var notificationPrefs = NotificationPrefs()
    /// At most one of these two is ever non-nil — see FirestoreService's
    /// avatar functions.
    var avatarPhoto: UIImage?
    var avatarEmoji: String?

    private var authStateHandle: AuthStateDidChangeListenerHandle?
    private var currentNonce: String?

    func start() {
        guard authStateHandle == nil else { return }
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.user = user
            self?.isLoading = false
            guard let uid = user?.uid else {
                self?.notificationPrefs = NotificationPrefs()
                self?.avatarPhoto = nil
                self?.avatarEmoji = nil
                return
            }
            Task { await self?.loadNotificationPrefs(uid: uid) }
            Task { await self?.loadAvatar(uid: uid) }
        }
    }

    // MARK: - Notification preferences

    /// A brand-new sign-in's profile doc may not exist yet (upsertUserProfile
    /// runs fire-and-forget right after sign-in below) — fetchNotificationPrefs
    /// already falls back to all-off defaults for a missing doc/field, which
    /// is the right value for a brand-new account anyway, so there's nothing
    /// to race here.
    @MainActor
    private func loadNotificationPrefs(uid: String) async {
        do {
            notificationPrefs = try await FirestoreService.fetchNotificationPrefs(uid: uid)
        } catch {
            print("Failed to load notification prefs:", error)
        }
    }

    /// Patches just the fields the transform touches and persists the full
    /// resulting object — callers never need to read the current value
    /// first. Patched into local state *before* the network call, same
    /// reasoning as BathroomStore's optimistic writes.
    func updateNotificationPrefs(_ transform: (inout NotificationPrefs) -> Void) {
        guard let uid = user?.uid else { return }
        var next = notificationPrefs
        transform(&next)
        notificationPrefs = next
        Task {
            do {
                try await FirestoreService.updateNotificationPrefs(uid: uid, prefs: next)
            } catch {
                print("Failed to update notification prefs:", error)
            }
        }
    }

    // MARK: - Avatar

    /// Same "missing doc/field falls back to a safe default" reasoning as
    /// loadNotificationPrefs above.
    @MainActor
    private func loadAvatar(uid: String) async {
        do {
            let avatar = try await FirestoreService.fetchAvatar(uid: uid)
            avatarPhoto = avatar.photo
            avatarEmoji = avatar.emoji
        } catch {
            print("Failed to load avatar:", error)
        }
    }

    /// Patched into local state *before* the network call, same reasoning
    /// as updateNotificationPrefs above — persists to this account's
    /// Firestore profile, so it loads on every device/session this account
    /// signs into, not just this one.
    func setAvatarPhoto(_ image: UIImage) {
        guard let uid = user?.uid else { return }
        avatarPhoto = image
        avatarEmoji = nil
        Task {
            do {
                try await FirestoreService.setAvatarPhoto(uid: uid, image: image)
            } catch {
                print("Failed to set avatar photo:", error)
            }
        }
    }

    func setAvatarEmoji(_ emoji: String) {
        guard let uid = user?.uid else { return }
        avatarEmoji = emoji
        avatarPhoto = nil
        Task {
            do {
                try await FirestoreService.setAvatarEmoji(uid: uid, emoji: emoji)
            } catch {
                print("Failed to set avatar emoji:", error)
            }
        }
    }

    func clearAvatar() {
        guard let uid = user?.uid else { return }
        avatarPhoto = nil
        avatarEmoji = nil
        Task {
            do {
                try await FirestoreService.clearAvatar(uid: uid)
            } catch {
                print("Failed to clear avatar:", error)
            }
        }
    }

    deinit {
        if let authStateHandle {
            Auth.auth().removeStateDidChangeListener(authStateHandle)
        }
    }

    // MARK: - Sign in with Apple

    /// Called from the SwiftUI `SignInWithAppleButton`'s `onRequest`.
    func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonceString()
        currentNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)
    }

    /// Called from the SwiftUI `SignInWithAppleButton`'s `onCompletion`.
    func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            // The user tapping Cancel on the system sheet surfaces here too
            // (ASAuthorizationError.canceled) — not a real failure worth
            // showing as an error.
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                self.errorMessage = error.localizedDescription
            }
        case .success(let authorization):
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let nonce = currentNonce,
                let tokenData = credential.identityToken,
                let tokenString = String(data: tokenData, encoding: .utf8)
            else {
                self.errorMessage = "Apple sign-in failed. Please try again."
                return
            }

            // The long-standing, version-stable form of this call — it
            // doesn't carry `fullName` (Apple only hands that over once,
            // on this exact credential object, not the resulting Firebase
            // user), so displayName(from:fallback:) below reads it
            // straight off `credential` instead.
            let firebaseCredential = OAuthProvider.credential(
                withProviderID: "apple.com",
                idToken: tokenString,
                rawNonce: nonce
            )

            Task {
                do {
                    let result = try await Auth.auth().signIn(with: firebaseCredential)
                    try await FirestoreService.upsertUserProfile(
                        uid: result.user.uid,
                        displayName: self.displayName(from: credential.fullName, fallback: result.user.displayName),
                        email: result.user.email,
                        provider: "apple.com"
                    )
                } catch {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func displayName(from nameComponents: PersonNameComponents?, fallback: String?) -> String {
        if let nameComponents {
            let formatted = PersonNameComponentsFormatter().string(from: nameComponents)
            if !formatted.isEmpty { return formatted }
        }
        return fallback?.isEmpty == false ? fallback! : "LooCodes User"
    }

    // MARK: - Sign in with Google

    @MainActor
    func signInWithGoogle() {
        guard let rootViewController = Self.topViewController() else {
            errorMessage = "Couldn't present Google sign-in. Please try again."
            return
        }
        Task {
            do {
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
                guard let idToken = result.user.idToken?.tokenString else {
                    self.errorMessage = "Google sign-in failed. Please try again."
                    return
                }
                let credential = GoogleAuthProvider.credential(
                    withIDToken: idToken,
                    accessToken: result.user.accessToken.tokenString
                )
                let authResult = try await Auth.auth().signIn(with: credential)
                try await FirestoreService.upsertUserProfile(
                    uid: authResult.user.uid,
                    displayName: authResult.user.displayName ?? "LooCodes User",
                    email: authResult.user.email,
                    provider: "google.com"
                )
            } catch {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Sign out / delete

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        try? Auth.auth().signOut()
    }

    /// Permanently deletes this account's Firestore profile and Firebase
    /// Auth user. Never touches bathrooms/suggestions the account
    /// submitted — those stay public. Firebase requires a "recent"
    /// sign-in for this; if it's been a while, this fails and the caller
    /// should ask the user to sign in again and retry.
    @discardableResult
    func deleteAccount() async -> Bool {
        guard let current = Auth.auth().currentUser else { return false }
        do {
            try? await FirestoreService.deleteUserProfile(uid: current.uid)
            try await current.delete()
            return true
        } catch let error as NSError {
            errorMessage = AuthErrorCode(rawValue: error.code) == .requiresRecentLogin
                ? "For security, please sign out and sign back in before deleting your account."
                : error.localizedDescription
            return false
        }
    }

    // MARK: - Helpers

    private static func topViewController() -> UIViewController? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }?
            .rootViewController
    }

    private static func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length

        while remainingLength > 0 {
            var randoms = [UInt8](repeating: 0, count: 16)
            let status = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
            precondition(status == errSecSuccess)

            for random in randoms where remainingLength > 0 {
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        let hashed = SHA256.hash(data: Data(input.utf8))
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
}
