import SwiftUI

struct HolodPlaceholderView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(appearance.secondaryText)

            Text(title)
                .font(.holodBodyMedium)
                .foregroundStyle(appearance.primaryText)

            Text(message)
                .font(.holodSubheadline)
                .foregroundStyle(appearance.secondaryText)
                .multilineTextAlignment(.center)

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.holodBodyMedium)
                    .foregroundStyle(Color.holodBarleyCorn)
                    .padding(.top, 4)
            }
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct HolodLoadingView: View {
    let message: String

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(appearance.primaryText)
            Text(message)
                .font(.holodBody)
                .foregroundStyle(appearance.primaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
