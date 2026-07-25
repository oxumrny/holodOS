import SwiftUI

enum HolodListMetrics {
    static let rowVerticalPadding: CGFloat = 5
    static let rowSpacing: CGFloat = 12
    static let sectionHeaderBottomPadding: CGFloat = 6
    static let sectionDividerBottomPadding: CGFloat = 12
}

struct CollapsibleSectionHeader: View {
    let title: String
    var isExpanded: Bool
    var showsTopDivider: Bool
    var onToggle: () -> Void

    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        // Entire band from divider → title → bottom padding is one hit target.
        Button(action: onToggle) {
            VStack(alignment: .leading, spacing: 0) {
                if showsTopDivider {
                    HolodDivider()
                        .padding(.bottom, HolodListMetrics.sectionDividerBottomPadding)
                }

                HStack(spacing: 6) {
                    Text(title.uppercased())
                        .font(.holodSectionHeader)
                        .tracking(0.6)
                        .foregroundStyle(appearance.secondaryText)

                    Spacer(minLength: 0)

                    Image(systemName: "chevron.down")
                        .font(.holodCaptionMedium)
                        .foregroundStyle(appearance.secondaryText.opacity(0.65))
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                }
            }
            .padding(.top, showsTopDivider ? 0 : 4)
            .padding(.bottom, HolodListMetrics.sectionHeaderBottomPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .textCase(nil)
        .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))
    }
}
