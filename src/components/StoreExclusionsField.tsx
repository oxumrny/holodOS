import type { Store } from '@/types/store';

import './StoreExclusionsField.css';

interface StoreExclusionsFieldProps {
  stores: Store[];
  excludedStoreIds: string[];
  onChange: (excludedStoreIds: string[]) => void;
  disabled?: boolean;
}

export function StoreExclusionsField({
  stores,
  excludedStoreIds,
  onChange,
  disabled = false,
}: StoreExclusionsFieldProps) {
  if (stores.length === 0) {
    return null;
  }

  const toggleStore = (storeId: string) => {
    if (disabled) {
      return;
    }

    if (excludedStoreIds.includes(storeId)) {
      onChange(excludedStoreIds.filter((id) => id !== storeId));
    } else {
      onChange([...excludedStoreIds, storeId]);
    }
  };

  return (
    <fieldset className="store-exclusions" disabled={disabled}>
      <legend className="store-exclusions__legend">Не покупаю в:</legend>
      <ul className="store-exclusions__list">
        {stores.map((store) => {
          const checked = excludedStoreIds.includes(store.id);

          return (
            <li key={store.id} className="store-exclusions__item">
              <label className="store-exclusions__label">
                <input
                  type="checkbox"
                  className="store-exclusions__checkbox"
                  checked={checked}
                  onChange={() => toggleStore(store.id)}
                />
                <span className="store-exclusions__name">{store.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
