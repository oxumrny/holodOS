import SwiftUI

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

struct HolodEdgeSwipeModifier: ViewModifier {
    let style: HolodSwipeStyle
    let accessibilityLabel: String
    let onAction: () -> Void

    @Environment(\.holodListAppearance) private var appearance
    @State private var reveal: CGFloat = 0
    @State private var rowSize: CGSize = .zero

    private let actionGap: CGFloat = 10

    private var buttonHeight: CGFloat {
        guard rowSize.height > 0 else { return 28 }
        return rowSize.height / 1.5
    }

    private var actionSize: CGFloat { buttonHeight }

    private var triggerThreshold: CGFloat { actionSize * 0.55 }

    func body(content: Content) -> some View {
        ZStack(alignment: style.edge == .leading ? .leading : .trailing) {
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
        .onPreferenceChange(RowSizeKey.self) { rowSize = $0 }
        .simultaneousGesture(dragGesture)
        .accessibilityAction(named: Text(accessibilityLabel), onAction)
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

    private var dragGesture: some Gesture {
        DragGesture(minimumDistance: 14, coordinateSpace: .local)
            .onChanged { value in
                guard isHorizontalDrag(value) else { return }

                switch style.edge {
                case .leading:
                    reveal = min(max(0, value.translation.width), actionSize)
                case .trailing:
                    reveal = min(max(0, -value.translation.width), actionSize)
                }
            }
            .onEnded { value in
                guard isHorizontalDrag(value) else {
                    resetReveal()
                    return
                }

                if reveal >= triggerThreshold {
                    commitAction()
                } else {
                    resetReveal()
                }
            }
    }

    private func isHorizontalDrag(_ value: DragGesture.Value) -> Bool {
        abs(value.translation.width) > abs(value.translation.height)
    }

    private func commitAction() {
        withAnimation(.easeOut(duration: 0.16)) {
            reveal = actionSize
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) {
            onAction()
            resetReveal()
        }
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
