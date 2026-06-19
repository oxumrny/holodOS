import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import {
  filterProductsBySearch,
  normalizeSearchQuery,
} from '@/lib/productSearch';
import type { Product } from '@/types/product';

import './RecipeForm.css';

export interface RecipeFormValues {
  title: string;
  instructions: string;
  cookTimeMinutes: number;
  productIds: string[];
}

interface RecipeFormProps {
  mode: 'create' | 'edit';
  products: Product[];
  activeProductIds: Set<string>;
  initialValues: RecipeFormValues;
  initialDeletedIngredientCount?: number;
  onSave: (values: RecipeFormValues) => Promise<{ error: string | null }>;
  onDelete?: () => Promise<{ error: string | null }>;
  onClose: () => void;
}

export interface RecipeFormHandle {
  requestClose: () => void;
}

function areProductIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.every((productId, index) => productId === sortedRight[index]);
}

export const RecipeForm = forwardRef<RecipeFormHandle, RecipeFormProps>(
  function RecipeForm(
    {
      mode,
      products,
      activeProductIds,
      initialValues,
      initialDeletedIngredientCount = 0,
      onSave,
      onDelete,
      onClose,
    },
    ref,
  ) {
    const [title, setTitle] = useState(initialValues.title);
    const [instructions, setInstructions] = useState(initialValues.instructions);
    const [cookTimeMinutes, setCookTimeMinutes] = useState(
      initialValues.cookTimeMinutes,
    );
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
      () => new Set(initialValues.productIds),
    );
    const [orphanedDeletedKeys, setOrphanedDeletedKeys] = useState<string[]>(
      () =>
        Array.from({ length: initialDeletedIngredientCount }, (_, index) =>
          `deleted-${index}`,
        ),
    );
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBusy = saving || deleting;
    const trimmedTitle = title.trim();

    const selectedProductIdsArray = useMemo(
      () =>
        [...selectedProductIds].sort((left, right) =>
          left.localeCompare(right),
        ),
      [selectedProductIds],
    );

    const productById = useMemo(() => {
      const map = new Map<string, Product>();

      for (const product of products) {
        map.set(product.id, product);
      }

      return map;
    }, [products]);

    const selectedIngredientCount =
      selectedProductIds.size + orphanedDeletedKeys.length;

    const isDirty = useMemo(
      () =>
        trimmedTitle !== initialValues.title.trim() ||
        instructions.trim() !== initialValues.instructions.trim() ||
        cookTimeMinutes !== initialValues.cookTimeMinutes ||
        orphanedDeletedKeys.length !== initialDeletedIngredientCount ||
        !areProductIdsEqual(
          selectedProductIdsArray,
          initialValues.productIds,
        ),
      [
        cookTimeMinutes,
        initialValues,
        instructions,
        selectedProductIdsArray,
        trimmedTitle,
        orphanedDeletedKeys.length,
        initialDeletedIngredientCount,
      ],
    );

    const normalizedIngredientSearch = useMemo(
      () => normalizeSearchQuery(ingredientSearch),
      [ingredientSearch],
    );

    const filteredProducts = useMemo(
      () => filterProductsBySearch(products, normalizedIngredientSearch),
      [normalizedIngredientSearch, products],
    );

    const handleCloseRequest = useCallback(() => {
      if (isBusy) {
        return;
      }

      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }

      if (
        isDirty &&
        !window.confirm('Изменения не сохранены. Закрыть без сохранения?')
      ) {
        return;
      }

      onClose();
    }, [isBusy, isDirty, onClose, showDeleteConfirm]);

    useImperativeHandle(ref, () => ({ requestClose: handleCloseRequest }), [
      handleCloseRequest,
    ]);

    const removeProduct = (productId: string) => {
      if (isBusy) {
        return;
      }

      setSelectedProductIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    };

    const removeOrphanedIngredient = (key: string) => {
      if (isBusy) {
        return;
      }

      setOrphanedDeletedKeys((current) =>
        current.filter((entry) => entry !== key),
      );
    };

    const toggleProduct = (productId: string) => {
      if (isBusy) {
        return;
      }

      setSelectedProductIds((current) => {
        const next = new Set(current);

        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
        }

        return next;
      });
    };

    const handleSubmit = async () => {
      if (isBusy) {
        return;
      }

      if (!trimmedTitle) {
        setError('Введите название рецепта');
        return;
      }

      if (selectedProductIds.size === 0) {
        setError('Добавьте хотя бы один ингредиент');
        return;
      }

      setSaving(true);
      setError(null);

      const result = await onSave({
        title: trimmedTitle,
        instructions: instructions.trim(),
        cookTimeMinutes: Math.max(0, cookTimeMinutes),
        productIds: selectedProductIdsArray,
      });

      setSaving(false);

      if (result.error) {
        setError(result.error);
      }
    };

    const handleDelete = async () => {
      if (isBusy || !onDelete) {
        return;
      }

      setDeleting(true);
      setError(null);

      const result = await onDelete();

      setDeleting(false);

      if (result.error) {
        setError(result.error);
      }
    };

    const dialogTitleId =
      mode === 'create' ? 'recipe-form-create-title' : 'recipe-form-edit-title';

    return (
      <div className="recipe-form">
        <div className="recipe-form__header">
          <h2 className="recipe-form__heading" id={dialogTitleId}>
            {mode === 'create' ? 'Новый рецепт' : 'Редактировать рецепт'}
          </h2>
          <button
            type="button"
            className="recipe-form__close"
            onClick={handleCloseRequest}
            disabled={isBusy}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {error && (
          <p className="recipe-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="recipe-form__field">
          <label className="recipe-form__label" htmlFor="recipe-title">
            Название
          </label>
          <input
            id="recipe-title"
            className="recipe-form__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isBusy}
            placeholder="Омлет"
            autoFocus
          />
        </div>

        <div className="recipe-form__field">
          <div className="recipe-form__field-header">
            <span className="recipe-form__label">
              Ингредиенты ({selectedIngredientCount})
            </span>
          </div>
          <input
            type="search"
            className="recipe-form__input recipe-form__search"
            value={ingredientSearch}
            onChange={(event) => setIngredientSearch(event.target.value)}
            disabled={isBusy}
            placeholder="Поиск продукта…"
            aria-label="Поиск ингредиентов"
          />
          {selectedIngredientCount > 0 && (
            <ul
              className="recipe-form__selected"
              aria-label="Выбранные ингредиенты"
            >
              {selectedProductIdsArray.map((productId) => {
                const product = productById.get(productId);
                const statusIcon = activeProductIds.has(productId)
                  ? '🧊'
                  : '📋';

                return (
                  <li key={productId} className="recipe-form__chip">
                    <span className="recipe-form__chip-icon" aria-hidden>
                      {statusIcon}
                    </span>
                    <span className="recipe-form__chip-name">
                      {product?.name ?? 'неизвестный продукт'}
                    </span>
                    <button
                      type="button"
                      className="recipe-form__chip-remove"
                      onClick={() => removeProduct(productId)}
                      disabled={isBusy}
                      aria-label={`Убрать ${product?.name ?? 'продукт'}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
              {orphanedDeletedKeys.map((key) => (
                <li
                  key={key}
                  className="recipe-form__chip recipe-form__chip--deleted"
                >
                  <span className="recipe-form__chip-icon" aria-hidden>
                    ⚠️
                  </span>
                  <span className="recipe-form__chip-name">
                    удалённый ингредиент
                  </span>
                  <button
                    type="button"
                    className="recipe-form__chip-remove"
                    onClick={() => removeOrphanedIngredient(key)}
                    disabled={isBusy}
                    aria-label="Убрать удалённый ингредиент"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {products.length === 0 ? (
            <p className="recipe-form__hint">
              Нет продуктов в каталоге — добавьте их в холодосе или настройках.
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="recipe-form__hint">
              {normalizedIngredientSearch
                ? `Ничего не найдено по запросу «${ingredientSearch.trim()}»`
                : 'Нет продуктов для выбора'}
            </p>
          ) : (
            <ul className="recipe-form__picker" aria-label="Выбор ингредиентов">
              {filteredProducts.map((product) => {
                const checked = selectedProductIds.has(product.id);
                const statusIcon = activeProductIds.has(product.id) ? '🧊' : '📋';

                return (
                  <li key={product.id} className="recipe-form__picker-item">
                    <label className="recipe-form__picker-label">
                      <input
                        type="checkbox"
                        className="recipe-form__picker-checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(product.id)}
                        disabled={isBusy}
                      />
                      <span
                        className="recipe-form__picker-icon"
                        aria-hidden
                      >
                        {statusIcon}
                      </span>
                      <span className="recipe-form__picker-name">
                        {product.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="recipe-form__field">
          <label className="recipe-form__label" htmlFor="recipe-instructions">
            Инструкция
          </label>
          <textarea
            id="recipe-instructions"
            className="recipe-form__textarea"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            disabled={isBusy}
            rows={5}
            placeholder="Опишите шаги приготовления…"
          />
        </div>

        <div className="recipe-form__field">
          <label className="recipe-form__label" htmlFor="recipe-cook-time">
            Время, мин
          </label>
          <input
            id="recipe-cook-time"
            type="number"
            className="recipe-form__input recipe-form__input--narrow"
            value={cookTimeMinutes}
            min={0}
            step={1}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              setCookTimeMinutes(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            disabled={isBusy}
          />
          <p className="recipe-form__hint">0 — не указывать время</p>
        </div>

        <div className="recipe-form__actions">
          <button
            type="button"
            className="recipe-form__save"
            onClick={() => void handleSubmit()}
            disabled={isBusy}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            type="button"
            className="recipe-form__cancel"
            onClick={handleCloseRequest}
            disabled={isBusy}
          >
            Отмена
          </button>
        </div>

        {mode === 'edit' && onDelete && (
          <div className="recipe-form__danger">
            {!showDeleteConfirm ? (
              <button
                type="button"
                className="recipe-form__delete-trigger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isBusy}
              >
                Удалить рецепт
              </button>
            ) : (
              <div className="recipe-form__delete-confirm">
                <p className="recipe-form__delete-text">
                  Рецепт «{trimmedTitle || title}» будет удалён без
                  возможности восстановления.
                </p>
                <div className="recipe-form__delete-actions">
                  <button
                    type="button"
                    className="recipe-form__delete-submit"
                    onClick={() => void handleDelete()}
                    disabled={isBusy}
                  >
                    {deleting ? 'Удаление…' : 'Удалить'}
                  </button>
                  <button
                    type="button"
                    className="recipe-form__delete-cancel"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isBusy}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
