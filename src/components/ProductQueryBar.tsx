import { useEffect, useState, type FormEvent } from 'react';

import { StoreExclusionsField } from '@/components/StoreExclusionsField';
import type { ProductStatus } from '@/types/product';
import type { Store } from '@/types/store';

import { ErrorBanner } from './ErrorBanner';
import './ProductQueryBar.css';

interface AddProductResult {
  error: string | null;
  duplicateStatus?: ProductStatus;
}

interface ProductQueryBarProps {
  query: string;
  tab: ProductStatus;
  placeholder: string;
  stores: Store[];
  selectedStoreId?: string | null;
  onQueryChange: (query: string) => void;
  onAdd: (
    name: string,
    excludedStoreIds?: string[],
  ) => Promise<AddProductResult>;
  onGoToTab: (tab: ProductStatus, query?: string) => void;
}

export function ProductQueryBar({
  query,
  tab,
  placeholder,
  stores,
  selectedStoreId = null,
  onQueryChange,
  onAdd,
  onGoToTab,
}: ProductQueryBarProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);
  const [duplicateStatus, setDuplicateStatus] = useState<
    ProductStatus | undefined
  >(undefined);
  const [showExclusions, setShowExclusions] = useState(false);
  const [excludedStoreIds, setExcludedStoreIds] = useState<string[]>([]);

  const hasStores = stores.length > 0;
  const hasQuery = query.trim().length > 0;
  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  useEffect(() => {
    if (!successHint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessHint(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successHint]);

  const resetExclusions = () => {
    setShowExclusions(false);
    setExcludedStoreIds([]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setError(null);
    setSuccessHint(null);
    setDuplicateStatus(undefined);
    setSubmitting(true);
    const result = await onAdd(
      query,
      showExclusions ? excludedStoreIds : [],
    );
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      setDuplicateStatus(result.duplicateStatus);
      return;
    }

    if (tab === 'finished' && selectedStore) {
      setSuccessHint('Добавлено в список покупок');
    }

    onQueryChange('');
    resetExclusions();
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
      {successHint && (
        <p className="query-bar__success-hint" role="status">
          {successHint}
        </p>
      )}
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
              onClick={() => {
                onQueryChange('');
                resetExclusions();
              }}
              aria-label="Очистить"
            >
              ×
            </button>
          )}
        </div>
        <button
          className="query-bar__button"
          type="submit"
          disabled={submitting || !hasQuery}
        >
          {submitting ? '...' : 'Добавить'}
        </button>
      </div>

      {hasStores && hasQuery && (
        <div className="query-bar__extras">
          {!showExclusions ? (
            <button
              type="button"
              className="query-bar__more"
              onClick={() => setShowExclusions(true)}
            >
              Ещё: не покупаю в...
            </button>
          ) : (
            <>
              <StoreExclusionsField
                stores={stores}
                excludedStoreIds={excludedStoreIds}
                onChange={setExcludedStoreIds}
                disabled={submitting}
              />
              <button
                type="button"
                className="query-bar__skip"
                onClick={resetExclusions}
              >
                Пропустить
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
