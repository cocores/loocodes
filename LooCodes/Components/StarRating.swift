import SwiftUI

struct StarRating: View {
    let rating: Double

    var body: some View {
        HStack(spacing: 1) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: starImage(for: index))
                    .font(.caption)
                    .foregroundStyle(Color(hex: "f5a623"))
            }
        }
    }

    private func starImage(for index: Int) -> String {
        let filled = Double(index + 1)
        if rating >= filled { return "star.fill" }
        if rating >= filled - 0.5 { return "star.leadinghalf.filled" }
        return "star"
    }
}
