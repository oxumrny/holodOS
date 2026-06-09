import type { Product } from '@/types/product';

import './ProductItem.css';

interface ProductItemProps {
  product: Product;
  variant: 'active' | 'finished';
  isPinned?: boolean;
  onTogglePin?: (id: string) => void;
  onAction: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductItem({
  product,
  variant,
  isPinned = false,
  onTogglePin,
  onAction,
  onDelete,
}: ProductItemProps) {
  const isActive = variant === 'active';

  return (
    <div className="product-item product-item--compact">
      {isActive ? (
        <button
          type="button"
          className="product-item__add-to-list"
          aria-label="Закончился — добавить в список покупок"
          onClick={() => onAction(product.id)}
        >
          +
        </button>
      ) : (
        <label className="product-item__checkbox product-item__checkbox--restore product-item__checkbox--leading">
          <input
            type="checkbox"
            className="product-item__checkbox-input"
            aria-label="Куплено"
            onChange={() => onAction(product.id)}
          />
        </label>
      )}
      <div className="product-item__info">
        <p className="product-item__name">{product.name}</p>
      </div>
      {onTogglePin && (
        <button
          type="button"
          className={`product-item__pin ${isPinned ? 'product-item__pin--active' : ''}`}
          aria-label={isPinned ? 'Убрать из частых' : 'Закрепить в частых'}
          title={isPinned ? 'Убрать из частых' : 'Закрепить в частых'}
          onClick={() => onTogglePin(product.id)}
        >
          ★
        </button>
      )}
      <button
        type="button"
        className="product-item__delete"
        aria-label="Удалить"
        onClick={() => onDelete(product.id)}
      >
        ×
      </button>
    </div>
  );
}
