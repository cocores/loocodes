import SwiftUI
import PhotosUI

struct ProfileView: View {
    @Environment(BathroomStore.self) var store

    @State private var showPhotoOptions = false
    @State private var showPhotoPicker  = false
    @State private var showEmojiPicker  = false
    @State private var selectedPhoto: PhotosPickerItem? = nil
    @State private var avatarImage: Image?  = nil
    @State private var avatarEmoji: String? = nil

    @State private var showNotifPrefs = false
    @State private var showPrivacy    = false
    @State private var showAbout      = false

    private var myCodes:       [Bathroom] { store.myCodes() }
    private var totalUpvotes:  Int        { myCodes.reduce(0) { $0 + $1.upvoteCount } }
    private var verifiedCount: Int        { myCodes.filter { $0.isVerified }.count }

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

                    Text("@loocodes_user")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)

                    // Stats
                    HStack(spacing: 0) {
                        StatBubble(value: myCodes.count,  label: "Shared")
                        Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                        StatBubble(value: totalUpvotes,   label: "Upvotes")
                        Divider().frame(height: 36).background(Color(hex: "3a3a4a"))
                        StatBubble(value: verifiedCount,  label: "Verified")
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
                                MyCodeCard(bathroom: b)
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
    var body: some View {
        HStack(spacing: 12) {
            Text(bathroom.type.emoji)
                .font(.title2)
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
