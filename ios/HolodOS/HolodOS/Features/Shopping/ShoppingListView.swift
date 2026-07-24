import SwiftUI

struct ShoppingListView: View {
    @Bindable var store: ProductsStore

    var body: some View {
        ProductListView(
            status: .finished,
            title: "Покупки",
            emptyTitle: "Список покупок пуст",
            emptySystemImage: "cart",
            emptyDescription: "Нажмите +, чтобы добавить продукт.",
            swipeActionTitle: "Куплено",
            allowsPause: true,
            sectionsExpandedByDefault: false,
            showsShoppingProgress: true,
            store: store
        )
    }
}

#Preview {
    ShoppingListView(store: ProductsStore())
}
