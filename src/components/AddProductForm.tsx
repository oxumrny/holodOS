import { useState, type FormEvent } from 'react';

import { ErrorBanner } from './ErrorBanner';
import './AddProductForm.css';

interface AddProductFormProps {
  onAdd: (name: string) => Promise<{ error: string | null }>;
}

export function AddProductForm({ onAdd }: AddProductFormProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    const { error: addError } = await onAdd(name);
    setSubmitting(false);

    if (addError) {
      setError(addError);
      return;
    }

    setName('');
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}
      <label className="add-form__label" htmlFor="product-name">
        Новый продукт
      </label>
      <div className="add-form__row">
        <input
          id="product-name"
          className="add-form__input"
          placeholder="Молоко, яйца, сыр..."
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={submitting}
        />
        <button className="add-form__button" type="submit" disabled={submitting}>
          {submitting ? '...' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}
