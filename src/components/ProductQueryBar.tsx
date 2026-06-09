import { useState, type FormEvent } from 'react';

import type { ProductStatus } from '@/types/product';

import { ErrorBanner } from './ErrorBanner';
import './ProductQueryBar.css';

interface AddProductResult {
  error: string | null;
  duplicateStatus?: ProductStatus;
}

interface ProductQueryBarBaseProps {
  query: string;
  onQueryChange: (query: string) => void;
}

interface ProductQueryBarSearchProps extends ProductQueryBarBaseProps {
  mode: 'search-only';
}

interface ProductQueryBarAddProps extends ProductQueryBarBaseProps {
  mode: 'search-and-add';
  onAdd: (name: string) => Promise<AddProductResult>;
  onGoToTab: (tab: ProductStatus, query?: string) => void;
}

type ProductQueryBarProps = ProductQueryBarSearchProps | ProductQueryBarAddProps;

export function ProductQueryBar(props: ProductQueryBarProps) {
  const { query, onQueryChange, mode } = props;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateStatus, setDuplicateStatus] = useState<
    ProductStatus | undefined
  >(undefined);

  const isAddMode = mode === 'search-and-add';
  const inputId = isAddMode ? 'product-query' : 'product-search';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAddMode || submitting) {
      return;
    }

    setError(null);
    setDuplicateStatus(undefined);
    setSubmitting(true);
    const result = await props.onAdd(query);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      setDuplicateStatus(result.duplicateStatus);
      return;
    }

    onQueryChange('');
  };

  const handleGoToDuplicate = () => {
    if (!isAddMode || !duplicateStatus) {
      return;
    }

    props.onGoToTab(duplicateStatus, query.trim());
    setError(null);
    setDuplicateStatus(undefined);
  };

  const content = (
    <>
      {error && !duplicateStatus && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}
      {error && duplicateStatus && isAddMode && (
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
            id={inputId}
            type="search"
            className="query-bar__input"
            placeholder={
              isAddMode
                ? 'Найти или добавить продукт...'
                : 'Найти продукт...'
            }
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            disabled={submitting}
            autoComplete="off"
            enterKeyHint={isAddMode ? 'done' : 'search'}
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
        {isAddMode && (
          <button
            className="query-bar__button"
            type="submit"
            disabled={submitting || !query.trim()}
          >
            {submitting ? '...' : 'Добавить'}
          </button>
        )}
      </div>
    </>
  );

  if (isAddMode) {
    return (
      <form className="query-bar" onSubmit={handleSubmit}>
        {content}
      </form>
    );
  }

  return <div className="query-bar">{content}</div>;
}
