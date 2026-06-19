import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { ErrorBanner } from '@/components/ErrorBanner';
import {
  ProductSettingsForm,
  type ProductSettingsValues,
} from '@/components/ProductSettingsForm';
import { useStores } from '@/hooks/useStores';
import {
  addCustomCategory,
  deleteCategoryFromConfig,
  getAllCategories,
  moveCategoryInOrder,
  renameCategoryInConfig,
} from '@/lib/categoryConfig';
import { MAX_FREQUENT } from '@/lib/frequentProducts';
import {
  fetchExcludedStoreIds,
  setProductExclusions,
} from '@/lib/productExclusions';
import {
  filterProductsBySearch,
  normalizeSearchQuery,
} from '@/lib/productSearch';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';

import './Settings.css';

interface SettingsProps {
  onBack: () => void;
}

function resolveCategory(product: Product): string {
  return product.category ?? 'прочее';
}

export function Settings({ onBack }: SettingsProps) {
  const {
    stores,
    loading: storesLoading,
    error: storesError,
    addStore,
    renameStore,
    deleteStore,
    moveStore,
    clearError: clearStoresError,
  } = useStores();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRevision, setCategoryRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [confirmDeleteStoreId, setConfirmDeleteStoreId] = useState<string | null>(
    null,
  );
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingExclusions, setEditingExclusions] = useState<string[]>([]);
  const [loadingExclusions, setLoadingExclusions] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setProducts([]);
    } else {
      setProducts((data ?? []).map((product) => ({
        ...product,
        is_favorite: product.is_favorite ?? false,
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const bumpCategories = () => {
    setCategoryRevision((revision) => revision + 1);
  };

  const categoryOptions = useMemo(() => {
    void categoryRevision;
    const merged = getAllCategories();

    for (const product of products) {
      const category = resolveCategory(product);
      if (!merged.includes(category)) {
        merged.push(category);
      }
    }

    return merged;
  }, [products, categoryRevision]);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }),
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalized = normalizeSearchQuery(productSearchQuery);
    return filterProductsBySearch(sortedProducts, normalized);
  }, [sortedProducts, productSearchQuery]);

  const openProductSettings = async (product: Product) => {
    setError(null);
    setLoadingExclusions(true);
    setEditingProduct(product);

    const { storeIds, error: exclusionsError } = await fetchExcludedStoreIds(
      product.id,
    );

    setLoadingExclusions(false);

    if (exclusionsError) {
      setError(exclusionsError);
      setEditingProduct(null);
      return;
    }

    setEditingExclusions(storeIds);
  };

  const closeProductSettings = () => {
    setEditingProduct(null);
    setEditingExclusions([]);
  };

  const handleSaveProductSettings = async (
    values: ProductSettingsValues,
  ): Promise<{ error: string | null }> => {
    if (!editingProduct) {
      return { error: 'Продукт не выбран' };
    }

    if (
      values.isFavorite &&
      !editingProduct.is_favorite
    ) {
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_favorite', true);

      if (countError) {
        return { error: countError.message };
      }

      if ((count ?? 0) >= MAX_FREQUENT) {
        return {
          error: `Можно добавить не больше ${MAX_FREQUENT} мастхэв-продуктов`,
        };
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        category: values.category,
        is_favorite: values.isFavorite,
      })
      .eq('id', editingProduct.id);

    if (updateError) {
      return { error: updateError.message };
    }

    const { error: exclusionsError } = await setProductExclusions(
      editingProduct.id,
      values.excludedStoreIds,
    );

    if (exclusionsError) {
      return { error: exclusionsError };
    }

    await fetchProducts();
    closeProductSettings();
    return { error: null };
  };

  const handleAddCategory = (event: FormEvent) => {
    event.preventDefault();

    const { error: addError } = addCustomCategory(newCategoryName);
    if (addError) {
      setError(addError);
      return;
    }

    bumpCategories();
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const startRenameCategory = (category: string) => {
    setEditingCategory(category);
    setEditCategoryName(category);
    setError(null);
  };

  const cancelRenameCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleRenameCategory = async (oldName: string) => {
    const trimmed = editCategoryName.trim().toLowerCase();

    if (!trimmed) {
      setError('Введите название категории');
      return;
    }

    if (trimmed === oldName) {
      cancelRenameCategory();
      return;
    }

    const { error: configError } = renameCategoryInConfig(oldName, trimmed);
    if (configError) {
      setError(configError);
      return;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ category: trimmed })
      .eq('category', oldName);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    bumpCategories();
    cancelRenameCategory();
    await fetchProducts();
  };

  const handleDeleteCategory = async (name: string) => {
    setError(null);

    const { error: configError } = deleteCategoryFromConfig(name);
    if (configError) {
      setError(configError);
      return;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ category: 'прочее' })
      .eq('category', name);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    bumpCategories();
    await fetchProducts();
  };

  const handleMoveCategory = (category: string, direction: 'up' | 'down') => {
    moveCategoryInOrder(categoryOptions, category, direction);
    bumpCategories();
  };

  const displayError = error ?? storesError;

  const handleAddStore = async (event: FormEvent) => {
    event.preventDefault();

    const { error: addError } = await addStore(newStoreName);
    if (addError) {
      setError(addError);
      return;
    }

    setError(null);
    setNewStoreName('');
    setShowAddStore(false);
  };

  const startRenameStore = (storeId: string, name: string) => {
    setEditingStoreId(storeId);
    setEditStoreName(name);
    setConfirmDeleteStoreId(null);
    setError(null);
  };

  const cancelRenameStore = () => {
    setEditingStoreId(null);
    setEditStoreName('');
  };

  const handleRenameStore = async (storeId: string, oldName: string) => {
    const trimmed = editStoreName.trim();

    if (!trimmed) {
      setError('Введите название магазина');
      return;
    }

    if (trimmed === oldName) {
      cancelRenameStore();
      return;
    }

    const { error: renameError } = await renameStore(storeId, trimmed);
    if (renameError) {
      setError(renameError);
      return;
    }

    setError(null);
    cancelRenameStore();
  };

  const handleDeleteStore = async (storeId: string) => {
    const { error: deleteError } = await deleteStore(storeId);
    if (deleteError) {
      setError(deleteError);
      return;
    }

    setError(null);
    setConfirmDeleteStoreId(null);
  };

  const handleMoveStore = async (storeId: string, direction: 'up' | 'down') => {
    const { error: moveError } = await moveStore(storeId, direction);
    if (moveError) {
      setError(moveError);
    } else {
      setError(null);
    }
  };

  const isLoading = loading || storesLoading;

  return (
    <div className="settings">
      <div className="settings__top">
        <button type="button" className="settings__back" onClick={onBack}>
          ← Назад
        </button>
        <h2 className="settings__title">Настройки</h2>
        <p className="settings__subtitle">Магазины, категории и продукты</p>
      </div>

      {displayError && (
        <ErrorBanner
          message={displayError}
          onDismiss={() => {
            setError(null);
            clearStoresError();
          }}
        />
      )}

      {isLoading ? (
        <div className="settings__centered">
          <div className="settings__spinner" aria-label="Загрузка" />
        </div>
      ) : editingProduct ? (
        loadingExclusions ? (
          <div className="settings__centered">
            <div className="settings__spinner" aria-label="Загрузка" />
          </div>
        ) : (
          <ProductSettingsForm
            product={editingProduct}
            stores={stores}
            categoryOptions={categoryOptions}
            initialValues={{
              category: resolveCategory(editingProduct),
              isFavorite: editingProduct.is_favorite,
              excludedStoreIds: editingExclusions,
            }}
            onSave={handleSaveProductSettings}
            onCancel={closeProductSettings}
          />
        )
      ) : (
        <>
          <section className="settings__section">
            <h3 className="settings__section-title">Магазины</h3>
            <p className="settings__section-hint">
              Ваши точки для списка покупок. Стрелками ↑ ↓ задайте порядок.
            </p>

            {!showAddStore ? (
              <button
                type="button"
                className="settings__add-category"
                onClick={() => setShowAddStore(true)}
              >
                + Добавить магазин
              </button>
            ) : (
              <form className="settings__add-form" onSubmit={handleAddStore}>
                <input
                  className="settings__add-input"
                  placeholder="Название магазина"
                  value={newStoreName}
                  onChange={(event) => setNewStoreName(event.target.value)}
                  autoFocus
                />
                <button type="submit" className="settings__add-submit">
                  Добавить
                </button>
                <button
                  type="button"
                  className="settings__add-cancel"
                  onClick={() => {
                    setShowAddStore(false);
                    setNewStoreName('');
                  }}
                >
                  Отмена
                </button>
              </form>
            )}

            {stores.length === 0 ? (
              <p className="settings__empty-list">Пока нет магазинов</p>
            ) : (
              <ul className="settings__category-list settings__store-list">
                {stores.map((store, index) => (
                  <li key={store.id} className="settings__category-row">
                    {editingStoreId === store.id ? (
                      <form
                        className="settings__category-edit"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleRenameStore(store.id, store.name);
                        }}
                      >
                        <input
                          className="settings__category-input"
                          value={editStoreName}
                          onChange={(event) =>
                            setEditStoreName(event.target.value)
                          }
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="settings__category-save"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="settings__category-cancel"
                          onClick={cancelRenameStore}
                        >
                          Отмена
                        </button>
                      </form>
                    ) : confirmDeleteStoreId === store.id ? (
                      <div className="settings__confirm-delete">
                        <span className="settings__confirm-delete-text">
                          Удалить «{store.name}»?
                        </span>
                        <div className="settings__category-actions">
                          <button
                            type="button"
                            className="settings__category-save"
                            onClick={() => void handleDeleteStore(store.id)}
                          >
                            Удалить
                          </button>
                          <button
                            type="button"
                            className="settings__category-cancel"
                            onClick={() => setConfirmDeleteStoreId(null)}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="settings__category-order">
                          <button
                            type="button"
                            className="settings__category-move"
                            aria-label={`Поднять магазин ${store.name}`}
                            disabled={index === 0}
                            onClick={() =>
                              void handleMoveStore(store.id, 'up')
                            }
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="settings__category-move"
                            aria-label={`Опустить магазин ${store.name}`}
                            disabled={index === stores.length - 1}
                            onClick={() =>
                              void handleMoveStore(store.id, 'down')
                            }
                          >
                            ↓
                          </button>
                        </div>
                        <span className="settings__category-name">
                          {store.name}
                        </span>
                        <div className="settings__category-actions">
                          <button
                            type="button"
                            className="settings__category-rename"
                            onClick={() =>
                              startRenameStore(store.id, store.name)
                            }
                          >
                            Переименовать
                          </button>
                          <button
                            type="button"
                            className="settings__category-delete"
                            aria-label={`Удалить магазин ${store.name}`}
                            onClick={() => {
                              setConfirmDeleteStoreId(store.id);
                              setEditingStoreId(null);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="settings__section">
            <h3 className="settings__section-title">Продукты</h3>
            <p className="settings__section-hint">
              Нажмите на продукт, чтобы настроить категорию и магазины
            </p>

            {sortedProducts.length > 0 && (
              <input
                type="search"
                className="settings__search-input"
                placeholder="Поиск по названию"
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
              />
            )}

            {sortedProducts.length === 0 ? (
              <p className="settings__empty-list">Пока нет продуктов</p>
            ) : filteredProducts.length === 0 ? (
              <p className="settings__empty-list">Ничего не найдено</p>
            ) : (
              <ul className="settings__items">
                {filteredProducts.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      className="settings__product-button"
                      onClick={() => void openProductSettings(product)}
                    >
                      <span className="settings__product-button-name">
                        {product.name}
                      </span>
                      <span className="settings__product-button-meta">
                        {resolveCategory(product)}
                        {product.is_favorite ? ' · ★' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="settings__section">
            <h3 className="settings__section-title">Категории</h3>
            <p className="settings__section-hint">
              Стрелками ↑ ↓ задайте порядок категорий на главных вкладках
            </p>

            {!showAddCategory ? (
              <button
                type="button"
                className="settings__add-category"
                onClick={() => setShowAddCategory(true)}
              >
                + Добавить категорию
              </button>
            ) : (
              <form className="settings__add-form" onSubmit={handleAddCategory}>
                <input
                  className="settings__add-input"
                  placeholder="Название категории"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  autoFocus
                />
                <button type="submit" className="settings__add-submit">
                  Добавить
                </button>
                <button
                  type="button"
                  className="settings__add-cancel"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  Отмена
                </button>
              </form>
            )}

            <ul className="settings__category-list">
              {categoryOptions.map((category, index) => (
                <li key={category} className="settings__category-row">
                  {editingCategory === category ? (
                    <form
                      className="settings__category-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRenameCategory(category);
                      }}
                    >
                      <input
                        className="settings__category-input"
                        value={editCategoryName}
                        onChange={(event) =>
                          setEditCategoryName(event.target.value)
                        }
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="settings__category-save"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="settings__category-cancel"
                        onClick={cancelRenameCategory}
                      >
                        Отмена
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="settings__category-order">
                        <button
                          type="button"
                          className="settings__category-move"
                          aria-label={`Поднять категорию ${category}`}
                          disabled={index === 0}
                          onClick={() => handleMoveCategory(category, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="settings__category-move"
                          aria-label={`Опустить категорию ${category}`}
                          disabled={index === categoryOptions.length - 1}
                          onClick={() => handleMoveCategory(category, 'down')}
                        >
                          ↓
                        </button>
                      </div>
                      <span className="settings__category-name">{category}</span>
                      <div className="settings__category-actions">
                        <button
                          type="button"
                          className="settings__category-rename"
                          onClick={() => startRenameCategory(category)}
                        >
                          Переименовать
                        </button>
                        {category !== 'прочее' && (
                          <button
                            type="button"
                            className="settings__category-delete"
                            aria-label={`Удалить категорию ${category}`}
                            onClick={() => void handleDeleteCategory(category)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
