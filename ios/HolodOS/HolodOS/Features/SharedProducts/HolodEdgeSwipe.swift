import SwiftUI
import UIKit

enum HolodSwipeEdge {
    case leading
    case trailing
}

struct HolodSwipeStyle: Equatable {
    let background: Color
    let foreground: Color
    let icon: String
    let edge: HolodSwipeEdge

    static let shopping = HolodSwipeStyle(
        background: .holodOceanic,
        foreground: .holodOceanicLight,
        icon: "checkmark",
        edge: .leading
    )

    static let fridge = HolodSwipeStyle(
        background: .holodNectarine,
        foreground: .holodNectarineDark,
        icon: "circle",
        edge: .trailing
    )

    static let paused = HolodSwipeStyle(
        background: .holodOceanic,
        foreground: .holodOceanicLight,
        icon: "arrow.uturn.backward",
        edge: .leading
    )
}

private struct RowSizeKey: PreferenceKey {
    static var defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        value = nextValue()
    }
}

private enum SwipeDragAxis {
    case undecided
    case horizontal
    case vertical
}

struct HolodSwipeButton: View {
    let style: HolodSwipeStyle

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: HolodCornerRadius.control, style: .continuous)
                .fill(style.background)

            Image(systemName: style.icon)
                .font(.holodBodyMedium)
                .foregroundStyle(style.foreground)
        }
        .clipShape(RoundedRectangle(cornerRadius: HolodCornerRadius.control, style: .continuous))
        .accessibilityHidden(true)
    }
}

// MARK: - iOS 18+ pan (Apple-recommended scroll-safe path)

/// UIKit pan wired through SwiftUI's gesture system.
/// `shouldBegin` rejects vertical pans so `List` scrolling stays exclusive.
@available(iOS 18.0, *)
private struct HolodSwipePanGesture: UIGestureRecognizerRepresentable {
    let edge: HolodSwipeEdge
    let maximumReveal: CGFloat
    let onChanged: (CGFloat) -> Void
    let onEnded: (CGFloat) -> Void

    func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator {
        Coordinator(edge: edge, maximumReveal: maximumReveal, onChanged: onChanged, onEnded: onEnded)
    }

    func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
        let pan = UIPanGestureRecognizer()
        pan.delegate = context.coordinator
        pan.maximumNumberOfTouches = 1
        pan.cancelsTouchesInView = false
        return pan
    }

    func updateUIGestureRecognizer(_ recognizer: UIPanGestureRecognizer, context: Context) {
        context.coordinator.edge = edge
        context.coordinator.maximumReveal = maximumReveal
        context.coordinator.onChanged = onChanged
        context.coordinator.onEnded = onEnded
        recognizer.delegate = context.coordinator
    }

    func handleUIGestureRecognizerAction(
        _ recognizer: UIPanGestureRecognizer,
        context: Context
    ) {
        context.coordinator.handle(recognizer)
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var edge: HolodSwipeEdge
        var maximumReveal: CGFloat
        var onChanged: (CGFloat) -> Void
        var onEnded: (CGFloat) -> Void

        init(
            edge: HolodSwipeEdge,
            maximumReveal: CGFloat,
            onChanged: @escaping (CGFloat) -> Void,
            onEnded: @escaping (CGFloat) -> Void
        ) {
            self.edge = edge
            self.maximumReveal = maximumReveal
            self.onChanged = onChanged
            self.onEnded = onEnded
        }

        func handle(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: gesture.view)
            let reveal = Self.reveal(for: translation, edge: edge, maximum: maximumReveal)

            switch gesture.state {
            case .began, .changed:
                onChanged(reveal)
            case .ended, .cancelled, .failed:
                onEnded(reveal)
            default:
                break
            }
        }

        static func reveal(for translation: CGPoint, edge: HolodSwipeEdge, maximum: CGFloat) -> CGFloat {
            switch edge {
            case .leading:
                return min(max(0, translation.x), maximum)
            case .trailing:
                return min(max(0, -translation.x), maximum)
            }
        }

        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let pan = gestureRecognizer as? UIPanGestureRecognizer else { return false }
            let velocity = pan.velocity(in: pan.view)

            // Fail early on vertical so List keeps exclusive scroll ownership.
            guard abs(velocity.x) > abs(velocity.y) else { return false }

            switch edge {
            case .leading:
                return velocity.x > 0
            case .trailing:
                return velocity.x < 0
            }
        }

        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
        ) -> Bool {
            false
        }
    }
}

// MARK: - Modifier

struct HolodEdgeSwipeModifier: ViewModifier {
    let style: HolodSwipeStyle
    let accessibilityLabel: String
    let onAction: () -> Void

    @Environment(\.holodListAppearance) private var appearance
    @State private var reveal: CGFloat = 0
    @State private var rowSize: CGSize = .zero
    @State private var legacyAxis: SwipeDragAxis = .undecided

    private let actionGap: CGFloat = 10

    private var buttonHeight: CGFloat {
        guard rowSize.height > 0 else { return 28 }
        return rowSize.height / 1.5
    }

    private var actionSize: CGFloat { max(buttonHeight, 1) }

    private var triggerThreshold: CGFloat { actionSize * 0.55 }

    func body(content: Content) -> some View {
        let row = ZStack(alignment: style.edge == .leading ? .leading : .trailing) {
            HolodSwipeButton(style: style)
                .frame(width: actionSize, height: buttonHeight)
                .offset(x: buttonOffset)

            content
                .background(appearance.background)
                .offset(x: contentOffset)
                .background {
                    GeometryReader { geo in
                        Color.clear.preference(key: RowSizeKey.self, value: geo.size)
                    }
                }
        }
        .clipShape(Rectangle())
        .contentShape(Rectangle())
        .onPreferenceChange(RowSizeKey.self) { rowSize = $0 }

        return Group {
            if #available(iOS 18.0, *) {
                row.gesture(
                    HolodSwipePanGesture(
                        edge: style.edge,
                        maximumReveal: actionSize,
                        onChanged: { reveal = $0 },
                        onEnded: handleEnded
                    )
                )
            } else {
                // iOS 17: SwiftUI drag is fine; the List conflict is mainly iOS 18+.
                row.simultaneousGesture(legacyDragGesture)
            }
        }
        .accessibilityAction(named: Text(accessibilityLabel)) {
            playCommitHaptic()
            onAction()
        }
    }

    private var contentOffset: CGFloat {
        guard reveal > 0 else { return 0 }
        switch style.edge {
        case .leading: return reveal + actionGap
        case .trailing: return -(reveal + actionGap)
        }
    }

    private var buttonOffset: CGFloat {
        switch style.edge {
        case .leading: return -actionSize + reveal
        case .trailing: return actionSize - reveal
        }
    }

    private var legacyDragGesture: some Gesture {
        DragGesture(minimumDistance: 20, coordinateSpace: .local)
            .onChanged { value in
                if legacyAxis == .undecided {
                    let dx = abs(value.translation.width)
                    let dy = abs(value.translation.height)
                    guard dx > 10 || dy > 10 else { return }
                    legacyAxis = dx > dy * 1.35 ? .horizontal : .vertical
                }

                guard legacyAxis == .horizontal else { return }

                switch style.edge {
                case .leading:
                    reveal = min(max(0, value.translation.width), actionSize)
                case .trailing:
                    reveal = min(max(0, -value.translation.width), actionSize)
                }
            }
            .onEnded { _ in
                defer { legacyAxis = .undecided }
                guard legacyAxis == .horizontal else {
                    if reveal > 0 { resetReveal() }
                    return
                }
                handleEnded(reveal)
            }
    }

    private func handleEnded(_ value: CGFloat) {
        if value >= triggerThreshold {
            commitAction()
        } else if value > 0 {
            resetReveal()
        } else {
            reveal = 0
        }
    }

    private func commitAction() {
        playCommitHaptic()

        // Fill the action quickly (keeps swipe feeling snappy)...
        withAnimation(.easeOut(duration: 0.16)) {
            reveal = actionSize
        }
        // ...then hold briefly before the row leaves the list.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
            onAction()
            reveal = 0
        }
    }

    private func playCommitHaptic() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
    }

    private func resetReveal() {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
            reveal = 0
        }
    }
}

extension View {
    func holodEdgeSwipe(
        style: HolodSwipeStyle,
        accessibilityLabel: String,
        action: @escaping () -> Void
    ) -> some View {
        modifier(
            HolodEdgeSwipeModifier(
                style: style,
                accessibilityLabel: accessibilityLabel,
                onAction: action
            )
        )
    }
}
