import SwiftUI

@main
struct HolodOSApp: App {
    init() {
        HolodFontSetup.apply()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
    }
}
