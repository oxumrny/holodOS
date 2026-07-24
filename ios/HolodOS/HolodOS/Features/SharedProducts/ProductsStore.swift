import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class ProductsStore {
    private let service: ProductService

    private(set) var fridgeProducts: [Product] = []
    private(set) var shoppingProducts: [Product] = []
    private(set) var pausedProducts: [Product] = []
    private(set) var isLoadingFridge = false
    private(set) var isLoadingShopping = false
    private(set) var fridgeError: String?
    private(set) var shoppingError: String?

    /// Секции покупок, которые пользователь развернул в текущей сессии.
    var shoppingExpandedSectionIDs: Set<String> = []

    /// Куплено за сегодня; синхронизировано с UserDefaults до полуночи.
    private(set) var shoppingCompletedToday: Int = ShoppingProgressStorage.completedCount()

    init(service: ProductService = ProductService()) {
        self.service = service
    }

    func products(for status: ProductStatus) -> [Product] {
        status == .active ? fridgeProducts : shoppingProducts
    }

    func isLoading(_ status: ProductStatus) -> Bool {
        status == .active ? isLoadingFridge : isLoadingShopping
    }

    func errorMessage(for status: ProductStatus) -> String? {
        status == .active ? fridgeError : shoppingError
    }

    var shoppingProgressFraction: Double {
        ShoppingProgressStorage.fraction(remaining: shoppingProducts.count)
    }

    private func syncShoppingProgressSession() {
        shoppingCompletedToday = ShoppingProgressStorage.completedCount()
    }

    func load(_ status: ProductStatus) async {
        syncShoppingProgressSession()
        setLoading(true, for: status)
        setError(nil, for: status)

        do {
            let products = try await service.fetchProducts(status: status)
            setProducts(products.visibleInMainList(), for: status)
            await loadPaused()
        } catch {
            setError(error.localizedDescription, for: status)
            setProducts([], for: status)
        }

        setLoading(false, for: status)
    }

    func refresh(_ status: ProductStatus) async {
        setError(nil, for: status)

        do {
            let products = try await service.fetchProducts(status: status)
            setProducts(products.visibleInMainList(), for: status)
            await loadPaused()
        } catch {
            setError(error.localizedDescription, for: status)
        }
    }

    func refreshAll() async {
        async let fridge: Void = refreshWithoutPaused(.active)
        async let shopping: Void = refreshWithoutPaused(.finished)
        async let paused: Void = loadPaused()
        _ = await (fridge, shopping, paused)
    }

    func addProduct(name: String, to status: ProductStatus) async throws {
        try await service.addProduct(name: name, status: status)
        await refreshAll()
    }

    func markAsPurchased(_ product: Product) async throws {
        try await service.restoreProduct(id: product.id)
        let next = ShoppingProgressStorage.completedCount() + 1
        ShoppingProgressStorage.setCompletedCount(next)
        shoppingCompletedToday = next
        playSuccessHaptic()
        await refreshAll()
    }

    func markAsFinished(_ product: Product) async throws {
        try await service.markAsFinished(id: product.id)
        playSuccessHaptic()
        await refreshAll()
    }

    func pauseProduct(_ product: Product) async throws {
        try await service.pauseProduct(id: product.id)
        playSuccessHaptic()
        await refreshAll()
    }

    func resumeProduct(_ product: Product) async throws {
        try await service.resumeProduct(id: product.id)
        playSuccessHaptic()
        await refreshAll()
    }

    private func refreshWithoutPaused(_ status: ProductStatus) async {
        setError(nil, for: status)

        do {
            let products = try await service.fetchProducts(status: status)
            setProducts(products.visibleInMainList(), for: status)
        } catch {
            setError(error.localizedDescription, for: status)
        }
    }

    private func loadPaused() async {
        do {
            pausedProducts = try await service.fetchPausedProducts()
        } catch {
            // Не блокируем main-списки; paused просто опустеет до следующего refresh.
            pausedProducts = []
        }
    }

    private func playSuccessHaptic() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    private func setProducts(_ products: [Product], for status: ProductStatus) {
        if status == .active {
            fridgeProducts = products
        } else {
            shoppingProducts = products
        }
    }

    private func setLoading(_ value: Bool, for status: ProductStatus) {
        if status == .active {
            isLoadingFridge = value
        } else {
            isLoadingShopping = value
        }
    }

    private func setError(_ message: String?, for status: ProductStatus) {
        if status == .active {
            fridgeError = message
        } else {
            shoppingError = message
        }
    }
}
