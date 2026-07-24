import SwiftUI

enum HolodTabBarMetrics {
    static let barHeight: CGFloat = 56
    static let maxBarWidth: CGFloat = 168
    static let bottomInset: CGFloat = 12
    static var scrollClearance: CGFloat { barHeight + bottomInset + 8 }
}

struct HolodTabBar: View {
    @Binding var selectedTab: AppTab
    @Namespace private var activeTabNamespace

    private let tabs: [(AppTab, String)] = [
        (.shopping, "Покупки"),
        (.fridge, "Холодос"),
    ]

    private var usesLightContainer: Bool {
        selectedTab == .fridge
    }

    private var containerColor: Color {
        usesLightContainer ? .holodWhiteRock : .holodMineShaft
    }

    private var activePillColor: Color {
        usesLightContainer ? .holodMineShaft : .holodWhiteRock
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(tabs, id: \.0) { tab, title in
                tabButton(tab: tab, title: title)
            }
        }
        .padding(4)
        .frame(maxWidth: HolodTabBarMetrics.maxBarWidth)
        .background {
            RoundedRectangle(cornerRadius: HolodCornerRadius.container, style: .continuous)
                .fill(containerColor)
                .overlay {
                    RoundedRectangle(cornerRadius: HolodCornerRadius.container, style: .continuous)
                        .strokeBorder(Color.holodMineShaft.opacity(usesLightContainer ? 0.12 : 0), lineWidth: 1)
                }
                .shadow(
                    color: Color.holodMineShaft.opacity(usesLightContainer ? 0.18 : 0.2),
                    radius: 16,
                    x: 0,
                    y: 4
                )
        }
        .animation(.easeInOut(duration: 0.22), value: selectedTab)
    }

    private func tabButton(tab: AppTab, title: String) -> some View {
        let isSelected = selectedTab == tab

        return Button {
            withAnimation(.easeInOut(duration: 0.22)) {
                selectedTab = tab
            }
        } label: {
            Text(title)
                .font(isSelected ? .holodCaptionMedium : .holodCaption)
                .foregroundStyle(textColor(isSelected: isSelected))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background {
                    if isSelected {
                        RoundedRectangle(cornerRadius: HolodCornerRadius.control, style: .continuous)
                            .fill(activePillColor)
                            .matchedGeometryEffect(id: "activeTab", in: activeTabNamespace)
                    }
                }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func textColor(isSelected: Bool) -> Color {
        if isSelected {
            return usesLightContainer ? .holodWhiteRock : .holodMineShaft
        }
        return usesLightContainer
            ? Color.holodMineShaft.opacity(0.45)
            : .holodWhiteRock
    }
}

enum AppTab: String {
    case shopping
    case fridge
}
