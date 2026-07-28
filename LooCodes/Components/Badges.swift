import SwiftUI

struct TypeBadge: View {
    let type: BathroomType
    var body: some View {
        Text("\(type.emoji) \(type.rawValue)")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
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
        Text(isFreeNoCode ? "FREE" : code)
            .font(.caption.weight(.bold))
            .monospaced()
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

    var body: some View {
        Text(isFree ? "🆓 Free" : (feeAmount.isEmpty ? "💰 Paid" : "💰 \(feeAmount)"))
            .font(.caption.weight(.semibold))
            .foregroundStyle(isFree ? Color(hex: "34c759") : Color(hex: "f5a623"))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(isFree ? Color(hex: "0d2b12") : Color(hex: "2a1d00"))
            .clipShape(Capsule())
    }
}

struct DistanceBadge: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color(hex: "8888aa"))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: "252530"))
            .clipShape(Capsule())
    }
}
