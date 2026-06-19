import type { Product } from '@/types/product';

import { MusthaveBadge } from './MusthaveBadge';
import './ProductItem.css';

interface ProductItemProps {
  product: Product;
  variant: 'active' | 'finished';
  showMusthaveBadge?: boolean;
  onAction: (id: string) => void;
}

export function ProductItem({
  product,
  variant,
  showMusthaveBadge = false,
  onAction,
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
      {showMusthaveBadge && <MusthaveBadge active />}
    </div>
  );
}
