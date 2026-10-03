import SwiftUI

// MARK: - Notification Preferences
struct NotificationPrefsView: View {
    // Persisted on this account's Firestore profile (notificationPrefs)
    // rather than local-only @State — these used to just reset to off every
    // time this screen was reopened, which made them look broken even when
    // "on."
    @Environment(AuthService.self) var authService
    @State private var pendingPerm: PermType? = nil

    enum PermType: Identifiable {
        case location, notification
        var id: Int { hashValue }
        var title: String {
            switch self { case .location: return "Allow Location Access"
                          case .notification: return "Allow Notifications" }
        }
        var icon: String {
            switch self { case .location: return "location.fill"
                          case .notification: return "bell.badge.fill" }
        }
        var body: String {
            switch self {
            case .location:
                return "LooCodes uses your location to alert you when new bathroom codes are shared nearby."
            case .notification:
                return "LooCodes will notify you when your shared codes receive upvotes or are flagged as stale."
            }
        }
    }

    var body: some View {
        List {
            Section("Nearby") {
                Toggle("New codes near me", isOn: Binding(
                    get: { authService.notificationPrefs.nearbyNew },
                    set: { on in
                        if on { pendingPerm = .location }
                        else { authService.updateNotificationPrefs { $0.nearbyNew = false } }
                    }
                ))
                Toggle("Weekly digest", isOn: Binding(
                    get: { authService.notificationPrefs.weeklyDigest },
                    set: { on in authService.updateNotificationPrefs { $0.weeklyDigest = on } }
                ))
            }
            Section("My Codes") {
                Toggle("Code verified", isOn: Binding(
                    get: { authService.notificationPrefs.codeVerified },
                    set: { on in
                        if on { pendingPerm = .notification }
                        else { authService.updateNotificationPrefs { $0.codeVerified = false } }
                    }
                ))
                Toggle("Code flagged", isOn: Binding(
                    get: { authService.notificationPrefs.codeFlagged },
                    set: { on in
                        if on { pendingPerm = .notification }
                        else { authService.updateNotificationPrefs { $0.codeFlagged = false } }
                    }
                ))
                Toggle("Suggestions on my codes", isOn: Binding(
                    get: { authService.notificationPrefs.suggestions },
                    set: { on in authService.updateNotificationPrefs { $0.suggestions = on } }
                ))
            }
            Section("Schedule") {
                Toggle("Quiet hours (10 PM – 8 AM)", isOn: Binding(
                    get: { authService.notificationPrefs.quietHours },
                    set: { on in authService.updateNotificationPrefs { $0.quietHours = on } }
                ))
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $pendingPerm) { perm in
            PermissionSheet(perm: perm) { granted in
                switch perm {
                case .location:
                    authService.updateNotificationPrefs { $0.nearbyNew = granted }
                case .notification:
                    authService.updateNotificationPrefs { $0.codeVerified = granted; $0.codeFlagged = granted }
                }
                pendingPerm = nil
            }
        }
    }
}

struct PermissionSheet: View {
    let perm: NotificationPrefsView.PermType
    let onDecide: (Bool) -> Void
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: perm.icon)
                .font(.system(size: 56))
                .foregroundStyle(Color(hex: "5b9ef5"))

            Text(perm.title)
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)

            Text(perm.body)
                .font(.subheadline)
                .foregroundStyle(Color(hex: "8888aa"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            VStack(spacing: 12) {
                Button {
                    onDecide(true); dismiss()
                } label: {
                    Text("Allow")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(hex: "5b9ef5"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                Button {
                    onDecide(false); dismiss()
                } label: {
                    Text("Don't Allow")
                        .font(.subheadline)
                        .foregroundStyle(Color(hex: "8888aa"))
                }
            }
            .padding(.horizontal, 28)
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .background(Color(hex: "1a1a1f"))
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .presentationBackground(Color(hex: "1a1a1f"))
    }
}

// MARK: - Privacy Settings
struct PrivacySettingsView: View {
    @Environment(AuthService.self) var authService
    @Environment(\.dismiss) var dismiss

    @State private var preciseLocation    = true
    @State private var backgroundLocation = false
    @State private var analytics          = false
    @State private var personalized       = false
    @State private var showDeleteAlert    = false

    var body: some View {
        List {
            Section("Location") {
                Toggle("Precise location",    isOn: $preciseLocation)
                Toggle("Background location", isOn: $backgroundLocation)
            }

            Section("Data & Personalization") {
                Toggle("Anonymous analytics",       isOn: $analytics)
                Toggle("Personalized suggestions",  isOn: $personalized)
            }

            Section {
                Button(role: .destructive) { showDeleteAlert = true } label: {
                    Label("Delete Account", systemImage: "trash.fill")
                }
            } footer: {
                if let errorMessage = authService.errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "ff4d4f"))
                } else {
                    Text("LooCodes never sells your data. Location is used only to find nearby bathrooms.")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "8888aa"))
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("Privacy")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete Account?", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                Task {
                    // On success, AuthService.user clears and AuthGate (in
                    // LooCodesApp.swift) swaps straight to LoginView — no
                    // dismiss() needed. On failure, errorMessage above
                    // explains why (most commonly: sign in again first).
                    await authService.deleteAccount()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your LooCodes account and sign-in. Codes you've already shared stay public for others to use — they just won't show under \"My Codes\" for you anymore, since you won't be signed in to see them.")
        }
    }
}

// MARK: - About LooCodes
struct AboutView: View {
    @Environment(BathroomStore.self) var store

    var body: some View {
        List {
            Section("App Info") {
                LabeledContent("Version", value: "1.0.0 (1)")
                LabeledContent("Bathrooms indexed", value: "\(store.bathrooms.count)")
            }

            Section("Legal") {
                Link(destination: URL(string: "https://loocodes.app/terms")!) {
                    Label("Terms of Service", systemImage: "doc.text")
                }
                Link(destination: URL(string: "https://loocodes.app/privacy")!) {
                    Label("Privacy Policy", systemImage: "hand.raised")
                }
                Link(destination: URL(string: "https://loocodes.app/licenses")!) {
                    Label("Open Source Licenses", systemImage: "curlybraces")
                }
            }

            Section("Support") {
                Link(destination: URL(string: "mailto:hello@loocodes.app")!) {
                    Label("Contact Us", systemImage: "envelope")
                }
                Link(destination: URL(string: "https://apps.apple.com")!) {
                    Label("Rate on App Store", systemImage: "star")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("About LooCodes")
        .navigationBarTitleDisplayMode(.inline)
    }
}
