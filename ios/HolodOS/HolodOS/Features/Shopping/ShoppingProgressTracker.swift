import Foundation

/// Прогресс покупок за календарный день; обнуляется после полуночи.
enum ShoppingProgressStorage {
    private static let completedKey = "holod.shoppingProgress.completed"
    private static let sessionDayKey = "holod.shoppingProgress.sessionDay"

    static func ensureCurrentDay(defaults: UserDefaults = .standard) {
        let today = Calendar.current.startOfDay(for: Date())
        let stored = defaults.object(forKey: sessionDayKey) as? Date

        if stored != today {
            defaults.set(0, forKey: completedKey)
            defaults.set(today, forKey: sessionDayKey)
        }
    }

    static func completedCount(defaults: UserDefaults = .standard) -> Int {
        ensureCurrentDay(defaults: defaults)
        return defaults.integer(forKey: completedKey)
    }

    static func setCompletedCount(_ value: Int, defaults: UserDefaults = .standard) {
        ensureCurrentDay(defaults: defaults)
        defaults.set(value, forKey: completedKey)
    }

    static func fraction(remaining: Int, defaults: UserDefaults = .standard) -> Double {
        ensureCurrentDay(defaults: defaults)
        let completed = defaults.integer(forKey: completedKey)
        let total = completed + remaining
        guard total > 0 else { return 0 }
        return Double(completed) / Double(total)
    }
}
