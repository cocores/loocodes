import SwiftUI

struct FilterChip: View {
    let text: String
    let isSelected: Bool
    let isDashed: Bool
    let action: () -> Void

    init(_ text: String, isSelected: Bool, isDashed: Bool = false, action: @escaping () -> Void) {
        self.text = text
        self.isSelected = isSelected
        self.isDashed = isDashed
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(isSelected ? Color(hex: "1a1a1f") : .white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color(hex: "5b9ef5") : Color(hex: "252530"))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isDashed ? Color(hex: "5b9ef5") : Color(hex: "3a3a4a"),
                            style: StrokeStyle(lineWidth: 0.5, dash: isDashed ? [4, 3] : [])
                        )
                )
        }
    }
}
