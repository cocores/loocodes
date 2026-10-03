import SwiftUI
import PhotosUI

struct ProfileView: View {
    @Environment(BathroomStore.self) var store
    @Environment(AuthService.self) var authService

    @State private var showPhotoOptions = false
    @State private var showPhotoPicker  = false
    @State private var showEmojiPicker  = false
    @State private var selectedPhoto: PhotosPickerItem? = nil
    @State private var avatarImage: Image?  = nil
    @State private var avatarEmoji: String? = nil

    @State private var showNotifPrefs   = false
    @State private var showPrivacy      = false
    @State private var showAbout        = false
    @State private var showLogoutAlert  = false

    private var displayName: String {
        let name = authService.user?.displayName
        let email = authService.user?.email
        if let name, !name.isEmpty { return name }
        if let email, !email.isEmpty { return email }
        return "LooCodes User"
    }

    private var myCodes:       [Bathroom] { store.myCodes() }
    private var totalUpvotes:  Int        { myCodes.reduce(0) { $0 + $1.upvoteCount } }
    private var verifiedCount: Int        { myCodes.filter { $0.isVerified }.count }

    // What this account has submitted — a "code" is a listing someone needs
    // an actual code for; everything else (free public restrooms, etc.) is
    // just a shared location.
    private var codesAddedCount:     Int { myCodes.filter { !$0.code.trimmingCharacters(in: .whitespaces).isEmpty }.count }
    private var locationsAddedCount: Int { myCodes.count - codesAddedCount }
    // What this account has *done* elsewhere, as opposed to received on its
    // own submissions above — derived the same way the shared "✓ Works!"/
    // flagged display is (each bathroom's own voters/flaggers arrays), not
    // tracked separately, so it stays consistent across devices.
    private var confirmedByMeCount: Int { store.votedUpIds.count }
    private var flaggedByMeCount:   Int { store.flaggedIds.count }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {

                    // Avatar
                    Button { showPhotoOptions = true } label: {
                        ZStack(alignment: .bottomTrailing) {
                            avatarView
                            Image(systemName: "pencil.circle.fill")
                                .font(.title3)
                                .foregroundStyle(Color(hex: "5b9ef5"))
                                .background(Color(hex: "1a1a1f"), in: Circle())
                                .offset(x: 4, y: 4)
                        }
                    }
                    .padding(.top, 20)

                    Text(displayName)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)

                    // Stats
                    VStack(spacing: 10) {
                        HStack(spacing: 0) {
                            StatBubble(value: codesAddedCount,     label: "Codes Added")
                            Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                            StatBubble(value: locationsAddedCount, label: "Locations Added")
                            Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                            StatBubble(value: verifiedCount,       label: "Verified")
                        }
                        HStack(spacing: 0) {
                            StatBubble(value: totalUpvotes,        label: "Upvotes")
                            Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                            StatBubble(value: confirmedByMeCount,  label: "Marked Working")
                            Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                            StatBubble(value: flaggedByMeCount,    label: "Flagged")
                        }
                    }
                    .padding(.vertical, 16)
                    .background(Color(hex: "252530"))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                    )
                    .padding(.horizontal, 20)

                    // My Codes
                    VStack(alignment: .leading, spacing: 12) {
                        Text("My Codes")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 20)

                        if myCodes.isEmpty {
                            Text("You haven't shared any codes yet.")
                                .font(.subheadline)
                                .foregroundStyle(Color(hex: "8888aa"))
                                .padding(.horizontal, 20)
                        } else {
                            ForEach(myCodes) { b in
                                MyCodeCard(bathroom: b, showSuggestionBadge: authService.notificationPrefs.suggestions)
                                    .padding(.horizontal, 20)
                            }
                        }
                    }

                    // Settings
                    VStack(spacing: 0) {
                        SettingsRow(icon: "bell.fill",      label: "Notification preferences") { showNotifPrefs = true }
                        Divider().background(Color(hex: "3a3a4a")).padding(.leading, 54)
                        SettingsRow(icon: "lock.fill",      label: "Privacy settings")         { showPrivacy    = true }
                        Divider().background(Color(hex: "3a3a4a")).padding(.leading, 54)
                        SettingsRow(icon: "info.circle.fill", label: "About LooCodes")         { showAbout      = true }
                        Divider().background(Color(hex: "3a3a4a")).padding(.leading, 54)
                        SettingsRow(icon: "rectangle.portrait.and.arrow.right", label: "Logout") { showLogoutAlert = true }
                    }
                    .background(Color(hex: "252530"))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                }
            }
            .background(Color(hex: "1a1a1f"))
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(isPresented: $showNotifPrefs) { NotificationPrefsView() }
            .navigationDestination(isPresented: $showPrivacy)    { PrivacySettingsView() }
            .navigationDestination(isPresented: $showAbout)      { AboutView() }
            .alert("Logout?", isPresented: $showLogoutAlert) {
                Button("Logout", role: .destructive) { authService.signOut() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("You'll be signed out of LooCodes on this device. Your codes and account stay exactly as they are — sign back in anytime to pick up where you left off.")
            }
        }
        .confirmationDialog("Change Photo", isPresented: $showPhotoOptions, titleVisibility: .visible) {
            Button("Photo Library")  { showPhotoPicker = true }
            Button("Choose Emoji")   { showEmojiPicker = true }
            if avatarImage != nil || avatarEmoji != nil {
                Button("Reset to Default", role: .destructive) {
                    avatarImage = nil; avatarEmoji = nil
                }
            }
            Button("Cancel", role: .cancel) {}
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhoto, matching: .images)
        .sheet(isPresented: $showEmojiPicker) {
            EmojiPickerSheet(selected: $avatarEmoji)
        }
        .onChange(of: selectedPhoto) { _, item in
            Task {
                if let data = try? await item?.loadTransferable(type: Data.self),
                   let ui = UIImage(data: data) {
                    avatarImage = Image(uiImage: ui)
                    avatarEmoji = nil
                }
            }
        }
    }

    @ViewBuilder
    private var avatarView: some View {
        if let img = avatarImage {
            img.resizable().scaledToFill()
                .frame(width: 88, height: 88)
                .clipShape(Circle())
        } else if let emoji = avatarEmoji {
            Text(emoji).font(.system(size: 52))
                .frame(width: 88, height: 88)
                .background(Color(hex: "252530"), in: Circle())
        } else {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 88))
                .foregroundStyle(Color(hex: "5b9ef5"))
        }
    }
}

// MARK: - Stat Bubble
struct StatBubble: View {
    let value: Int
    let label: String
    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.title2.weight(.bold))
                .foregroundStyle(Color(hex: "5b9ef5"))
            Text(label)
                .font(.caption)
                .foregroundStyle(Color(hex: "8888aa"))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - My Code Card
struct MyCodeCard: View {
    let bathroom: Bathroom
    let showSuggestionBadge: Bool
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: bathroom.type.sfSymbol)
                .font(.title3)
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(bathroom.type.tagBgColor)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 3) {
                Text(bathroom.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Text(bathroom.address)
                    .font(.caption)
                    .foregroundStyle(Color(hex: "8888aa"))
                // Gated on the "Suggestions on my codes" notification
                // preference — the one real, visible effect that toggle
                // has, since there's no push-notification delivery behind
                // any of these prefs.
                if showSuggestionBadge && !bathroom.suggestions.isEmpty {
                    Text("💬 \(bathroom.suggestions.count) suggestion\(bathroom.suggestions.count == 1 ? "" : "s")")
                        .font(.caption2)
                        .foregroundStyle(Color(hex: "5b9ef5"))
                }
            }
            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                CodeBadge(code: bathroom.code, isFreeNoCode: bathroom.isFree && bathroom.code.isEmpty)
                if bathroom.isVerified {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "5b9ef5"))
                }
            }
        }
        .padding(12)
        .background(Color(hex: "252530"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
        )
    }
}

// MARK: - Settings Row
struct SettingsRow: View {
    let icon: String
    let label: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .foregroundStyle(Color(hex: "5b9ef5"))
                    .frame(width: 28)
                Text(label).foregroundStyle(.white)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(hex: "8888aa"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
    }
}

// MARK: - Emoji Picker
struct EmojiPickerSheet: View {
    @Binding var selected: String?
    @Environment(\.dismiss) var dismiss

    private let emojis = [
        "😀","😎","🤓","🧑","👩","🧔","👨‍💻","🧕","🦸","🧙",
        "🐶","🦊","🐱","🐨","🐼","🦋","🌊","🏔","🌟","🔑",
        "🚽","🚻","🗝","🪠","💧","🏠","📍","⭐","🎯","🛡"
    ]

    var body: some View {
        NavigationStack {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
                ForEach(emojis, id: \.self) { e in
                    Button { selected = e; dismiss() } label: {
                        Text(e).font(.system(size: 44))
                    }
                }
            }
            .padding(24)
            .background(Color(hex: "1a1a1f"))
            .navigationTitle("Choose Avatar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationBackground(Color(hex: "1a1a1f"))
    }
}
