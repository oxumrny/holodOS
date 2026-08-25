import SwiftUI

struct PausedProductRowView: View {
    let product: Product

    var body: some View {
        HStack {
            Image(systemName: product.status == .active ? "refrigerator" : "cart")
                .foregroundStyle(.secondary)
                .frame(width: 20)
                .accessibilityHidden(true)

            Text(product.name)
                .foregroundStyle(.secondary)

            Spacer(minLength: 0)

            if product.isFavorite {
                Image(systemName: "star.fill")
                    .font(.footnote)
                    .foregroundStyle(.yellow)
                    .accessibilityLabel("Мастхэв")
            }
        }
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

    @State private var isExpanded = false

    var body: some View {
        if !products.isEmpty {
            Section {
                if isExpanded {
                    ForEach(products) { product in
                        PausedProductRowView(product: product)
                            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                Button {
                                    onResume(product)
                                } label: {
                                    Label("Вернуть", systemImage: "arrow.uturn.backward")
                                }
                                .tint(.blue)
                            }
                            .accessibilityAction(named: "Вернуть в списки") {
                                onResume(product)
                            }
                    }
                }
            } header: {
                CollapsibleSectionHeader(
                    title: "Отложено (\(products.count))",
                    isExpanded: isExpanded
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                }
            }
        }
    }
}
