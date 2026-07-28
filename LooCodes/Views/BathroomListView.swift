import SwiftUI

struct BathroomListView: View {
    @Environment(BathroomStore.self) var store
    @Environment(LocationService.self) var locationService

    @State private var selectedType: BathroomType? = nil
    @State private var adaOnly                     = false
    @State private var selected: Bathroom?         = nil

    private var filtered: [Bathroom] {
        store.bathrooms.filter {
            (selectedType == nil || $0.type == selectedType) &&
            (!adaOnly || $0.isADAAccessible)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip("All", isSelected: selectedType == nil && !adaOnly) {
                            selectedType = nil; adaOnly = false
                        }
                        ForEach(BathroomType.allCases) { t in
                            FilterChip("\(t.emoji) \(t.rawValue)", isSelected: selectedType == t) {
                                selectedType = (selectedType == t) ? nil : t
                            }
                        }
                        FilterChip("♿ ADA", isSelected: adaOnly, isDashed: true) {
                            adaOnly.toggle()
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .background(Color(hex: "1a1a1f"))

                // Count header
                HStack {
                    Text("\(filtered.count) Location\(filtered.count == 1 ? "" : "s") Found")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: "8888aa"))
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "1a1a1f"))

                if filtered.isEmpty {
                    ContentUnavailableView(
                        "No bathrooms found",
                        systemImage: "toilet",
                        description: Text("Try a different filter")
                    )
                    .frame(maxHeight: .infinity)
                    .background(Color(hex: "1a1a1f"))
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filtered) { b in
                                BathroomCard(bathroom: b)
                                    .onTapGesture { selected = b }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                        .padding(.bottom, 24)
                    }
                    .background(Color(hex: "1a1a1f"))
                }
            }
            .background(Color(hex: "1a1a1f"))
            .navigationTitle("LooCodes")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(item: $selected) { b in
            BathroomDetailSheet(bathroom: b)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Bathroom Card
struct BathroomCard: View {
    @Environment(BathroomStore.self) var store
    @Environment(LocationService.self) var locationService

    let bathroom: Bathroom

    private var current: Bathroom {
        store.bathrooms.first { $0.id == bathroom.id } ?? bathroom
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            // Name + distance
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 5) {
                        if current.isVerified {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.caption)
                                .foregroundStyle(Color(hex: "5b9ef5"))
                        }
                        Text(current.name)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(current.isVerified ? Color(hex: "5b9ef5") : .white)
                    }
                    Text(current.address)
                        .font(.caption)
                        .foregroundStyle(Color(hex: "8888aa"))
                }
                Spacer()
                DistanceBadge(text: locationService.distance(to: current.coordinate))
            }

            // Tags
            FlowLayout(spacing: 6) {
                TypeBadge(type: current.type)
                CodeBadge(code: current.code, isFreeNoCode: current.isFree && current.code.isEmpty)
                if current.isADAAccessible { ADABadge() }
                PriceBadge(isFree: current.isFree, feeAmount: current.feeAmount)
            }

            // Stars + upvotes
            HStack(spacing: 6) {
                StarRating(rating: current.rating)
                Text(String(format: "%.1f", current.rating))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(hex: "f5a623"))
                Spacer()
                Text("\(current.upvoteCount) votes")
                    .font(.caption2)
                    .foregroundStyle(Color(hex: "8888aa"))
            }

            // Note
            if !current.note.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    Text("📝").font(.caption)
                    Text(current.note)
                        .font(.caption).italic()
                        .foregroundStyle(Color(hex: "aaaacc"))
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Color(hex: "252540"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Vote buttons — mutually exclusive
            HStack(spacing: 10) {
                Button {
                    store.voteUp(current.id)
                } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(current.hasVotedUp ? Color(hex: "5b9ef5") : Color(hex: "5b9ef5").opacity(0.3))
                            .frame(width: 8, height: 8)
                        Text(current.hasVotedUp ? "✓ Works!" : "It Works")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(current.hasVotedUp ? Color(hex: "1a1a1f") : Color(hex: "5b9ef5"))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(current.hasVotedUp ? Color(hex: "5b9ef5") : Color(hex: "0a1a40"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(current.hasVotedUp || current.hasFlagged)
                .opacity(current.hasFlagged ? 0.3 : 1)

                Button {
                    store.flag(current.id)
                } label: {
                    Image(systemName: current.hasFlagged ? "flag.fill" : "flag")
                        .foregroundStyle(current.hasFlagged ? Color(hex: "ff9500") : Color(hex: "8888aa"))
                        .frame(width: 44, height: 44)
                        .background(current.hasFlagged ? Color(hex: "2a1500") : Color(hex: "252530"))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(current.hasVotedUp || current.hasFlagged)
                .opacity(current.hasVotedUp ? 0.3 : 1)
            }
        }
        .padding(14)
        .background(Color(hex: "252530"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(Color(hex: "3a3a4a"), lineWidth: 0.5)
        )
    }
}
