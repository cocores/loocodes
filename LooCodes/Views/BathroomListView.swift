import SwiftUI

struct BathroomListView: View {
    @Environment(BathroomStore.self) var store
    @Environment(LocationService.self) var locationService

    @State private var selectedType: BathroomType? = nil
    @State private var adaOnly                     = false
    @State private var selected: Bathroom?         = nil

    // Bathrooms in a different city entirely aren't "found" for this user —
    // scope to a local radius once we have a location fix (mirrors the web
    // app's Close By/Further Away cutoff). Unknown location falls back to
    // showing everything rather than hiding results outright.
    private static let localAreaMaxMiles: Double = 15

    private var filtered: [Bathroom] {
        store.bathrooms.filter {
            guard (selectedType == nil || $0.type == selectedType) &&
                (!adaOnly || $0.isADAAccessible) else { return false }
            guard let miles = locationService.distanceMiles(to: $0.coordinate) else { return true }
            return miles < Self.localAreaMaxMiles
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
                            FilterChip(t.label, icon: t.sfSymbol, isSelected: selectedType == t) {
                                selectedType = (selectedType == t) ? nil : t
                            }
                        }
                        FilterChip("ADA", icon: "figure.roll", isSelected: adaOnly, isDashed: true) {
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
    // Shared, not per-account: once anyone confirms "It Works," it reads as
    // confirmed for every visitor, not just the account that tapped it — same
    // for a flag. Only whether *this* account can still tap Flag (to avoid a
    // wasted write the rules would reject anyway, since it's one flag per
    // account) stays per-account.
    private var isConfirmedWorking: Bool { current.hasVotedUp }
    private var hasBeenFlagged: Bool { current.flagCount > 0 }
    private var alreadyFlaggedByMe: Bool { store.flaggedIds.contains(current.id) }

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
                    Image(systemName: "note.text")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "aaaacc"))
                    Text(current.note)
                        .font(.caption).italic()
                        .foregroundStyle(Color(hex: "aaaacc"))
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Color(hex: "252540"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            if hasBeenFlagged {
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "flag.fill")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "ff9500"))
                    Text("Flagged — someone reported this may be incorrect or no longer available.")
                        .font(.caption)
                        .foregroundStyle(Color(hex: "ff9500"))
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Color(hex: "2a1500"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // "It Works" always stays clickable (each tap is a fresh
            // reconfirmation) and is independent of flagging — flagging only
            // disables itself, once per account, and resets the shared
            // "It Works" check rather than blocking the other button. Both
            // the checkmark and the flagged note are shared state (read off
            // the document itself), not per-account, so every viewer sees
            // the same thing regardless of who's signed in.
            HStack(spacing: 10) {
                Button {
                    store.voteUp(current.id)
                } label: {
                    VStack(spacing: 1) {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(isConfirmedWorking ? Color(hex: "5b9ef5") : Color(hex: "5b9ef5").opacity(0.3))
                                .frame(width: 8, height: 8)
                            Text(isConfirmedWorking ? "✓ Works!" : "It Works")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(isConfirmedWorking ? Color(hex: "1a1a1f") : Color(hex: "5b9ef5"))
                        }
                        if isConfirmedWorking {
                            Text("Verified \(RelativeTime.format(current.lastConfirmedAt))")
                                .font(.caption2)
                                .foregroundStyle(Color(hex: "1a1a1f").opacity(0.7))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(isConfirmedWorking ? Color(hex: "5b9ef5") : Color(hex: "0a1a40"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    store.flag(current.id)
                } label: {
                    Image(systemName: hasBeenFlagged ? "flag.fill" : "flag")
                        .foregroundStyle(hasBeenFlagged ? Color(hex: "ff9500") : Color(hex: "8888aa"))
                        .frame(width: 44, height: 44)
                        .background(hasBeenFlagged ? Color(hex: "2a1500") : Color(hex: "252530"))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(alreadyFlaggedByMe)
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
