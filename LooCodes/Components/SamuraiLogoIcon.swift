import SwiftUI

/// Outline-only mark for the samurAI credit on the About screen — stroked,
/// never filled, and left uncolored by the shape itself so whatever
/// `.foregroundStyle` the caller applies (matching the surrounding text)
/// is what shows, rather than carrying its own brand color.
struct SamuraiLogoIcon: View {
    var size: CGFloat = 16

    var body: some View {
        SamuraiLogoPath()
            .stroke(style: StrokeStyle(lineWidth: size * (1.4 / 24), lineCap: .round, lineJoin: .round))
            .frame(width: size, height: size)
    }
}

/// Mirrors web/src/components/SamuraiLogoIcon.tsx's SVG path data 1:1 so
/// the two platforms render the same mark.
private struct SamuraiLogoPath: Shape {
    func path(in rect: CGRect) -> Path {
        let s = rect.width / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * s, y: y * s) }

        var path = Path()

        path.move(to: p(12, 2))
        path.addLine(to: p(12, 9))

        path.move(to: p(11, 8))
        path.addCurve(to: p(3.5, 2.5), control1: p(8, 8), control2: p(4.5, 6))

        path.move(to: p(13, 8))
        path.addCurve(to: p(20.5, 2.5), control1: p(16, 8), control2: p(19.5, 6))

        path.move(to: p(5, 13))
        path.addCurve(to: p(12, 6), control1: p(5, 8.5), control2: p(8, 6))
        path.addCurve(to: p(19, 13), control1: p(16, 6), control2: p(19, 8.5))

        path.move(to: p(5, 12.5))
        path.addCurve(to: p(2.5, 17.5), control1: p(3, 13), control2: p(1.8, 15.3))
        path.addCurve(to: p(6.5, 15.5), control1: p(4, 16.5), control2: p(5.3, 15.8))

        path.move(to: p(19, 12.5))
        path.addCurve(to: p(21.5, 17.5), control1: p(21, 13), control2: p(22.2, 15.3))
        path.addCurve(to: p(17.5, 15.5), control1: p(20, 16.5), control2: p(18.7, 15.8))

        path.move(to: p(7, 14))
        path.addLine(to: p(7.5, 17.5))
        path.addCurve(to: p(12, 21.5), control1: p(8, 20), control2: p(10, 21.5))
        path.addCurve(to: p(16.5, 17.5), control1: p(14, 21.5), control2: p(16, 20))
        path.addLine(to: p(17, 14))

        path.move(to: p(12, 15))
        path.addLine(to: p(12, 20))

        path.move(to: p(9.3, 17.3))
        path.addLine(to: p(14.7, 17.3))

        return path
    }
}
