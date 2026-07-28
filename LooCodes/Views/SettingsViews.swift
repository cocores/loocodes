import SwiftUI

// MARK: - Notification Preferences
struct NotificationPrefsView: View {
    @State private var nearbyNew     = false
    @State private var codeVerified  = false
    @State private var codeFlagged   = false
    @State private var quietHours    = false
    @State private var weeklyDigest  = false
    @State private var comments      = false
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
                    get: { nearbyNew },
                    set: { if $0 { pendingPerm = .location } else { nearbyNew = false } }
                ))
                Toggle("Weekly digest", isOn: $weeklyDigest)
            }
            Section("My Codes") {
                Toggle("Code verified", isOn: Binding(
                    get: { codeVerified },
                    set: { if $0 { pendingPerm = .notification } else { codeVerified = false } }
                ))
                Toggle("Code flagged", isOn: Binding(
                    get: { codeFlagged },
                    set: { if $0 { pendingPerm = .notification } else { codeFlagged = false } }
                ))
                Toggle("Comments on my codes", isOn: $comments)
            }
            Section("Schedule") {
                Toggle("Quiet hours (10 PM – 8 AM)", isOn: $quietHours)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $pendingPerm) { perm in
            PermissionSheet(perm: perm) { granted in
                switch perm {
                case .location:     nearbyNew    = granted
                case .notification: codeVerified = granted; codeFlagged = granted
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
                    Label("Delete Account & Data", systemImage: "trash.fill")
                }
            } footer: {
                Text("LooCodes never sells your data. Location is used only to find nearby bathrooms.")
                    .font(.caption)
                    .foregroundStyle(Color(hex: "8888aa"))
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("Privacy")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete Account?", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {}
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your account and all codes you've shared.")
        }
    }
}

// MARK: - About LooCodes
struct AboutView: View {
    var body: some View {
        List {
            Section("App Info") {
                LabeledContent("Version", value: "1.0.0 (1)")
                LabeledContent("Bathrooms indexed", value: "12,847")
                LabeledContent("Cities covered", value: "284")
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
                    Label("Rate on App Store ⭐", systemImage: "star")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "1a1a1f"))
        .navigationTitle("About LooCodes")
        .navigationBarTitleDisplayMode(.inline)
    }
}
