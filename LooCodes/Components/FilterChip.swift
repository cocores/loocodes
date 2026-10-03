import SwiftUI

struct FilterChip: View {
    let label: String
    let icon: String?
    let isSelected: Bool
    let isDashed: Bool
    let action: () -> Void

    // `icon` is kept as a separate segment from `label` rather than baked
    // into one combined string — applying .foregroundStyle() to a Text that
    // mixes plain characters with a color emoji can make iOS fall back to
    // rendering the emoji as a monochrome "tofu" box instead of its native
    // glyph. Styling only the label segment keeps the emoji in its native
    // color regardless of selection state.
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
            Group {
                // .foregroundColor (not .foregroundStyle) is what's needed
                // here — it's the one overload defined directly on Text that
                // returns Text instead of `some View`, which is required for
                // the `+` concatenation below to type-check.
                if let icon {
                    Text(icon) + Text(" \(label)").foregroundColor(labelColor)
                } else {
                    Text(label).foregroundColor(labelColor)
                }
            }
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
