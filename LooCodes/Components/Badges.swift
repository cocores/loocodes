import SwiftUI

struct TypeBadge: View {
    let type: BathroomType
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: type.sfSymbol)
            Text(type.label)
        }
        .foregroundStyle(.white)
        .font(.caption.weight(.semibold))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(hex: "3a3a4a"))
        .clipShape(Capsule())
    }
}

struct CodeBadge: View {
    let code: String
    let isFreeNoCode: Bool

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "key.fill")
            Text(isFreeNoCode ? "FREE" : code)
                .monospaced()
        }
        .font(.caption.weight(.bold))
        .foregroundStyle(Color(hex: "34c759"))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(hex: "0d2b12"))
        .clipShape(Capsule())
    }
}

struct ADABadge: View {
    var body: some View {
        Label("ADA", systemImage: "figure.roll")
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color(hex: "34c759"))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: "0d2b12"))
            .clipShape(Capsule())
    }
}

struct PriceBadge: View {
    let isFree: Bool
    let feeAmount: String

    private var icon: String { isFree ? "checkmark.circle.fill" : "dollarsign.circle.fill" }
    private var label: String { isFree ? "Free" : (feeAmount.isEmpty ? "Paid" : feeAmount) }

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
            Text(label)
        }
        .foregroundStyle(isFree ? Color(hex: "34c759") : Color(hex: "f5a623"))
        .font(.caption.weight(.semibold))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(isFree ? Color(hex: "0d2b12") : Color(hex: "2a1d00"))
        .clipShape(Capsule())
    }
}

// Hidden entirely rather than showing a placeholder when distance isn't
// known yet (no GPS fix) — a distance badge should always be a number.
struct DistanceBadge: View {
    let text: String?
    var body: some View {
        if let text {
            Text(text)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(hex: "8888aa"))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(hex: "252530"))
                .clipShape(Capsule())
        }
    }
}
