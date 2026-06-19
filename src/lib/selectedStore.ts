const SELECTED_STORE_KEY = 'holodos-selected-store-id';

export function getSelectedStoreId(): string | null {
  try {
    const value = localStorage.getItem(SELECTED_STORE_KEY);
    return value || null;
  } catch {
    return null;
  }
}

export function setSelectedStoreId(storeId: string): void {
  try {
    localStorage.setItem(SELECTED_STORE_KEY, storeId);
  } catch {
    // localStorage недоступен — выбор не сохранится между сессиями.
  }
}

export function clearSelectedStoreId(): void {
  try {
    localStorage.removeItem(SELECTED_STORE_KEY);
  } catch {
    // ignore
  }
}
