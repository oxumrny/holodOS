import SwiftUI

struct PausedProductRowView: View {
    let product: Product

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        HStack(spacing: HolodListMetrics.rowSpacing) {
            Image(systemName: product.status == .active ? "refrigerator" : "cart")
                .font(.holodCaption)
                .foregroundStyle(appearance.secondaryText.opacity(0.65))
                .frame(width: 20)
                .accessibilityHidden(true)

            Text(product.name)
                .font(.holodBody)
                .foregroundStyle(appearance.mutedText)

            Spacer(minLength: 0)

            if product.isFavorite {
                Image(systemName: "star.fill")
                    .font(.holodCaption)
                    .foregroundStyle(Color.holodBarleyCorn)
                    .accessibilityLabel("Мастхэв")
            }
        }
        .padding(.vertical, HolodListMetrics.rowVerticalPadding)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
    }

    private var accessibilityLabel: String {
        let location = product.status == .active ? "холодос" : "покупки"
        return "\(product.name), \(location)"
    }
}

struct PausedProductsSection: View {
    let products: [Product]
    let onResume: (Product) -> Void

    @Environment(\.holodListAppearance) private var appearance
    @State private var isExpanded = false

    var body: some View {
        if !products.isEmpty {
            Section {
                if isExpanded {
                    ForEach(products) { product in
                        PausedProductRowView(product: product)
                            .holodEdgeSwipe(
                                style: .paused,
                                accessibilityLabel: "Вернуть в списки"
                            ) {
                                onResume(product)
                            }
                            .listRowSeparator(.hidden)
                            .listRowBackground(appearance.background)
                            .listRowInsets(rowInsets)
                    }
                }
            } header: {
                CollapsibleSectionHeader(
                    title: "Отложено (\(products.count))",
                    isExpanded: isExpanded,
                    showsTopDivider: true
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                }
            }
        }
    }

    private var rowInsets: EdgeInsets {
        EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20)
    }
}
