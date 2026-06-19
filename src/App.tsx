import { useEffect, useMemo, useState } from 'react';

import { ProductQueryBar } from '@/components/ProductQueryBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProductList } from '@/components/ProductList';
import { Settings } from '@/components/Settings';
import { useProducts } from '@/hooks/useProducts';
import { useProductExclusionsMap } from '@/hooks/useProductExclusionsMap';
import { useStores } from '@/hooks/useStores';
import {
  migrateFavoriteProductsFromLocalStorage,
} from '@/lib/frequentProducts';
import {
  clearSelectedStoreId,
  getSelectedStoreId,
  setSelectedStoreId as persistSelectedStoreId,
} from '@/lib/selectedStore';
import { supabaseConfigError } from '@/lib/supabase';

import './App.css';

type Tab = 'active' | 'finished';
type View = 'main' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [tab, setTab] = useState<Tab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [exclusionsRefreshKey, setExclusionsRefreshKey] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    getSelectedStoreId(),
  );

  const active = useProducts('active');
  const finished = useProducts('finished');
  const { stores } = useStores();
  const finishedProductIds = useMemo(
    () => finished.products.map((product) => product.id),
    [finished.products],
  );
  const { exclusionsMap } = useProductExclusionsMap(
    finishedProductIds,
    exclusionsRefreshKey,
  );

  useEffect(() => {
    void migrateFavoriteProductsFromLocalStorage().then(() => {
      void Promise.all([active.refresh(), finished.refresh()]);
    });
    // Однократная миграция при старте приложения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      selectedStoreId &&
      !stores.some((store) => store.id === selectedStoreId)
    ) {
      setSelectedStoreId(null);
      clearSelectedStoreId();
    }
  }, [stores, selectedStoreId]);

  const handleSelectedStoreChange = (storeId: string | null) => {
    setSelectedStoreId(storeId);

    if (storeId) {
      persistSelectedStoreId(storeId);
    } else {
      clearSelectedStoreId();
    }
  };

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === 'finished') {
      void finished.refresh();
    } else {
      void active.refresh();
    }
  };

  const handleGoToTab = (nextTab: Tab, query?: string) => {
    if (query !== undefined) {
      setSearchQuery(query);
    }
    handleTabChange(nextTab);
  };

  const handleBackFromSettings = () => {
    setView('main');
    setExclusionsRefreshKey((key) => key + 1);
    void Promise.all([active.refresh(), finished.refresh()]);
  };

  const handleDelete = async (id: string) => {
    const result = await active.deleteProduct(id);

    if (!result.error) {
      await Promise.all([active.refresh(), finished.refresh()]);
    }

    return result;
  };

  const handleMarkAsFinished = async (id: string) => active.markAsFinished(id);

  const handleRestoreProduct = async (id: string) => finished.restoreProduct(id);

  const handleOtherTabActionFromActive = async (id: string) => {
    const result = await finished.restoreProduct(id);

    if (!result.error) {
      await Promise.all([active.refresh(), finished.refresh()]);
    }

    return result;
  };

  const handleOtherTabActionFromFinished = async (id: string) => {
    const result = await active.markAsFinished(id);

    if (!result.error) {
      await Promise.all([active.refresh(), finished.refresh()]);
    }

    return result;
  };

  const handleAddProduct = async (
    name: string,
    excludedStoreIds: string[] = [],
  ) => {
    const targetStatus = tab === 'active' ? 'active' : 'finished';
    const adder = tab === 'active' ? active : finished;
    const result = await adder.addProduct(name, targetStatus, excludedStoreIds);

    if (!result.error && tab === 'finished') {
      await Promise.all([finished.refresh(), active.refresh()]);
    }

    return result;
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div className="app__header-brand">
            <h1 className="app__title">holodOS</h1>
            <p className="app__subtitle">Трекер продуктов в холодильнике</p>
          </div>
          {view === 'main' && (
            <div className="app__header-actions">
              <button
                type="button"
                className="app__icon-button"
                onClick={() =>
                  handleTabChange(tab === 'active' ? 'finished' : 'active')
                }
                aria-label={
                  tab === 'active'
                    ? 'Список покупок'
                    : 'В холодосе'
                }
                title={
                  tab === 'active'
                    ? 'Список покупок'
                    : 'В холодосе'
                }
              >
                <span aria-hidden>{tab === 'active' ? '🧊' : '📋'}</span>
              </button>
              <button
                type="button"
                className="app__icon-button"
                onClick={() => setView('settings')}
                aria-label="Настройки"
                title="Настройки"
              >
                <span aria-hidden>⚙️</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {supabaseConfigError && <ErrorBanner message={supabaseConfigError} />}

      {view === 'settings' ? (
        <Settings onBack={handleBackFromSettings} />
      ) : (
        <>
      <main className="app__main">
        <ProductQueryBar
          query={searchQuery}
          tab={tab}
          placeholder={
            tab === 'active'
              ? 'Найти или добавить в холодос..'
              : 'Найти или добавить в покупки..'
          }
          stores={stores}
          selectedStoreId={tab === 'finished' ? selectedStoreId : null}
          onQueryChange={setSearchQuery}
          onAdd={handleAddProduct}
          onGoToTab={(nextTab, query) => handleGoToTab(nextTab, query)}
        />
        {tab === 'active' ? (
            <ProductList
              products={active.products}
              otherTabProducts={finished.products}
              loading={active.loading}
              error={active.error}
              variant="active"
              emptyTitle="Холодильник пуст"
              emptySubtitle="Добавьте первый продукт — молоко, яйца, что угодно"
              searchQuery={searchQuery}
              onRefresh={active.refresh}
              onAction={handleMarkAsFinished}
              onOtherTabAction={handleOtherTabActionFromActive}
              onDelete={handleDelete}
            />
        ) : (
          <ProductList
            products={finished.products}
            otherTabProducts={active.products}
            loading={finished.loading}
            error={finished.error}
            variant="finished"
            emptyTitle="Пока ничего не закончилось"
            emptySubtitle="Добавьте продукт через поле выше или отметьте «кончилось» на вкладке холодос"
            searchQuery={searchQuery}
            stores={stores}
            exclusionsMap={exclusionsMap}
            selectedStoreId={selectedStoreId}
            onSelectedStoreChange={handleSelectedStoreChange}
            onRefresh={finished.refresh}
            onAction={handleRestoreProduct}
            onOtherTabAction={handleOtherTabActionFromFinished}
            onDelete={handleDelete}
          />
        )}
      </main>
        </>
      )}
    </div>
  );
}
