import SwiftUI

struct FilterChip: View {
    let label: String
    let icon: String?
    let isSelected: Bool
    let isDashed: Bool
    let action: () -> Void

    // `icon` is an SF Symbol name, not a Unicode emoji — native iOS
    // iconography, tintable without any risk of the color-emoji "tofu box"
    // rendering bug plain emoji are prone to when styled.
    init(_ label: String, icon: String? = nil, isSelected: Bool, isDashed: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.icon = icon
        self.isSelected = isSelected
        self.isDashed = isDashed
        self.action = action
    }

    private var labelColor: Color {
        isSelected ? Color(hex: "1a1a1f") : .white
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon {
                    Image(systemName: icon)
                }
                Text(label)
            }
            .foregroundStyle(labelColor)
            .font(.subheadline.weight(.semibold))
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
