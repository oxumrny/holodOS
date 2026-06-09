import { useState, type FormEvent } from 'react';

import type { ProductStatus } from '@/types/product';

import { ErrorBanner } from './ErrorBanner';
import './ProductQueryBar.css';

interface AddProductResult {
  error: string | null;
  duplicateStatus?: ProductStatus;
}

interface ProductQueryBarProps {
  query: string;
  placeholder: string;
  onQueryChange: (query: string) => void;
  onAdd: (name: string) => Promise<AddProductResult>;
  onGoToTab: (tab: ProductStatus, query?: string) => void;
}

export function ProductQueryBar({
  query,
  placeholder,
  onQueryChange,
  onAdd,
  onGoToTab,
}: ProductQueryBarProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateStatus, setDuplicateStatus] = useState<
    ProductStatus | undefined
  >(undefined);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setError(null);
    setDuplicateStatus(undefined);
    setSubmitting(true);
    const result = await onAdd(query);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      setDuplicateStatus(result.duplicateStatus);
      return;
    }

    onQueryChange('');
  };

  const handleGoToDuplicate = () => {
    if (!duplicateStatus) {
      return;
    }

    onGoToTab(duplicateStatus, query.trim());
    setError(null);
    setDuplicateStatus(undefined);
  };

  return (
    <form className="query-bar" onSubmit={handleSubmit}>
      {error && !duplicateStatus && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}
      {error && duplicateStatus && (
        <div className="query-bar__duplicate-hint">
          <p className="query-bar__duplicate-text">{error}</p>
          <button
            type="button"
            className="query-bar__duplicate-action"
            onClick={handleGoToDuplicate}
          >
            {duplicateStatus === 'finished'
              ? 'Открыть список покупок'
              : 'Открыть холодос'}
          </button>
        </div>
      )}
      <div className="query-bar__row">
        <div className="query-bar__input-wrap">
          <input
            id="product-query"
            type="search"
            className="query-bar__input"
            placeholder={placeholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            disabled={submitting}
            autoComplete="off"
            enterKeyHint="done"
          />
          {query && (
            <button
              type="button"
              className="query-bar__clear"
              onClick={() => onQueryChange('')}
              aria-label="Очистить"
            >
              ×
            </button>
          )}
        </div>
        <button
          className="query-bar__button"
          type="submit"
          disabled={submitting || !query.trim()}
        >
          {submitting ? '...' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}
