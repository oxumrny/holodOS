import SwiftUI

extension Color {
    static let holodMineShaft = Color(red: 45 / 255, green: 45 / 255, blue: 45 / 255)
    static let holodAkaroa = Color(red: 224 / 255, green: 210 / 255, blue: 184 / 255)
    static let holodBarleyCorn = Color(red: 166 / 255, green: 135 / 255, blue: 99 / 255)
    static let holodWhiteRock = Color(red: 234 / 255, green: 224 / 255, blue: 210 / 255)
    /// Точки незаполненной части прогресс-бара — светлее White Rock.
    static let holodProgressDot = Color(red: 248 / 255, green: 243 / 255, blue: 236 / 255)

    // Только для swipe-кнопок
    static let holodOceanic = Color(red: 0 / 255, green: 63 / 255, blue: 71 / 255)
    static let holodOceanicLight = Color(red: 230 / 255, green: 241 / 255, blue: 242 / 255)
    static let holodNectarine = Color(red: 255 / 255, green: 189 / 255, blue: 118 / 255)
    static let holodNectarineDark = Color(red: 74 / 255, green: 48 / 255, blue: 32 / 255)
}

enum HolodCornerRadius {
    static let container: CGFloat = 4
    static let control: CGFloat = 2
}

enum HolodSearchMetrics {
    static let horizontalPadding: CGFloat = 20
    static let spacing: CGFloat = 12
    static let trailingActionWidth: CGFloat = 32
    static let progressVerticalPadding: CGFloat = 8
}

struct HolodListAppearance: Equatable {
    let background: Color
    let primaryText: Color
    let secondaryText: Color
    let mutedText: Color
    let divider: Color
    let searchIcon: Color
    let searchPlaceholder: Color
    let searchCaret: Color

    static let shopping = HolodListAppearance(
        background: .holodWhiteRock,
        primaryText: .holodMineShaft,
        secondaryText: Color.holodMineShaft.opacity(0.55),
        mutedText: Color.holodMineShaft.opacity(0.5),
        divider: Color.holodMineShaft.opacity(0.12),
        searchIcon: Color.holodMineShaft.opacity(0.4),
        searchPlaceholder: Color.holodMineShaft.opacity(0.52),
        searchCaret: .holodBarleyCorn
    )

    static let fridge = HolodListAppearance(
        background: .holodMineShaft,
        primaryText: .holodWhiteRock,
        secondaryText: Color.holodWhiteRock.opacity(0.55),
        mutedText: Color.holodWhiteRock.opacity(0.5),
        divider: Color.holodWhiteRock.opacity(0.12),
        searchIcon: Color.holodWhiteRock.opacity(0.4),
        searchPlaceholder: Color.holodWhiteRock.opacity(0.52),
        searchCaret: .holodNectarine
    )
}

private struct HolodListAppearanceKey: EnvironmentKey {
    static let defaultValue = HolodListAppearance.shopping
}

extension EnvironmentValues {
    var holodListAppearance: HolodListAppearance {
        get { self[HolodListAppearanceKey.self] }
        set { self[HolodListAppearanceKey.self] = newValue }
    }
}

struct HolodDivider: View {
    @Environment(\.holodListAppearance) private var appearance

    var body: some View {
        Rectangle()
            .fill(appearance.divider)
            .frame(height: 1)
    }
}

// MARK: - Paper grain

private enum HolodNoise {
    static let tileImage: CGImage? = generateTile(size: 256)

    static var image: Image? {
        guard let tileImage else { return nil }
        return Image(decorative: tileImage, scale: 1, orientation: .up)
    }

    private static func generateTile(size: Int) -> CGImage? {
        var pixels = [UInt8]()
        pixels.reserveCapacity(size * size)
        for _ in 0 ..< size * size {
            pixels.append(UInt8.random(in: 0 ... 255))
        }

        let data = Data(pixels) as CFData
        guard let provider = CGDataProvider(data: data) else { return nil }

        return CGImage(
            width: size,
            height: size,
            bitsPerComponent: 8,
            bitsPerPixel: 8,
            bytesPerRow: size,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue),
            provider: provider,
            decode: nil,
            shouldInterpolate: true,
            intent: .defaultIntent
        )
    }
}

struct HolodGrainOverlay: View {
    var opacity: Double = 0.042

    var body: some View {
        if let image = HolodNoise.image {
            image
                .resizable(resizingMode: .tile)
                .opacity(opacity)
                .blendMode(.overlay)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }
}

extension View {
    func holodPaperBackground(_ color: Color, grainOpacity: Double = 0.042) -> some View {
        background(color)
            .overlay { HolodGrainOverlay(opacity: grainOpacity) }
    }

    func holodPaperBackground(
        _ appearance: HolodListAppearance,
        grainOpacity: Double = 0.042
    ) -> some View {
        holodPaperBackground(appearance.background, grainOpacity: grainOpacity)
    }
}
