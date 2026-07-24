import SwiftUI

struct FridgeListView: View {
    @Bindable var store: ProductsStore

    var body: some View {
        ProductListView(
            status: .active,
            title: "Холодос",
            emptyTitle: "Холодос пуст",
            emptySystemImage: "refrigerator",
            emptyDescription: "Нажмите +, чтобы добавить продукт.",
            swipeActionTitle: "Закончилось",
            allowsPause: true,
            appearance: .fridge,
            store: store
        )
    }
}

#Preview {
    FridgeListView(store: ProductsStore())
}
