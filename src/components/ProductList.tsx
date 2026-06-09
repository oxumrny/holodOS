import { useMemo, useState } from 'react';

import { getAllCategories } from '@/lib/categoryConfig';
import type { Product, ProductCategory } from '@/types/product';

import { ErrorBanner } from './ErrorBanner';
import { ProductItem } from './ProductItem';
import './ProductList.css';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  variant: 'active' | 'finished';
  emptyTitle: string;
  emptySubtitle: string;
  onRefresh: () => void;
  onAction: (id: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

function resolveCategory(product: Product): ProductCategory {
  return product.category ?? 'прочее';
}

export function ProductList({
  products,
  loading,
  error,
  variant,
  emptyTitle,
  emptySubtitle,
  onRefresh,
  onAction,
  onDelete,
}: ProductListProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategory | 'all'
  >('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (id: string) => {
    setActionError(null);
    const { error: actionErr } = await onAction(id);
    if (actionErr) {
      setActionError(actionErr);
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
    return [...base, ...extras.sort((a, b) => a.localeCompare(b, 'ru'))];
  }, [products]);

  const availableCategories = useMemo(() => {
    const present = new Set(products.map(resolveCategory));
    return categoryOrder.filter((category) => present.has(category));
  }, [products, categoryOrder]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return products;
    }
    return products.filter(
      (product) => resolveCategory(product) === selectedCategory,
    );
  }, [products, selectedCategory]);

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

  if (products.length === 0) {
    return (
      <div className="product-list__centered">
        <p className="product-list__empty-icon">{variant === 'active' ? '🧊' : '📋'}</p>
        <p className="product-list__empty-title">{emptyTitle}</p>
        <p className="product-list__empty-subtitle">{emptySubtitle}</p>
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
      <div className="product-list__filters" aria-label="Фильтр по категориям">
        <button
          type="button"
          className={`product-list__filter ${selectedCategory === 'all' ? 'product-list__filter--active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Все
        </button>
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`product-list__filter ${selectedCategory === category ? 'product-list__filter--active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="product-list__centered product-list__centered--compact">
          <p className="product-list__empty-subtitle">
            В категории «{selectedCategory}» пока ничего нет
          </p>
        </div>
      ) : (
        <ul className="product-list__items">
          {sortedByCategory.map((product) => (
            <li key={product.id}>
              <ProductItem
                product={product}
                variant={variant}
                onAction={handleAction}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
