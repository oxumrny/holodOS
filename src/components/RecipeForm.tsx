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
import type { MealType } from '@/types/recipe';

import './RecipeForm.css';

export interface RecipeFormGroupValues {
  label: string;
  productIds: string[];
  deletedOptionCount: number;
}

export interface RecipeFormValues {
  title: string;
  mealType: MealType;
  instructions: string;
  cookTimeMinutes: number;
  requiredProductIds: string[];
  requiredDeletedCount: number;
  groups: RecipeFormGroupValues[];
}

interface RecipeFormProps {
  mode: 'create' | 'edit';
  layout?: 'modal' | 'page';
  products: Product[];
  activeProductIds: Set<string>;
  initialValues: RecipeFormValues;
  onSave: (values: RecipeFormValues) => Promise<{ error: string | null }>;
  onDelete?: () => Promise<{ error: string | null }>;
  onClose: () => void;
}

export interface RecipeFormHandle {
  requestClose: () => void;
}

interface FormGroupState {
  clientId: string;
  label: string;
  selectedProductIds: Set<string>;
  orphanedDeletedKeys: string[];
}

function areProductIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.every((productId, index) => productId === sortedRight[index]);
}

function createGroupState(
  group: RecipeFormGroupValues,
  index: number,
): FormGroupState {
  return {
    clientId: `group-${index}`,
    label: group.label,
    selectedProductIds: new Set(group.productIds),
    orphanedDeletedKeys: Array.from(
      { length: group.deletedOptionCount },
      (_, orphanIndex) => `deleted-${index}-${orphanIndex}`,
    ),
  };
}

function nextGroupClientId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface IngredientPickerProps {
  pickerId: string;
  products: Product[];
  activeProductIds: Set<string>;
  productById: Map<string, Product>;
  selectedProductIds: Set<string>;
  excludedProductIds: Set<string>;
  orphanedDeletedKeys: string[];
  search: string;
  onSearchChange: (value: string) => void;
  disabled: boolean;
  onToggleProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onRemoveOrphaned: (key: string) => void;
}

function IngredientPicker({
  pickerId,
  products,
  activeProductIds,
  productById,
  selectedProductIds,
  excludedProductIds,
  orphanedDeletedKeys,
  search,
  onSearchChange,
  disabled,
  onToggleProduct,
  onRemoveProduct,
  onRemoveOrphaned,
}: IngredientPickerProps) {
  const normalizedSearch = useMemo(
    () => normalizeSearchQuery(search),
    [search],
  );

  const filteredProducts = useMemo(
    () => filterProductsBySearch(products, normalizedSearch),
    [normalizedSearch, products],
  );

  const selectedProductIdsArray = useMemo(
    () =>
      [...selectedProductIds].sort((left, right) => left.localeCompare(right)),
    [selectedProductIds],
  );

  const selectedCount = selectedProductIds.size + orphanedDeletedKeys.length;

  return (
    <div className="recipe-form__picker-block">
      <input
        id={pickerId}
        type="search"
        className="recipe-form__input recipe-form__search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        disabled={disabled}
        placeholder="Поиск продукта…"
        aria-label="Поиск продуктов"
      />

      {selectedCount > 0 && (
        <ul className="recipe-form__selected" aria-label="Выбранные продукты">
          {selectedProductIdsArray.map((productId) => {
            const product = productById.get(productId);
            const statusIcon = activeProductIds.has(productId) ? '🧊' : '📋';

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
                  onClick={() => onRemoveProduct(productId)}
                  disabled={disabled}
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
              <span className="recipe-form__chip-name">удалённый ингредиент</span>
              <button
                type="button"
                className="recipe-form__chip-remove"
                onClick={() => onRemoveOrphaned(key)}
                disabled={disabled}
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
          {normalizedSearch
            ? `Ничего не найдено по запросу «${search.trim()}»`
            : 'Нет продуктов для выбора'}
        </p>
      ) : (
        <ul className="recipe-form__picker" aria-labelledby={pickerId}>
          {filteredProducts.map((product) => {
            const checked = selectedProductIds.has(product.id);
            const isExcluded = excludedProductIds.has(product.id);
            const statusIcon = activeProductIds.has(product.id) ? '🧊' : '📋';

            return (
              <li key={product.id} className="recipe-form__picker-item">
                <label
                  className={`recipe-form__picker-label${
                    isExcluded ? ' recipe-form__picker-label--disabled' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="recipe-form__picker-checkbox"
                    checked={checked}
                    onChange={() => onToggleProduct(product.id)}
                    disabled={disabled || isExcluded}
                  />
                  <span className="recipe-form__picker-icon" aria-hidden>
                    {statusIcon}
                  </span>
                  <span className="recipe-form__picker-name">{product.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const RecipeForm = forwardRef<RecipeFormHandle, RecipeFormProps>(
  function RecipeForm(
    {
      mode,
      layout = 'modal',
      products,
      activeProductIds,
      initialValues,
      onSave,
      onDelete,
      onClose,
    },
    ref,
  ) {
    const [title, setTitle] = useState(initialValues.title);
    const [mealType, setMealType] = useState<MealType>(initialValues.mealType);
    const [instructions, setInstructions] = useState(initialValues.instructions);
    const [cookTimeMinutes, setCookTimeMinutes] = useState(
      initialValues.cookTimeMinutes,
    );
    const [requiredProductIds, setRequiredProductIds] = useState<Set<string>>(
      () => new Set(initialValues.requiredProductIds),
    );
    const [requiredOrphanedKeys, setRequiredOrphanedKeys] = useState<string[]>(
      () =>
        Array.from({ length: initialValues.requiredDeletedCount }, (_, index) =>
          `required-deleted-${index}`,
        ),
    );
    const [groups, setGroups] = useState<FormGroupState[]>(() =>
      initialValues.groups.map(createGroupState),
    );
    const [requiredSearch, setRequiredSearch] = useState('');
    const [groupSearches, setGroupSearches] = useState<Record<string, string>>(
      {},
    );
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBusy = saving || deleting;
    const trimmedTitle = title.trim();

    const requiredProductIdsArray = useMemo(
      () =>
        [...requiredProductIds].sort((left, right) => left.localeCompare(right)),
      [requiredProductIds],
    );

    const productById = useMemo(() => {
      const map = new Map<string, Product>();

      for (const product of products) {
        map.set(product.id, product);
      }

      return map;
    }, [products]);

    const excludedForRequired = useMemo(() => {
      const excluded = new Set<string>();

      for (const group of groups) {
        for (const productId of group.selectedProductIds) {
          excluded.add(productId);
        }
      }

      return excluded;
    }, [groups]);

    const getExcludedForGroup = useCallback(
      (groupClientId: string) => {
        const excluded = new Set(requiredProductIds);

        for (const group of groups) {
          if (group.clientId === groupClientId) {
            continue;
          }

          for (const productId of group.selectedProductIds) {
            excluded.add(productId);
          }
        }

        return excluded;
      },
      [groups, requiredProductIds],
    );

    const isDirty = useMemo(() => {
      if (trimmedTitle !== initialValues.title.trim()) {
        return true;
      }

      if (mealType !== initialValues.mealType) {
        return true;
      }

      if (instructions.trim() !== initialValues.instructions.trim()) {
        return true;
      }

      if (cookTimeMinutes !== initialValues.cookTimeMinutes) {
        return true;
      }

      if (
        requiredOrphanedKeys.length !== initialValues.requiredDeletedCount
      ) {
        return true;
      }

      if (
        !areProductIdsEqual(
          requiredProductIdsArray,
          initialValues.requiredProductIds,
        )
      ) {
        return true;
      }

      if (groups.length !== initialValues.groups.length) {
        return true;
      }

      return groups.some((group, index) => {
        const initialGroup = initialValues.groups[index];

        if (!initialGroup) {
          return true;
        }

        if (group.label.trim() !== initialGroup.label.trim()) {
          return true;
        }

        if (group.orphanedDeletedKeys.length !== initialGroup.deletedOptionCount) {
          return true;
        }

        return !areProductIdsEqual(
          [...group.selectedProductIds],
          initialGroup.productIds,
        );
      });
    }, [
      cookTimeMinutes,
      groups,
      initialValues,
      instructions,
      mealType,
      requiredOrphanedKeys.length,
      requiredProductIdsArray,
      trimmedTitle,
    ]);

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

    const addGroup = () => {
      if (isBusy) {
        return;
      }

      setGroups((current) => [
        ...current,
        {
          clientId: nextGroupClientId(),
          label: `Группа ${current.length + 1}`,
          selectedProductIds: new Set(),
          orphanedDeletedKeys: [],
        },
      ]);
    };

    const removeGroup = (clientId: string) => {
      if (isBusy) {
        return;
      }

      setGroups((current) =>
        current.filter((group) => group.clientId !== clientId),
      );
      setGroupSearches((current) => {
        const next = { ...current };
        delete next[clientId];
        return next;
      });
    };

    const updateGroupLabel = (clientId: string, label: string) => {
      if (isBusy) {
        return;
      }

      setGroups((current) =>
        current.map((group) =>
          group.clientId === clientId ? { ...group, label } : group,
        ),
      );
    };

    const toggleRequiredProduct = (productId: string) => {
      if (isBusy) {
        return;
      }

      setRequiredProductIds((current) => {
        const next = new Set(current);

        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
        }

        return next;
      });
    };

    const toggleGroupProduct = (clientId: string, productId: string) => {
      if (isBusy) {
        return;
      }

      setGroups((current) =>
        current.map((group) => {
          if (group.clientId !== clientId) {
            return group;
          }

          const nextIds = new Set(group.selectedProductIds);

          if (nextIds.has(productId)) {
            nextIds.delete(productId);
          } else {
            nextIds.add(productId);
          }

          return { ...group, selectedProductIds: nextIds };
        }),
      );
    };

    const handleSubmit = async () => {
      if (isBusy) {
        return;
      }

      if (!trimmedTitle) {
        setError('Введите название рецепта');
        return;
      }

      setSaving(true);
      setError(null);

      const result = await onSave({
        title: trimmedTitle,
        mealType,
        instructions: instructions.trim(),
        cookTimeMinutes: Math.max(0, cookTimeMinutes),
        requiredProductIds: requiredProductIdsArray,
        requiredDeletedCount: requiredOrphanedKeys.length,
        groups: groups.map((group) => ({
          label: group.label.trim(),
          productIds: [...group.selectedProductIds].sort((left, right) =>
            left.localeCompare(right),
          ),
          deletedOptionCount: group.orphanedDeletedKeys.length,
        })),
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
          {layout === 'modal' && (
            <button
              type="button"
              className="recipe-form__close"
              onClick={handleCloseRequest}
              disabled={isBusy}
              aria-label="Закрыть"
            >
              ×
            </button>
          )}
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

        <fieldset className="recipe-form__field recipe-form__meal-type">
          <legend className="recipe-form__label">Тип</legend>
          <div className="recipe-form__meal-options">
            <label className="recipe-form__meal-option">
              <input
                type="radio"
                name="recipe-meal-type"
                value="breakfast"
                checked={mealType === 'breakfast'}
                onChange={() => setMealType('breakfast')}
                disabled={isBusy}
              />
              <span>Завтрак</span>
            </label>
            <label className="recipe-form__meal-option">
              <input
                type="radio"
                name="recipe-meal-type"
                value="lunch"
                checked={mealType === 'lunch'}
                onChange={() => setMealType('lunch')}
                disabled={isBusy}
              />
              <span>Обед</span>
            </label>
          </div>
        </fieldset>

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

        <section className="recipe-form__ingredient-section">
          <div className="recipe-form__section-heading">
            <h3 className="recipe-form__section-title">Обязательно</h3>
            <span className="recipe-form__section-count">
              {requiredProductIds.size + requiredOrphanedKeys.length}
            </span>
          </div>
          <IngredientPicker
            pickerId="recipe-required-picker"
            products={products}
            activeProductIds={activeProductIds}
            productById={productById}
            selectedProductIds={requiredProductIds}
            excludedProductIds={excludedForRequired}
            orphanedDeletedKeys={requiredOrphanedKeys}
            search={requiredSearch}
            onSearchChange={setRequiredSearch}
            disabled={isBusy}
            onToggleProduct={toggleRequiredProduct}
            onRemoveProduct={(productId) => {
              if (isBusy) {
                return;
              }

              setRequiredProductIds((current) => {
                const next = new Set(current);
                next.delete(productId);
                return next;
              });
            }}
            onRemoveOrphaned={(key) => {
              if (isBusy) {
                return;
              }

              setRequiredOrphanedKeys((current) =>
                current.filter((entry) => entry !== key),
              );
            }}
          />
        </section>

        <section className="recipe-form__ingredient-section">
          <div className="recipe-form__section-heading">
            <h3 className="recipe-form__section-title">Одно из (группы)</h3>
          </div>

          {groups.length === 0 ? (
            <p className="recipe-form__hint">
              Добавьте группу, если нужен выбор — например, мясо или гарнир.
            </p>
          ) : (
            <div className="recipe-form__groups">
              {groups.map((group, index) => (
                <div key={group.clientId} className="recipe-form__group">
                  <div className="recipe-form__group-header">
                    <span className="recipe-form__group-index">
                      Группа {index + 1}
                    </span>
                    <button
                      type="button"
                      className="recipe-form__group-remove"
                      onClick={() => removeGroup(group.clientId)}
                      disabled={isBusy}
                    >
                      × Удалить группу
                    </button>
                  </div>

                  <div className="recipe-form__field">
                    <label
                      className="recipe-form__label"
                      htmlFor={`group-label-${group.clientId}`}
                    >
                      Название группы
                    </label>
                    <input
                      id={`group-label-${group.clientId}`}
                      className="recipe-form__input"
                      value={group.label}
                      onChange={(event) =>
                        updateGroupLabel(group.clientId, event.target.value)
                      }
                      disabled={isBusy}
                      placeholder="Мясо"
                    />
                  </div>

                  <IngredientPicker
                    pickerId={`group-picker-${group.clientId}`}
                    products={products}
                    activeProductIds={activeProductIds}
                    productById={productById}
                    selectedProductIds={group.selectedProductIds}
                    excludedProductIds={getExcludedForGroup(group.clientId)}
                    orphanedDeletedKeys={group.orphanedDeletedKeys}
                    search={groupSearches[group.clientId] ?? ''}
                    onSearchChange={(value) =>
                      setGroupSearches((current) => ({
                        ...current,
                        [group.clientId]: value,
                      }))
                    }
                    disabled={isBusy}
                    onToggleProduct={(productId) =>
                      toggleGroupProduct(group.clientId, productId)
                    }
                    onRemoveProduct={(productId) => {
                      if (isBusy) {
                        return;
                      }

                      setGroups((current) =>
                        current.map((entry) => {
                          if (entry.clientId !== group.clientId) {
                            return entry;
                          }

                          const nextIds = new Set(entry.selectedProductIds);
                          nextIds.delete(productId);
                          return { ...entry, selectedProductIds: nextIds };
                        }),
                      );
                    }}
                    onRemoveOrphaned={(key) => {
                      if (isBusy) {
                        return;
                      }

                      setGroups((current) =>
                        current.map((entry) => {
                          if (entry.clientId !== group.clientId) {
                            return entry;
                          }

                          return {
                            ...entry,
                            orphanedDeletedKeys: entry.orphanedDeletedKeys.filter(
                              (entryKey) => entryKey !== key,
                            ),
                          };
                        }),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="recipe-form__add-group"
            onClick={addGroup}
            disabled={isBusy}
          >
            + Добавить группу
          </button>
        </section>

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
