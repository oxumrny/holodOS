import SwiftUI

struct ProductRowView: View {
    let product: Product

    var body: some View {
        HStack {
            Text(product.name)

            Spacer(minLength: 0)

            if product.isFavorite {
                Image(systemName: "star.fill")
                    .font(.footnote)
                    .foregroundStyle(.yellow)
                    .accessibilityLabel("Мастхэв")
            }
        }
        .contentShape(Rectangle())
    }
}
