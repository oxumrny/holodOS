import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';

import { ErrorBanner } from '@/components/ErrorBanner';
import { FrequentStar } from '@/components/FrequentStar';
import {
  isProductPinned,
  toggleProductPin,
} from '@/lib/frequentProducts';
import {
  addCustomCategory,
  deleteCategoryFromConfig,
  getAllCategories,
  renameCategoryInConfig,
  setCategoryOrder,
} from '@/lib/categoryConfig';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRevision, setCategoryRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [musthaveRevision, setMusthaveRevision] = useState(0);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

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
      setProducts(data ?? []);
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
    const known = new Set(merged);

    for (const product of products) {
      const category = resolveCategory(product);
      if (!known.has(category)) {
        merged.push(category);
        known.add(category);
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

  const handleToggleFrequent = (productId: string) => {
    const { error: toggleError } = toggleProductPin(productId);
    if (toggleError) {
      setError(toggleError);
      return;
    }

    setError(null);
    setMusthaveRevision((revision) => revision + 1);
  };

  const handleCategoryChange = async (productId: string, newCategory: string) => {
    setError(null);

    const { error: updateError } = await supabase
      .from('products')
      .update({ category: newCategory })
      .eq('id', productId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchProducts();
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

  const handleCategoryDragStart =
    (category: string) => (event: DragEvent<HTMLButtonElement>) => {
      if (editingCategory) {
        event.preventDefault();
        return;
      }

      setDraggingCategory(category);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', category);
    };

  const handleCategoryDragOver =
    (category: string) => (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      if (draggingCategory && category !== draggingCategory) {
        setDragOverCategory(category);
      }
    };

  const handleCategoryDrop =
    (targetCategory: string) => (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();

      const sourceCategory =
        draggingCategory ?? event.dataTransfer.getData('text/plain');

      if (!sourceCategory || sourceCategory === targetCategory) {
        setDraggingCategory(null);
        setDragOverCategory(null);
        return;
      }

      const fromIndex = categoryOptions.indexOf(sourceCategory);
      const toIndex = categoryOptions.indexOf(targetCategory);

      if (fromIndex === -1 || toIndex === -1) {
        setDraggingCategory(null);
        setDragOverCategory(null);
        return;
      }

      const nextOrder = [...categoryOptions];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, sourceCategory);

      setCategoryOrder(nextOrder);
      bumpCategories();
      setDraggingCategory(null);
      setDragOverCategory(null);
    };

  const handleCategoryDragEnd = () => {
    setDraggingCategory(null);
    setDragOverCategory(null);
  };

  return (
    <div className="settings">
      <div className="settings__top">
        <button type="button" className="settings__back" onClick={onBack}>
          ← Назад
        </button>
        <h2 className="settings__title">Настройки</h2>
        <p className="settings__subtitle">Категории и продукты</p>
      </div>

      <div className="settings__toolbar">
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
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="settings__centered">
          <div className="settings__spinner" aria-label="Загрузка" />
        </div>
      ) : (
        <>
          <section className="settings__section">
            <h3 className="settings__section-title">Продукты</h3>
            {sortedProducts.length === 0 ? (
              <p className="settings__empty-list">Пока нет продуктов</p>
            ) : (
              <ul className="settings__items">
                {sortedProducts.map((product) => {
                  void musthaveRevision;

                  return (
                  <li key={product.id} className="settings__item">
                    <span className="settings__item-name">{product.name}</span>
                    <FrequentStar
                      active={isProductPinned(product.id)}
                      interactive
                      onToggle={() => handleToggleFrequent(product.id)}
                    />
                    <select
                      className="settings__item-category"
                      value={resolveCategory(product)}
                      aria-label={`Категория: ${product.name}`}
                      onChange={(event) =>
                        void handleCategoryChange(product.id, event.target.value)
                      }
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="settings__section">
            <h3 className="settings__section-title">Категории</h3>
            <p className="settings__section-hint">
              Перетащите карточки за ручку слева, чтобы изменить порядок на
              главных вкладках
            </p>
            <ul className="settings__category-list">
              {categoryOptions.map((category) => (
                <li
                  key={category}
                  className={[
                    'settings__category-row',
                    draggingCategory === category
                      ? 'settings__category-row--dragging'
                      : '',
                    dragOverCategory === category
                      ? 'settings__category-row--drag-over'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onDragOver={handleCategoryDragOver(category)}
                  onDrop={handleCategoryDrop(category)}
                >
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
                      <button
                        type="button"
                        className="settings__category-drag"
                        draggable
                        aria-label={`Перетащить категорию ${category}`}
                        onDragStart={handleCategoryDragStart(category)}
                        onDragEnd={handleCategoryDragEnd}
                      >
                        ⋮⋮
                      </button>
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
