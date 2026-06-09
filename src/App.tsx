import { useState } from 'react';

import { ProductQueryBar } from '@/components/ProductQueryBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProductList } from '@/components/ProductList';
import { Settings } from '@/components/Settings';
import { useProducts } from '@/hooks/useProducts';
import {
  removeProductTracking,
} from '@/lib/frequentProducts';
import { supabaseConfigError } from '@/lib/supabase';

import './App.css';

type Tab = 'active' | 'finished';
type View = 'main' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [tab, setTab] = useState<Tab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [musthaveRevision, setMusthaveRevision] = useState(0);

  const active = useProducts('active');
  const finished = useProducts('finished');

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
    setMusthaveRevision((revision) => revision + 1);
    void Promise.all([active.refresh(), finished.refresh()]);
  };

  const handleDelete = async (id: string) => {
    const result = await active.deleteProduct(id);

    if (!result.error) {
      removeProductTracking(id);
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
        {tab === 'active' ? (
          <ProductQueryBar
            mode="search-and-add"
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onAdd={active.addProduct}
            onGoToTab={(nextTab, query) => handleGoToTab(nextTab, query)}
          />
        ) : (
          <ProductQueryBar
            mode="search-only"
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        )}
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
              musthaveRevision={musthaveRevision}
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
            emptySubtitle="Когда продукт кончится, отметьте его на вкладке «В холодосе»"
              searchQuery={searchQuery}
              musthaveRevision={musthaveRevision}
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
