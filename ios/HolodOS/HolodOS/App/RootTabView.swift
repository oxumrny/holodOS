import SwiftUI

struct RootTabView: View {
    @AppStorage("selectedTab") private var selectedTab: AppTab = .shopping
    @State private var store = ProductsStore()
    @State private var hidesTabBar = false

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
                Color.clear.frame(height: hidesTabBar ? 0 : HolodTabBarMetrics.scrollClearance)
            }
            .onPreferenceChange(HolodHidesTabBarKey.self) { hidesTabBar = $0 }

            if !hidesTabBar {
                HolodTabBar(selectedTab: $selectedTab)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, HolodTabBarMetrics.bottomInset)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .background(selectedTab == .fridge ? Color.holodMineShaft : Color.holodWhiteRock)
        .animation(.easeOut(duration: 0.18), value: hidesTabBar)
        .preferredColorScheme(.light)
    }
}

#Preview {
    RootTabView()
}
