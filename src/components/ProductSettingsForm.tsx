import { useState } from 'react';

import { FrequentStar } from '@/components/FrequentStar';
import { StoreExclusionsField } from '@/components/StoreExclusionsField';
import type { Product } from '@/types/product';
import type { Store } from '@/types/store';

import './ProductSettingsForm.css';

export interface ProductSettingsValues {
  category: string;
  isFavorite: boolean;
  excludedStoreIds: string[];
}

interface ProductSettingsFormProps {
  product: Product;
  stores: Store[];
  categoryOptions: string[];
  initialValues: ProductSettingsValues;
  onSave: (values: ProductSettingsValues) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

export function ProductSettingsForm({
  product,
  stores,
  categoryOptions,
  initialValues,
  onSave,
  onCancel,
}: ProductSettingsFormProps) {
  const [category, setCategory] = useState(initialValues.category);
  const [isFavorite, setIsFavorite] = useState(initialValues.isFavorite);
  const [excludedStoreIds, setExcludedStoreIds] = useState(
    initialValues.excludedStoreIds,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);

    const result = await onSave({
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
        <button
          type="button"
          className="product-settings__back"
          onClick={onCancel}
        >
          ← Назад
        </button>
        <h3 className="product-settings__title">{product.name}</h3>
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
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
