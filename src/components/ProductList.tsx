import { useMemo, useState } from 'react';

import { getAllCategories } from '@/lib/categoryConfig';
import {
  getFrequentProductIds,
  recordProductActivity,
} from '@/lib/frequentProducts';
import {
  filterProductsBySearch,
  normalizeSearchQuery,
} from '@/lib/productSearch';
import type { Product, ProductCategory } from '@/types/product';

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
  musthaveRevision: number;
  onRefresh: () => void;
  onAction: (id: string) => Promise<{ error: string | null }>;
  onOtherTabAction: (id: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

function resolveCategory(product: Product): ProductCategory {
  return product.category ?? 'прочее';
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
              onAction={onAction}
              onDelete={onDelete}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function FrequentProductList({
  products,
  variant,
  onAction,
  onDelete,
}: {
  products: Product[];
  variant: 'active' | 'finished';
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="product-list__frequent" aria-label="Часто используемые">
      <h2 className="product-list__frequent-heading">Часто</h2>
      <ul className="product-list__items">
        {products.map((product) => (
          <li key={product.id}>
            <ProductItem
              product={product}
              variant={variant}
              showMusthaveBadge
              onAction={onAction}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
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
  musthaveRevision,
  onRefresh,
  onAction,
  onOtherTabAction,
  onDelete,
}: ProductListProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategory | 'all'
  >('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [frequentRevision, setFrequentRevision] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCategorySelect = (category: ProductCategory | 'all') => {
    setSelectedCategory(category);
    setFiltersExpanded(false);
  };

  const handleAction = async (id: string) => {
    setActionError(null);
    const { error: actionErr } = await onAction(id);
    if (actionErr) {
      setActionError(actionErr);
      return;
    }

    recordProductActivity(id);
    setFrequentRevision((revision) => revision + 1);
  };

  const handleOtherTabAction = async (id: string) => {
    setActionError(null);
    const { error: actionErr } = await onOtherTabAction(id);
    if (actionErr) {
      setActionError(actionErr);
      return;
    }

    recordProductActivity(id);
    setFrequentRevision((revision) => revision + 1);
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

  const normalizedSearch = normalizeSearchQuery(searchQuery);
  const otherTabSectionLocation =
    variant === 'active' ? 'в списке покупок' : 'в холодосе';
  const otherTabItemVariant = variant === 'active' ? 'finished' : 'active';

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'all') {
      result = result.filter(
        (product) => resolveCategory(product) === selectedCategory,
      );
    }

    return filterProductsBySearch(result, normalizedSearch);
  }, [products, selectedCategory, normalizedSearch]);

  const filteredOtherTabProducts = useMemo(() => {
    let result = filterProductsBySearch(otherTabProducts, normalizedSearch);

    if (selectedCategory !== 'all') {
      result = result.filter(
        (product) => resolveCategory(product) === selectedCategory,
      );
    }

    return [...result].sort((a, b) =>
      a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }),
    );
  }, [otherTabProducts, normalizedSearch, selectedCategory]);

  const sortedByCategory = useMemo(() => {
    const categoryIndex = new Map(
      categoryOrder.map((category, index) => [category, index]),
    );

    return [...filteredProducts].sort((a, b) => {
      const orderA = categoryIndex.get(resolveCategory(a)) ?? 999;
      const orderB = categoryIndex.get(resolveCategory(b)) ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
    });
  }, [filteredProducts, categoryOrder]);

  const frequentProductIds = useMemo(
    () => getFrequentProductIds(products.map((product) => product.id)),
    [products, musthaveRevision, frequentRevision],
  );

  const { frequentProducts, mainProducts } = useMemo(() => {
    const byId = new Map(sortedByCategory.map((product) => [product.id, product]));
    const frequent = frequentProductIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => product !== undefined);
    const frequentSet = new Set(frequent.map((product) => product.id));
    const main = sortedByCategory.filter((product) => !frequentSet.has(product.id));

    return { frequentProducts: frequent, mainProducts: main };
  }, [sortedByCategory, frequentProductIds]);

  const showCategoryHeaders = selectedCategory === 'all';

  const showCrossTabResults =
    normalizedSearch.length > 0 &&
    filteredProducts.length === 0 &&
    filteredOtherTabProducts.length > 0;

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
      {products.length > 0 && availableCategories.length > 0 && (
        <div className="product-list__filters-panel">
          <div className="product-list__filters-bar">
            <button
              type="button"
              className={`product-list__filters-button ${filtersExpanded ? 'product-list__filters-button--expanded' : ''} ${selectedCategory !== 'all' ? 'product-list__filters-button--applied' : ''}`}
              aria-expanded={filtersExpanded}
              aria-controls="product-category-filters"
              aria-label={
                selectedCategory !== 'all'
                  ? `Фильтр: ${selectedCategory}`
                  : 'Фильтр по категориям'
              }
              title="Фильтр по категориям"
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
            >
              <FilterIcon />
            </button>
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
              aria-label="Фильтр по категориям"
            >
              <button
                type="button"
                className={`product-list__filter ${selectedCategory === 'all' ? 'product-list__filter--active' : ''}`}
                onClick={() => handleCategorySelect('all')}
              >
                Все
              </button>
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

      {frequentProducts.length > 0 && (
        <FrequentProductList
          products={frequentProducts}
          variant={variant}
          onAction={handleAction}
          onDelete={handleDelete}
        />
      )}

      {mainProducts.length > 0 && (
        <CategorizedProductList
          products={mainProducts}
          showCategoryHeaders={showCategoryHeaders}
          variant={variant}
          onAction={handleAction}
          onDelete={handleDelete}
        />
      )}

      {filteredProducts.length === 0 &&
        !showCrossTabResults &&
        products.length > 0 && (
          <div className="product-list__centered product-list__centered--compact">
            <p className="product-list__empty-subtitle">
              {normalizedSearch
                ? `Ничего не найдено по запросу «${searchQuery.trim()}»`
                : `В категории «${selectedCategory}» пока ничего нет`}
            </p>
          </div>
        )}

      {crossTabResults}
    </div>
  );
}
