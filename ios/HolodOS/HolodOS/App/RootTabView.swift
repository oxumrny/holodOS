import SwiftUI

struct RootTabView: View {
    @AppStorage("selectedTab") private var selectedTab: AppTab = .shopping
    @State private var store = ProductsStore()

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case .shopping:
                    ShoppingListView(store: store)
                case .fridge:
                    FridgeListView(store: store)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: HolodTabBarMetrics.scrollClearance)
            }

            HolodTabBar(selectedTab: $selectedTab)
                .frame(maxWidth: .infinity)
                .padding(.bottom, HolodTabBarMetrics.bottomInset)
        }
        .background(selectedTab == .fridge ? Color.holodMineShaft : Color.holodWhiteRock)
        .preferredColorScheme(.light)
    }
}

#Preview {
    RootTabView()
}
