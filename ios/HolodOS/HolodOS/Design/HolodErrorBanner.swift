import SwiftUI

struct HolodErrorBanner: View {
    let message: String
    let onDismiss: () -> Void

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.holodBody)
                .foregroundStyle(Color.holodBarleyCorn)

            VStack(alignment: .leading, spacing: 4) {
                Text("Ошибка")
                    .font(.holodBodyMedium)
                    .foregroundStyle(appearance.primaryText)

                Text(message)
                    .font(.holodSubheadline)
                    .foregroundStyle(appearance.secondaryText)
            }

            Spacer(minLength: 0)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.holodCaptionMedium)
                    .foregroundStyle(appearance.secondaryText)
                    .frame(width: 28, height: 28)
            }
            .accessibilityLabel("Закрыть")
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(appearance.background)
                .shadow(color: .black.opacity(0.1), radius: 10, y: 4)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(appearance.divider, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
}
