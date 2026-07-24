import Foundation

struct ProductSection: Identifiable, Equatable {
    let id: String
    let title: String
    let products: [Product]
}

enum ProductGrouping {
    static func sections(
        from products: [Product],
        categoryOrder: [String] = CategoryOrder.default
    ) -> [ProductSection] {
        let grouped = Dictionary(grouping: products, by: \.category)

        var result: [ProductSection] = []

        for category in categoryOrder {
            guard let items = grouped[category], !items.isEmpty else { continue }
            result.append(ProductSection(id: category, title: category, products: items))
        }

        let known = Set(categoryOrder)
        let unknown = grouped.keys
            .filter { !known.contains($0) }
            .sorted()

        for category in unknown {
            guard let items = grouped[category], !items.isEmpty else { continue }
            result.append(ProductSection(id: category, title: category, products: items))
        }

        return result
    }

    static func filtered(_ products: [Product], searchText: String) -> [Product] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return products }
        return products.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }
}
