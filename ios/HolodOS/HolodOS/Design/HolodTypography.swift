import SwiftUI
import UIKit

enum HolodFont {
    private static func font(
        _ name: String,
        size: CGFloat,
        relativeTo style: UIFont.TextStyle
    ) -> Font {
        let scaled = UIFontMetrics(forTextStyle: style).scaledValue(for: size)
        let uiFont = UIFont(name: name, size: scaled) ?? UIFont.systemFont(ofSize: scaled)
        return Font(uiFont)
    }

    static var body: Font { font("Nunito-Regular", size: 17, relativeTo: .body) }
    static var bodyMedium: Font { font("Nunito-Medium", size: 17, relativeTo: .body) }
    static var caption: Font { font("Nunito-Regular", size: 12, relativeTo: .caption1) }
    static var captionMedium: Font { font("Nunito-Medium", size: 12, relativeTo: .caption1) }
    static var caption2Semibold: Font { font("Nunito-SemiBold", size: 11, relativeTo: .caption2) }
    static var sectionHeader: Font { font("Nunito-SemiBold", size: 14, relativeTo: .footnote) }
    static var subheadline: Font { font("Nunito-Regular", size: 15, relativeTo: .subheadline) }
}

enum HolodFontSetup {
    static func apply() {
        let titleFont = UIFont(name: "Nunito-SemiBold", size: 17)
            ?? UIFont.systemFont(ofSize: 17, weight: .semibold)

        let attrs: [NSAttributedString.Key: Any] = [.font: titleFont]
        UINavigationBar.appearance().titleTextAttributes = attrs
        UINavigationBar.appearance().largeTitleTextAttributes = [
            .font: UIFont(name: "Nunito-SemiBold", size: 34) ?? titleFont,
        ]
    }
}

extension Font {
    static var holodBody: Font { HolodFont.body }
    static var holodBodyMedium: Font { HolodFont.bodyMedium }
    static var holodCaption: Font { HolodFont.caption }
    static var holodCaptionMedium: Font { HolodFont.captionMedium }
    static var holodCaption2Semibold: Font { HolodFont.caption2Semibold }
    static var holodSectionHeader: Font { HolodFont.sectionHeader }
    static var holodSubheadline: Font { HolodFont.subheadline }
}
