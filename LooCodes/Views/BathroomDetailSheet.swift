import SwiftUI
import MapKit

struct BathroomDetailSheet: View {
    @Environment(BathroomStore.self) var store
    @Environment(LocationService.self) var locationService

    let bathroom: Bathroom
    @State private var copied = false
    @State private var showSuggestForm = false
    @State private var suggestionText = ""

    private var current: Bathroom {
        store.bathrooms.first { $0.id == bathroom.id } ?? bathroom
    }
    private var alreadyVotedUp: Bool { store.votedUpIds.contains(current.id) }
    private var alreadyFlagged: Bool { store.flaggedIds.contains(current.id) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {

                // Header
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 5) {
                            if current.isVerified {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundStyle(Color(hex: "5b9ef5"))
                            }
                            Text(current.name)
                                .font(.title2.weight(.bold))
                                .foregroundStyle(.white)
                        }
                        Text(current.address)
                            .font(.subheadline)
                            .foregroundStyle(Color(hex: "8888aa"))
                    }
                    Spacer()
                    DistanceBadge(text: locationService.distance(to: current.coordinate))
                }

                // Code box
                VStack(alignment: .leading, spacing: 8) {
                    Text("ACCESS CODE")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color(hex: "8888aa"))
                        .tracking(1.5)

                    HStack {
                        Text(current.code.isEmpty ? "FREE" : current.code)
                            .font(.system(size: 34, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(hex: "5b9ef5"))
                        Spacer()
                        Button {
                            UIPasteboard.general.string = current.code
                            copied = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
                        } label: {
                            Label(copied ? "Copied!" : "Copy",
                                  systemImage: copied ? "checkmark" : "doc.on.doc")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(copied ? Color(hex: "34c759") : Color(hex: "5b9ef5"))
                                .padding(.horizontal, 16).padding(.vertical, 8)
                                .background(copied ? Color(hex: "003015") : Color(hex: "0a1a40"))
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(16)
                .background(Color(hex: "252530"))
                .clipShape(RoundedRectangle(cornerRadius: 14))

                // Tags
                FlowLayout(spacing: 8) {
                    TypeBadge(type: current.type)
                    if current.isADAAccessible { ADABadge() }
                    PriceBadge(isFree: current.isFree, feeAmount: current.feeAmount)
                }

                // Accessibility row
                HStack(spacing: 8) {
                    Image(systemName: current.isADAAccessible ? "figure.roll" : "figure.walk")
                        .foregroundStyle(current.isADAAccessible ? Color(hex: "34c759") : Color(hex: "8888aa"))
                    Text(current.isADAAccessible ? "ADA accessible" : "Not marked as accessible")
                        .font(.subheadline)
                        .foregroundStyle(current.isADAAccessible ? Color(hex: "34c759") : Color(hex: "8888aa"))
                }

                // Note
                if !current.note.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Text("📝")
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Note")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color(hex: "8888aa"))
                            Text(current.note)
                                .font(.subheadline).italic()
                                .foregroundStyle(Color(hex: "aaaacc"))
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(hex: "252540"))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Stars
                HStack(spacing: 6) {
                    StarRating(rating: current.rating)
                    Text(String(format: "%.1f", current.rating))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: "f5a623"))
                    Spacer()
                    Text("\(current.upvoteCount) upvotes")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "8888aa"))
                }

                // "It Works" always stays clickable (each tap is a fresh
                // reconfirmation) and is independent of flagging — flagging
                // only disables itself, once per device, and resets this
                // device's own "It Works" check rather than blocking it.
                HStack(spacing: 12) {
                    Button {
                        store.voteUp(current.id)
                    } label: {
                        Label(alreadyVotedUp ? "✓ Works!" : "It Works",
                              systemImage: alreadyVotedUp ? "hand.thumbsup.fill" : "hand.thumbsup")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(alreadyVotedUp ? Color(hex: "1a1a1f") : Color(hex: "5b9ef5"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(alreadyVotedUp ? Color(hex: "5b9ef5") : Color(hex: "0a1a40"))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        store.flag(current.id)
                    } label: {
                        Label(alreadyFlagged ? "Flagged" : "Flag Stale",
                              systemImage: alreadyFlagged ? "flag.fill" : "flag")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(alreadyFlagged ? Color(hex: "ff9500") : Color(hex: "8888aa"))
                            .padding(.horizontal, 16).padding(.vertical, 14)
                            .background(alreadyFlagged ? Color(hex: "2a1500") : Color(hex: "252530"))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                            )
                    }
                    .disabled(alreadyFlagged)
                }

                // Opens Apple Maps with walking directions already started,
                // rather than just dropping a pin the user has to tap
                // "Directions" on themselves.
                Button {
                    let placemark = MKPlacemark(coordinate: current.coordinate)
                    let item      = MKMapItem(placemark: placemark)
                    item.name     = current.name
                    item.openInMaps(launchOptions: [
                        MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking,
                    ])
                } label: {
                    Label("Walking Directions", systemImage: "figure.walk")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(hex: "252530"))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
                        )
                }

                // Suggested updates
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Suggested Updates")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        if !showSuggestForm {
                            Button("+ Suggest an update") { showSuggestForm = true }
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color(hex: "5b9ef5"))
                        }
                    }

                    if showSuggestForm {
                        VStack(alignment: .leading, spacing: 8) {
                            TextField(
                                "e.g. Code changed to 5555, or the door is locked after 8pm…",
                                text: $suggestionText,
                                axis: .vertical
                            )
                            .lineLimit(2, reservesSpace: true)
                            .textFieldStyle(DarkTextFieldStyle())

                            HStack {
                                Button("Cancel") {
                                    showSuggestForm = false
                                    suggestionText = ""
                                }
                                .foregroundStyle(Color(hex: "8888aa"))
                                Spacer()
                                Button("Submit") {
                                    store.suggest(current.id, text: suggestionText)
                                    suggestionText = ""
                                    showSuggestForm = false
                                }
                                .disabled(suggestionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color(hex: "5b9ef5"))
                            }
                        }
                    }

                    if current.suggestions.isEmpty {
                        Text("No suggested updates yet.")
                            .font(.caption)
                            .foregroundStyle(Color(hex: "8888aa"))
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(current.suggestions.sorted(by: { $0.createdAt > $1.createdAt })) { s in
                                Text(s.text)
                                    .font(.caption)
                                    .foregroundStyle(Color(hex: "aaaacc"))
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(hex: "252530"))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(20)
        }
        .background(Color(hex: "1a1a1f"))
        .presentationBackground(Color(hex: "1a1a1f"))
    }
}
