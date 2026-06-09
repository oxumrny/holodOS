import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

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
  moveCategoryInOrder,
  renameCategoryInConfig,
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

  const handleMoveCategory = (category: string, direction: 'up' | 'down') => {
    moveCategoryInOrder(categoryOptions, category, direction);
    bumpCategories();
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
              Стрелками ↑ ↓ задайте порядок категорий на главных вкладках
            </p>
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
