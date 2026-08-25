import SwiftUI

enum AppTab: String {
    case shopping
    case fridge
}

struct RootTabView: View {
    @AppStorage("selectedTab") private var selectedTab: AppTab = .shopping
    @State private var store = ProductsStore()

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                ShoppingListView(store: store)
            }
            .tabItem {
                Label("Покупки", systemImage: "cart")
            }
            .tag(AppTab.shopping)

            NavigationStack {
                FridgeListView(store: store)
            }
            .tabItem {
                Label("Холодос", systemImage: "refrigerator")
            }
            .tag(AppTab.fridge)
        }
    }
}

#Preview {
    RootTabView()
}
