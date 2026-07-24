import SwiftUI

struct HolodFilledButton: View {
    let title: String
    var isEnabled: Bool = true
    let background: Color
    let foreground: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.holodBodyMedium)
                .foregroundStyle(isEnabled ? foreground : foreground.opacity(0.45))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: HolodCornerRadius.control, style: .continuous)
                        .fill(isEnabled ? background : background.opacity(0.35))
                )
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled)
    }
}

extension HolodFilledButton {
    static func primary(
        title: String,
        appearance: HolodListAppearance,
        isEnabled: Bool = true,
        action: @escaping () -> Void
    ) -> HolodFilledButton {
        let isFridge = appearance == .fridge
        return HolodFilledButton(
            title: title,
            isEnabled: isEnabled,
            background: isFridge ? .holodWhiteRock : .holodMineShaft,
            foreground: isFridge ? .holodMineShaft : .holodWhiteRock,
            action: action
        )
    }
}
