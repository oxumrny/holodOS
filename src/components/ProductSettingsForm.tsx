import { useCallback, useMemo, useRef, useState } from 'react';

import { FrequentStar } from '@/components/FrequentStar';
import { StoreExclusionsField } from '@/components/StoreExclusionsField';
import type { Store } from '@/types/store';

import './ProductSettingsForm.css';

export interface ProductSettingsValues {
  name: string;
  category: string;
  isFavorite: boolean;
  excludedStoreIds: string[];
}

interface ProductSettingsFormProps {
  stores: Store[];
  categoryOptions: string[];
  initialValues: ProductSettingsValues;
  onSave: (values: ProductSettingsValues) => Promise<{ error: string | null }>;
  onClose: () => void;
}

function areStoreIdsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();

  return sortedLeft.every((storeId, index) => storeId === sortedRight[index]);
}

export function ProductSettingsForm({
  stores,
  categoryOptions,
  initialValues,
  onSave,
  onClose,
}: ProductSettingsFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(initialValues.category);
  const [isFavorite, setIsFavorite] = useState(initialValues.isFavorite);
  const [excludedStoreIds, setExcludedStoreIds] = useState(
    initialValues.excludedStoreIds,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedName = name.trim().toLowerCase();

  const isDirty = useMemo(
    () =>
      normalizedName !== initialValues.name ||
      category !== initialValues.category ||
      isFavorite !== initialValues.isFavorite ||
      !areStoreIdsEqual(excludedStoreIds, initialValues.excludedStoreIds),
    [
      category,
      excludedStoreIds,
      initialValues,
      isFavorite,
      normalizedName,
    ],
  );

  const startEditingName = () => {
    if (saving) {
      return;
    }

    setNameDraft(name);
    setIsEditingName(true);

    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  };

  const commitNameEdit = () => {
    const trimmed = nameDraft.trim();

    if (trimmed) {
      setName(trimmed);
    }

    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setIsEditingName(false);
  };

  const handleCloseRequest = useCallback(() => {
    if (saving) {
      return;
    }

    if (
      isDirty &&
      !window.confirm('Изменения не сохранены. Закрыть без сохранения?')
    ) {
      return;
    }

    onClose();
  }, [isDirty, onClose, saving]);

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    let nameToSave = normalizedName;

    if (isEditingName) {
      const trimmed = nameDraft.trim();

      if (trimmed) {
        setName(trimmed);
        nameToSave = trimmed.toLowerCase();
      }

      setIsEditingName(false);
    }

    if (!nameToSave) {
      setError('Введите название продукта');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await onSave({
      name: nameToSave,
      category,
      isFavorite,
      excludedStoreIds,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="product-settings">
      <div className="product-settings__header">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            className="product-settings__name-input"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitNameEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitNameEdit();
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                cancelNameEdit();
              }
            }}
            disabled={saving}
            aria-label="Название продукта"
          />
        ) : (
          <button
            type="button"
            className="product-settings__title product-settings__title-button"
            id="product-settings-title"
            onClick={startEditingName}
            disabled={saving}
          >
            {name}
          </button>
        )}
        <button
          type="button"
          className="product-settings__close"
          onClick={handleCloseRequest}
          disabled={saving}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      {error && (
        <p className="product-settings__error" role="alert">
          {error}
        </p>
      )}

      <div className="product-settings__field">
        <label className="product-settings__label" htmlFor="product-category">
          Категория
        </label>
        <select
          id="product-category"
          className="product-settings__select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={saving}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="product-settings__field product-settings__field--row">
        <span className="product-settings__label">Часто покупаю</span>
        <FrequentStar
          active={isFavorite}
          interactive
          onToggle={() => setIsFavorite((current) => !current)}
        />
      </div>

      <StoreExclusionsField
        stores={stores}
        excludedStoreIds={excludedStoreIds}
        onChange={setExcludedStoreIds}
        disabled={saving}
      />

      <div className="product-settings__actions">
        <button
          type="button"
          className="product-settings__save"
          onClick={() => void handleSubmit()}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          className="product-settings__cancel"
          onClick={handleCloseRequest}
          disabled={saving}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
