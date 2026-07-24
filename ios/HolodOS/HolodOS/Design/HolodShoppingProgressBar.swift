import SwiftUI

enum HolodProgressMetrics {
    static let barHeight: CGFloat = 14
    static let dotSize: CGFloat = 1.5
    static let dotSpacing: CGFloat = 3
}

struct HolodStipplePattern: View {
    var dotColor: Color
    var dotSize: CGFloat = HolodProgressMetrics.dotSize
    var spacing: CGFloat = HolodProgressMetrics.dotSpacing

    var body: some View {
        Canvas { context, size in
            Self.drawDots(in: context, size: size, color: dotColor)
        }
    }

    fileprivate static func drawDots(
        in context: GraphicsContext,
        size: CGSize,
        color: Color,
        dotSize: CGFloat = HolodProgressMetrics.dotSize,
        spacing: CGFloat = HolodProgressMetrics.dotSpacing
    ) {
        guard size.width > 0, size.height > 0 else { return }

        var y: CGFloat = 0
        while y < size.height {
            var x: CGFloat = 0
            while x < size.width {
                let rect = CGRect(x: x, y: y, width: dotSize, height: dotSize)
                context.fill(Path(rect), with: .color(color))
                x += spacing
            }
            y += spacing
        }
    }
}

struct HolodShoppingProgressBar: View {
    var progress: Double

    private var clampedProgress: Double {
        min(max(progress, 0), 1)
    }

    var body: some View {
        Canvas { context, size in
            let fillWidth = size.width * clampedProgress

            HolodStipplePattern.drawDots(in: context, size: size, color: .holodProgressDot)

            guard fillWidth > 0 else { return }

            var y: CGFloat = 0
            while y < size.height {
                var x: CGFloat = 0
                while x < size.width {
                    if x < fillWidth {
                        let rect = CGRect(
                            x: x,
                            y: y,
                            width: HolodProgressMetrics.dotSize,
                            height: HolodProgressMetrics.dotSize
                        )
                        context.fill(Path(rect), with: .color(.holodOceanic))
                    }
                    x += HolodProgressMetrics.dotSpacing
                }
                y += HolodProgressMetrics.dotSpacing
            }
        }
        .frame(height: HolodProgressMetrics.barHeight)
        .clipShape(RoundedRectangle(cornerRadius: HolodCornerRadius.control, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Прогресс покупок")
        .accessibilityValue("\(Int(clampedProgress * 100)) процентов")
    }
}
