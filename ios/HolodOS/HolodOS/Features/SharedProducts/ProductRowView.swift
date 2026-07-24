import SwiftUI

struct ProductRowView: View {
    let product: Product

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        HStack(spacing: HolodListMetrics.rowSpacing) {
            Text(product.name)
                .font(.holodBody)
                .foregroundStyle(appearance.primaryText)

            Spacer(minLength: 0)

            if product.isFavorite {
                Image(systemName: "star.fill")
                    .font(.holodCaption)
                    .foregroundStyle(Color.holodBarleyCorn)
                    .accessibilityLabel("Мастхэв")
            }
        }
        .padding(.vertical, HolodListMetrics.rowVerticalPadding)
        .contentShape(Rectangle())
    }
}
