import SwiftUI

struct ProductListView: View {
    let status: ProductStatus
    let title: String
    let emptyTitle: String
    let emptySystemImage: String
    let emptyDescription: String
    let swipeActionTitle: String
    var allowsPause: Bool = false
    var sectionsExpandedByDefault: Bool = true
    var showsShoppingProgress: Bool = false

    @Bindable var store: ProductsStore

    @State private var searchText = ""
    @State private var isShowingAddSheet = false
    @State private var newProductName = ""
    @State private var alertMessage: String?
    @State private var isShowingErrorAlert = false
    @State private var collapsedSectionIDs: Set<String> = []

    private var products: [Product] {
        store.products(for: status)
    }

    private var sections: [ProductSection] {
        ProductGrouping.sections(
            from: ProductGrouping.filtered(products, searchText: searchText)
        )
    }

    private var isLoading: Bool {
        store.isLoading(status)
    }

    private var errorMessage: String? {
        store.errorMessage(for: status)
    }

    private var hasPausedSection: Bool {
        allowsPause && searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !store.pausedProducts.isEmpty
    }

    private var isEmpty: Bool {
        !isLoading && errorMessage == nil && products.isEmpty && !hasPausedSection
    }

    private var hasNoSearchResults: Bool {
        !isLoading
            && errorMessage == nil
            && !products.isEmpty
            && sections.isEmpty
            && !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var showsList: Bool {
        !products.isEmpty || hasPausedSection
    }

    var body: some View {
        Group {
            if isLoading && products.isEmpty && !hasPausedSection {
                ProgressView("Загрузка…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage, products.isEmpty && !hasPausedSection {
                ContentUnavailableView {
                    Label("Не удалось загрузить", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(errorMessage)
                } actions: {
                    Button("Повторить") {
                        Task { await store.load(status) }
                    }
                }
            } else if isEmpty {
                ContentUnavailableView(
                    emptyTitle,
                    systemImage: emptySystemImage,
                    description: Text(emptyDescription)
                )
            } else if hasNoSearchResults {
                ContentUnavailableView.search(text: searchText)
            } else if showsList {
                productList
            }
        }
        .navigationTitle(title)
        .searchable(text: $searchText, prompt: "Поиск")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    newProductName = ""
                    isShowingAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Добавить продукт")
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            if showsShoppingProgress {
                ProgressView(value: store.shoppingProgressFraction)
                    .progressViewStyle(.linear)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                    .accessibilityLabel("Прогресс покупок")
                    .accessibilityValue("\(Int(store.shoppingProgressFraction * 100)) процентов")
                    .animation(.easeInOut(duration: 0.25), value: store.shoppingProgressFraction)
            }
        }
        .sheet(isPresented: $isShowingAddSheet) {
            AddProductSheet(listTitle: title, productName: $newProductName) {
                try await store.addProduct(name: newProductName, to: status)
                newProductName = ""
            }
        }
        .alert("Ошибка", isPresented: $isShowingErrorAlert, presenting: alertMessage) { _ in
            Button("OK", role: .cancel) {}
        } message: { message in
            Text(message)
        }
        .refreshable {
            await store.refresh(status)
        }
        .task {
            await store.load(status)
        }
    }

    private var productList: some View {
        List {
            ForEach(sections) { section in
                Section {
                    if isSectionExpanded(section.id) {
                        ForEach(section.products) { product in
                            productRow(product)
                        }
                    }
                } header: {
                    CollapsibleSectionHeader(
                        title: section.title,
                        isExpanded: isSectionExpanded(section.id)
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            toggleSection(section.id)
                        }
                    }
                }
            }

            if hasPausedSection {
                PausedProductsSection(products: store.pausedProducts) { product in
                    Task { await resume(product) }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func isSectionExpanded(_ id: String) -> Bool {
        if sectionsExpandedByDefault {
            return !collapsedSectionIDs.contains(id)
        }
        return store.shoppingExpandedSectionIDs.contains(id)
    }

    private func toggleSection(_ id: String) {
        if sectionsExpandedByDefault {
            if collapsedSectionIDs.contains(id) {
                collapsedSectionIDs.remove(id)
            } else {
                collapsedSectionIDs.insert(id)
            }
        } else if store.shoppingExpandedSectionIDs.contains(id) {
            store.shoppingExpandedSectionIDs.remove(id)
        } else {
            store.shoppingExpandedSectionIDs.insert(id)
        }
    }

    @ViewBuilder
    private func productRow(_ product: Product) -> some View {
        ProductRowView(product: product)
            .swipeActions(edge: swipeEdge, allowsFullSwipe: true) {
                Button {
                    Task { await performSwipe(for: product) }
                } label: {
                    Label(swipeActionTitle, systemImage: swipeSystemImage)
                }
                .tint(swipeTint)
            }
            .contextMenu {
                if allowsPause {
                    Button("Отложить", systemImage: "pause.circle") {
                        Task { await pause(product) }
                    }
                    .accessibilityLabel("Отложить продукт")
                }
            }
            .accessibilityAction(named: swipeActionTitle) {
                Task { await performSwipe(for: product) }
            }
    }

    private var swipeEdge: HorizontalEdge {
        status == .finished ? .leading : .trailing
    }

    private var swipeSystemImage: String {
        status == .finished ? "checkmark" : "cart"
    }

    private var swipeTint: Color {
        status == .finished ? .green : .orange
    }

    private func performSwipe(for product: Product) async {
        do {
            if status == .finished {
                try await store.markAsPurchased(product)
            } else {
                try await store.markAsFinished(product)
            }
        } catch {
            alertMessage = error.localizedDescription
            isShowingErrorAlert = true
        }
    }

    private func pause(_ product: Product) async {
        do {
            try await store.pauseProduct(product)
        } catch {
            alertMessage = error.localizedDescription
            isShowingErrorAlert = true
        }
    }

    private func resume(_ product: Product) async {
        do {
            try await store.resumeProduct(product)
        } catch {
            alertMessage = error.localizedDescription
            isShowingErrorAlert = true
        }
    }
}
