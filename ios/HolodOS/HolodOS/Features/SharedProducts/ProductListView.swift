import SwiftUI

struct ProductListView: View {
    let status: ProductStatus
    let title: String
    let emptyTitle: String
    let emptySystemImage: String
    let emptyDescription: String
    let swipeActionTitle: String
    var allowsPause: Bool = false
    var appearance: HolodListAppearance = .shopping
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

    private var swipeStyle: HolodSwipeStyle {
        status == .finished ? .shopping : .fridge
    }

    var body: some View {
        VStack(spacing: 0) {
            searchHeader

            Group {
                if isLoading && products.isEmpty && !hasPausedSection {
                    HolodLoadingView(message: "Загрузка…")
                } else if let errorMessage, products.isEmpty && !hasPausedSection {
                    HolodPlaceholderView(
                        icon: "exclamationmark.triangle",
                        title: "Не удалось загрузить",
                        message: errorMessage,
                        actionTitle: "Повторить"
                    ) {
                        Task { await store.load(status) }
                    }
                } else if isEmpty {
                    HolodPlaceholderView(
                        icon: emptySystemImage,
                        title: emptyTitle,
                        message: emptyDescription
                    )
                } else if hasNoSearchResults {
                    HolodPlaceholderView(
                        icon: "magnifyingglass",
                        title: "Ничего не найдено",
                        message: "По запросу «\(searchText)» нет совпадений"
                    )
                } else if showsList {
                    productList
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .holodPaperBackground(appearance, grainOpacity: 0.065)
        .environment(\.holodListAppearance, appearance)
        .overlay(alignment: .top) {
            if isShowingErrorAlert, let alertMessage {
                HolodErrorBanner(message: alertMessage) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isShowingErrorAlert = false
                    }
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .padding(.top, 8)
            }
        }
        .overlay {
            if isShowingAddSheet {
                AddProductSheet(
                    listTitle: title,
                    appearance: appearance,
                    productName: $newProductName,
                    onDismiss: {
                        withAnimation(.easeOut(duration: 0.18)) {
                            isShowingAddSheet = false
                        }
                    },
                    onAdd: {
                        try await store.addProduct(name: newProductName, to: status)
                        newProductName = ""
                    }
                )
                .transition(.opacity.combined(with: .scale(scale: 0.96)))
            }
        }
        .animation(.easeOut(duration: 0.18), value: isShowingAddSheet)
        .animation(.easeInOut(duration: 0.2), value: isShowingErrorAlert)
        .preference(key: HolodHidesTabBarKey.self, value: isShowingAddSheet)
        .refreshable {
            await store.refresh(status)
        }
        .task {
            await store.load(status)
        }
        .preferredColorScheme(appearance == .fridge ? .dark : .light)
    }

    // MARK: - Search

    private var searchHeader: some View {
        VStack(spacing: 0) {
            searchBarRow
            HolodDivider()

            if showsShoppingProgress {
                progressBarRow
            }
        }
        .background(appearance.background)
    }

    private var searchBarRow: some View {
        HStack(spacing: HolodSearchMetrics.spacing) {
            Image(systemName: "magnifyingglass")
                .font(.holodBody)
                .foregroundStyle(appearance.searchIcon)

            TextField(
                "",
                text: $searchText,
                prompt: Text("Поиск").foregroundStyle(appearance.searchPlaceholder)
            )
            .font(.holodBody)
            .foregroundStyle(appearance.primaryText)
            .tint(appearance.searchCaret)
            .autocorrectionDisabled()

            Button {
                newProductName = ""
                withAnimation(.easeOut(duration: 0.18)) {
                    isShowingAddSheet = true
                }
            } label: {
                Image(systemName: "plus")
                    .font(.holodBodyMedium)
                    .foregroundStyle(Color.holodBarleyCorn)
                    .frame(width: HolodSearchMetrics.trailingActionWidth, height: 32)
            }
            .accessibilityLabel("Добавить продукт")
        }
        .padding(.horizontal, HolodSearchMetrics.horizontalPadding)
        .padding(.vertical, 12)
    }

    private var progressBarRow: some View {
        HStack(spacing: HolodSearchMetrics.spacing) {
            Image(systemName: "magnifyingglass")
                .font(.holodBody)
                .foregroundStyle(.clear)
                .accessibilityHidden(true)

            HolodShoppingProgressBar(progress: store.shoppingProgressFraction)
                .animation(.easeInOut(duration: 0.25), value: store.shoppingProgressFraction)
                .animation(.easeInOut(duration: 0.25), value: store.shoppingCompletedToday)
                .animation(.easeInOut(duration: 0.25), value: products.count)

            Color.clear
                .frame(width: HolodSearchMetrics.trailingActionWidth, height: 1)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, HolodSearchMetrics.horizontalPadding)
        .padding(.top, HolodSearchMetrics.progressVerticalPadding)
        .padding(.bottom, HolodSearchMetrics.progressVerticalPadding)
    }

    // MARK: - List

    private var productList: some View {
        List {
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                Section {
                    if isSectionExpanded(section.id) {
                        ForEach(section.products) { product in
                            productRow(product)
                                .listRowSeparator(.hidden)
                                .listRowBackground(appearance.background)
                                .listRowInsets(rowInsets)
                        }
                    }
                } header: {
                    CollapsibleSectionHeader(
                        title: section.title,
                        isExpanded: isSectionExpanded(section.id),
                        showsTopDivider: index > 0
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
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(appearance.background)
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

    private var rowInsets: EdgeInsets {
        EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20)
    }

    // MARK: - Row

    @ViewBuilder
    private func productRow(_ product: Product) -> some View {
        ProductRowView(product: product)
        .holodEdgeSwipe(style: swipeStyle, accessibilityLabel: swipeActionTitle) {
            Task { await performSwipe(for: product) }
        }
        .contextMenu {
            if allowsPause {
                Button("Отложить", systemImage: "pause.circle") {
                    Task { await pause(product) }
                }
                .accessibilityLabel("Отложить продукт")
            }
        }
    }

    // MARK: - Actions

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
