import { useMemo, useState } from 'react';

import { getAllCategories } from '@/lib/categoryConfig';
import {
  filterProductsBySearch,
  normalizeSearchQuery,
} from '@/lib/productSearch';
import type { Product, ProductCategory } from '@/types/product';
import type { Store } from '@/types/store';

import { ErrorBanner } from './ErrorBanner';
import { ProductItem } from './ProductItem';
import './ProductList.css';

interface ProductListProps {
  products: Product[];
  otherTabProducts: Product[];
  loading: boolean;
  error: string | null;
  variant: 'active' | 'finished';
  emptyTitle: string;
  emptySubtitle: string;
  searchQuery: string;
  stores?: Store[];
  exclusionsMap?: Map<string, string[]>;
  selectedStoreId?: string | null;
  onSelectedStoreChange?: (storeId: string | null) => void;
  onRefresh: () => void;
  onAction: (id: string) => Promise<{ error: string | null }>;
  onOtherTabAction: (id: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

function resolveCategory(product: Product): ProductCategory {
  return product.category ?? 'прочее';
}

function isExcludedFromStore(
  productId: string,
  storeId: string,
  exclusionsMap: Map<string, string[]>,
): boolean {
  return exclusionsMap.get(productId)?.includes(storeId) ?? false;
}

function applyListFilters(
  products: Product[],
  options: {
    frequentOnly: boolean;
    selectedCategory: ProductCategory | 'all';
    normalizedSearch: string;
  },
): Product[] {
  let result = products;

  if (options.frequentOnly) {
    result = result.filter((product) => product.is_favorite);
  }

  if (options.selectedCategory !== 'all') {
    result = result.filter(
      (product) => resolveCategory(product) === options.selectedCategory,
    );
  }

  return filterProductsBySearch(result, options.normalizedSearch);
}

function sortProductsByCategory(
  products: Product[],
  categoryOrder: ProductCategory[],
): Product[] {
  const categoryIndex = new Map(
    categoryOrder.map((category, index) => [category, index]),
  );

  return [...products].sort((a, b) => {
    const orderA = categoryIndex.get(resolveCategory(a)) ?? 999;
    const orderB = categoryIndex.get(resolveCategory(b)) ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
  });
}

function buildCategorizedEntries(
  products: Product[],
  showHeaders: boolean,
): Array<
  | { kind: 'header'; category: ProductCategory; key: string }
  | { kind: 'product'; product: Product; key: string }
> {
  const categoriesPresent = new Set(products.map(resolveCategory));
  const shouldShowHeaders = showHeaders && categoriesPresent.size > 1;
  let lastCategory: ProductCategory | null = null;
  const entries: Array<
    | { kind: 'header'; category: ProductCategory; key: string }
    | { kind: 'product'; product: Product; key: string }
  > = [];

  for (const product of products) {
    const category = resolveCategory(product);

    if (shouldShowHeaders && category !== lastCategory) {
      entries.push({
        kind: 'header',
        category,
        key: `header-${category}`,
      });
      lastCategory = category;
    }

    entries.push({ kind: 'product', product, key: product.id });
  }

  return entries;
}

function CategorizedProductList({
  products,
  showCategoryHeaders,
  variant,
  onAction,
  onDelete,
}: {
  products: Product[];
  showCategoryHeaders: boolean;
  variant: 'active' | 'finished';
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const entries = buildCategorizedEntries(products, showCategoryHeaders);

  return (
    <ul className="product-list__items">
      {entries.map((entry) =>
        entry.kind === 'header' ? (
          <li key={entry.key} className="product-list__category-divider">
            <h3 className="product-list__category-header">{entry.category}</h3>
          </li>
        ) : (
          <li key={entry.key}>
            <ProductItem
              product={entry.product}
              variant={variant}
              showMusthaveBadge={entry.product.is_favorite}
              onAction={onAction}
              onDelete={onDelete}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function CrossTabResults({
  searchQuery,
  sectionLocation,
  products,
  itemVariant,
  showCategoryHeaders,
  onAction,
  onDelete,
}: {
  searchQuery: string;
  sectionLocation: string;
  products: Product[];
  itemVariant: 'active' | 'finished';
  showCategoryHeaders: boolean;
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="product-list__cross-tab" aria-label={sectionLocation}>
      <h2 className="product-list__cross-tab-heading">
        По запросу «{searchQuery.trim()}» {sectionLocation}
      </h2>
      <CategorizedProductList
        products={products}
        showCategoryHeaders={showCategoryHeaders}
        variant={itemVariant}
        onAction={onAction}
        onDelete={onDelete}
      />
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      className="product-list__filters-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function ProductList({
  products,
  otherTabProducts,
  loading,
  error,
  variant,
  emptyTitle,
  emptySubtitle,
  searchQuery,
  stores = [],
  exclusionsMap = new Map(),
  selectedStoreId = null,
  onSelectedStoreChange,
  onRefresh,
  onAction,
  onOtherTabAction,
  onDelete,
}: ProductListProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategory | 'all'
  >('all');
  const [frequentOnly, setFrequentOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [otherPlacesExpanded, setOtherPlacesExpanded] = useState(false);

  const showStoreFilter = variant === 'finished' && stores.length > 0;

  const handleStoreSelect = (storeId: string | null) => {
    setOtherPlacesExpanded(false);
    onSelectedStoreChange?.(storeId);
  };

  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  const handleCategorySelect = (category: ProductCategory | 'all') => {
    setSelectedCategory(category);
    setFiltersExpanded(false);
  };

  const handleFrequentFilterSelect = (enabled: boolean) => {
    setFrequentOnly(enabled);
    setFiltersExpanded(false);
  };

  const filterApplied = selectedCategory !== 'all' || frequentOnly;

  const handleAction = async (id: string) => {
    setActionError(null);
    const { error: actionErr } = await onAction(id);
    if (actionErr) {
      setActionError(actionErr);
      return;
    }
  };

  const handleOtherTabAction = async (id: string) => {
    setActionError(null);
    const { error: actionErr } = await onOtherTabAction(id);
    if (actionErr) {
      setActionError(actionErr);
      return;
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const { error: deleteErr } = await onDelete(id);
    if (deleteErr) {
      setActionError(deleteErr);
    }
  };

  const categoryOrder = useMemo(() => {
    const base = getAllCategories();
    const present = new Set(products.map(resolveCategory));
    const extras = [...present].filter((category) => !base.includes(category));
    return [...base, ...extras];
  }, [products]);

  const availableCategories = useMemo(() => {
    const present = new Set(products.map(resolveCategory));
    return categoryOrder.filter((category) => present.has(category));
  }, [products, categoryOrder]);

  const hasFavorites = useMemo(
    () => products.some((product) => product.is_favorite),
    [products],
  );

  const normalizedSearch = normalizeSearchQuery(searchQuery);
  const otherTabSectionLocation =
    variant === 'active' ? 'в списке покупок' : 'в холодосе';
  const otherTabItemVariant = variant === 'active' ? 'finished' : 'active';

  const { mainPool, otherPool } = useMemo(() => {
    if (!showStoreFilter || !selectedStoreId) {
      return { mainPool: products, otherPool: [] as Product[] };
    }

    const main: Product[] = [];
    const other: Product[] = [];

    for (const product of products) {
      if (isExcludedFromStore(product.id, selectedStoreId, exclusionsMap)) {
        other.push(product);
      } else {
        main.push(product);
      }
    }

    return { mainPool: main, otherPool: other };
  }, [products, showStoreFilter, selectedStoreId, exclusionsMap]);

  const filterOptions = {
    frequentOnly,
    selectedCategory,
    normalizedSearch,
  };

  const filteredMainProducts = useMemo(
    () => applyListFilters(mainPool, filterOptions),
    [mainPool, frequentOnly, selectedCategory, normalizedSearch],
  );

  const filteredOtherProducts = useMemo(
    () => applyListFilters(otherPool, filterOptions),
    [otherPool, frequentOnly, selectedCategory, normalizedSearch],
  );

  const filteredOtherTabProducts = useMemo(() => {
    let result = filterProductsBySearch(otherTabProducts, normalizedSearch);

    if (frequentOnly) {
      result = result.filter((product) => product.is_favorite);
    }

    if (selectedCategory !== 'all') {
      result = result.filter(
        (product) => resolveCategory(product) === selectedCategory,
      );
    }

    return [...result].sort((a, b) =>
      a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }),
    );
  }, [otherTabProducts, normalizedSearch, selectedCategory, frequentOnly]);

  const sortedMainProducts = useMemo(
    () => sortProductsByCategory(filteredMainProducts, categoryOrder),
    [filteredMainProducts, categoryOrder],
  );

  const sortedOtherProducts = useMemo(
    () => sortProductsByCategory(filteredOtherProducts, categoryOrder),
    [filteredOtherProducts, categoryOrder],
  );

  const showCategoryHeaders = selectedCategory === 'all';

  const showCrossTabResults =
    normalizedSearch.length > 0 &&
    filteredMainProducts.length === 0 &&
    filteredOtherTabProducts.length > 0;

  const showStoreMainEmpty =
    Boolean(selectedStoreId) &&
    sortedMainProducts.length === 0 &&
    sortedOtherProducts.length > 0 &&
    !normalizedSearch &&
    !filterApplied;

  const crossTabResults = showCrossTabResults ? (
    <CrossTabResults
      searchQuery={searchQuery}
      sectionLocation={otherTabSectionLocation}
      products={filteredOtherTabProducts}
      itemVariant={otherTabItemVariant}
      showCategoryHeaders={showCategoryHeaders}
      onAction={handleOtherTabAction}
      onDelete={handleDelete}
    />
  ) : null;

  if (loading && products.length === 0) {
    return (
      <div className="product-list__centered">
        <div className="product-list__spinner" aria-label="Загрузка" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-list__centered">
        <ErrorBanner message={`Не удалось загрузить данные: ${error}`} />
        <button type="button" className="product-list__retry" onClick={onRefresh}>
          Повторить
        </button>
      </div>
    );
  }

  if (products.length === 0 && !showCrossTabResults) {
    return (
      <div className="product-list__centered">
        <p className="product-list__empty-icon">
          {variant === 'active' ? '🧊' : '📋'}
        </p>
        <p className="product-list__empty-title">{emptyTitle}</p>
        <p className="product-list__empty-subtitle">
          {normalizedSearch
            ? `Ничего не найдено по запросу «${searchQuery.trim()}»`
            : emptySubtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="product-list">
      {actionError && (
        <ErrorBanner
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {showStoreFilter && (
        <div className="product-list__store-bar">
          <label className="product-list__store-label" htmlFor="store-select">
            Сейчас:
          </label>
          <select
            id="store-select"
            className="product-list__store-select"
            value={selectedStoreId ?? ''}
            onChange={(event) =>
              handleStoreSelect(event.target.value || null)
            }
          >
            <option value="">Все магазины</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          {selectedStore && (
            <p className="product-list__store-counter">
              {mainPool.length} из {products.length} для {selectedStore.name}
            </p>
          )}
        </div>
      )}

      {products.length > 0 && (
        <div className="product-list__filters-panel">
          <div className="product-list__filters-bar">
            <button
              type="button"
              className={`product-list__filters-button ${filtersExpanded ? 'product-list__filters-button--expanded' : ''} ${filterApplied ? 'product-list__filters-button--applied' : ''}`}
              aria-expanded={filtersExpanded}
              aria-controls="product-category-filters"
              aria-label={
                filterApplied
                  ? frequentOnly && selectedCategory !== 'all'
                    ? `Фильтры: Мастхэв, ${selectedCategory}`
                    : frequentOnly
                      ? 'Фильтр: Мастхэв'
                      : `Фильтр: ${selectedCategory}`
                  : 'Фильтры'
              }
              title="Фильтры"
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
            >
              <FilterIcon />
            </button>
            {frequentOnly && (
              <button
                type="button"
                className="product-list__filters-active"
                onClick={() => handleFrequentFilterSelect(false)}
                aria-label="Сбросить фильтр: Мастхэв"
                title="Сбросить: Мастхэв"
              >
                <span className="product-list__filters-active-label">Мастхэв</span>
                <span className="product-list__filters-active-clear" aria-hidden>
                  ×
                </span>
              </button>
            )}
            {selectedCategory !== 'all' && (
              <button
                type="button"
                className="product-list__filters-active"
                onClick={() => handleCategorySelect('all')}
                aria-label={`Сбросить фильтр: ${selectedCategory}`}
                title={`Сбросить: ${selectedCategory}`}
              >
                <span className="product-list__filters-active-label">
                  {selectedCategory}
                </span>
                <span className="product-list__filters-active-clear" aria-hidden>
                  ×
                </span>
              </button>
            )}
          </div>
          {filtersExpanded && (
            <div
              id="product-category-filters"
              className="product-list__filters"
              aria-label="Фильтры"
            >
              <button
                type="button"
                className={`product-list__filter ${!frequentOnly && selectedCategory === 'all' ? 'product-list__filter--active' : ''}`}
                onClick={() => {
                  handleFrequentFilterSelect(false);
                  handleCategorySelect('all');
                }}
              >
                Все
              </button>
              {hasFavorites && (
                <button
                  type="button"
                  className={`product-list__filter product-list__filter--frequent ${frequentOnly ? 'product-list__filter--active' : ''}`}
                  onClick={() => handleFrequentFilterSelect(true)}
                >
                  Мастхэв
                </button>
              )}
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`product-list__filter ${selectedCategory === category ? 'product-list__filter--active' : ''}`}
                  onClick={() => handleCategorySelect(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showStoreMainEmpty && (
        <div className="product-list__centered product-list__centered--compact">
          <p className="product-list__empty-subtitle">
            Для этого магазина ничего не запланировано, но есть{' '}
            {sortedOtherProducts.length}{' '}
            {sortedOtherProducts.length === 1
              ? 'позиция'
              : sortedOtherProducts.length < 5
                ? 'позиции'
                : 'позиций'}{' '}
            для других мест
          </p>
        </div>
      )}

      {sortedMainProducts.length > 0 && (
        <CategorizedProductList
          products={sortedMainProducts}
          showCategoryHeaders={showCategoryHeaders}
          variant={variant}
          onAction={handleAction}
          onDelete={handleDelete}
        />
      )}

      {filteredMainProducts.length === 0 &&
        !showCrossTabResults &&
        !showStoreMainEmpty &&
        products.length > 0 && (
          <div className="product-list__centered product-list__centered--compact">
            <p className="product-list__empty-subtitle">
              {normalizedSearch
                ? `Ничего не найдено по запросу «${searchQuery.trim()}»`
                : frequentOnly && selectedCategory !== 'all'
                  ? `В «Мастхэв» в категории «${selectedCategory}» пока ничего нет`
                  : frequentOnly
                    ? 'Нет избранных продуктов на этой вкладке'
                    : selectedCategory !== 'all'
                      ? `В категории «${selectedCategory}» пока ничего нет`
                      : emptySubtitle}
            </p>
          </div>
        )}

      {showStoreFilter && selectedStoreId && otherPool.length > 0 && (
        <section className="product-list__group">
          <button
            type="button"
            className="product-list__group-toggle"
            aria-expanded={otherPlacesExpanded}
            onClick={() => setOtherPlacesExpanded((expanded) => !expanded)}
          >
            <span
              className={`product-list__group-chevron ${otherPlacesExpanded ? '' : 'product-list__group-chevron--collapsed'}`}
              aria-hidden
            >
              ▾
            </span>
            <h2 className="product-list__group-title">
              Купить в другом месте
            </h2>
            <span className="product-list__group-count">
              {sortedOtherProducts.length}
            </span>
          </button>
          {otherPlacesExpanded && sortedOtherProducts.length > 0 && (
            <CategorizedProductList
              products={sortedOtherProducts}
              showCategoryHeaders={showCategoryHeaders}
              variant={variant}
              onAction={handleAction}
              onDelete={handleDelete}
            />
          )}
          {otherPlacesExpanded && sortedOtherProducts.length === 0 && (
            <p className="product-list__empty-subtitle product-list__group-empty">
              {normalizedSearch
                ? `Ничего не найдено по запросу «${searchQuery.trim()}»`
                : 'Нет позиций для других мест с текущими фильтрами'}
            </p>
          )}
        </section>
      )}

      {crossTabResults}
    </div>
  );
}
