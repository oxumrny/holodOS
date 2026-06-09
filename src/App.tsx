import { useState } from 'react';

import { AddProductForm } from '@/components/AddProductForm';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProductList } from '@/components/ProductList';
import { Settings } from '@/components/Settings';
import { useProducts } from '@/hooks/useProducts';
import { supabaseConfigError } from '@/lib/supabase';

import './App.css';

type Tab = 'active' | 'finished';
type View = 'main' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [tab, setTab] = useState<Tab>('active');

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

  const handleBackFromSettings = () => {
    setView('main');
    void Promise.all([active.refresh(), finished.refresh()]);
  };

  const handleDelete = async (id: string) => {
    const result = await active.deleteProduct(id);

    if (!result.error) {
      await Promise.all([active.refresh(), finished.refresh()]);
    }

    return result;
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <h1 className="app__title">holodOS</h1>
          {view === 'main' && (
            <button
              type="button"
              className="app__settings"
              onClick={() => setView('settings')}
            >
              Настройки
            </button>
          )}
        </div>
        <p className="app__subtitle">Трекер продуктов в холодильнике</p>
      </header>

      {supabaseConfigError && <ErrorBanner message={supabaseConfigError} />}

      {view === 'settings' ? (
        <Settings onBack={handleBackFromSettings} />
      ) : (
        <>
      <nav className="tabs" aria-label="Разделы">
        <button
          type="button"
          className={`tabs__button ${tab === 'active' ? 'tabs__button--active' : ''}`}
          onClick={() => handleTabChange('active')}
        >
          <span className="tabs__icon">🧊</span>
          В холодосе
        </button>
        <button
          type="button"
          className={`tabs__button ${tab === 'finished' ? 'tabs__button--active' : ''}`}
          onClick={() => handleTabChange('finished')}
        >
          <span className="tabs__icon">📋</span>
          Список покупок
        </button>
      </nav>

      <main className="app__main">
        {tab === 'active' ? (
          <>
            <AddProductForm onAdd={active.addProduct} />
            <ProductList
              products={active.products}
              loading={active.loading}
              error={active.error}
              variant="active"
              emptyTitle="Холодильник пуст"
              emptySubtitle="Добавьте первый продукт — молоко, овощи, что угодно"
              onRefresh={active.refresh}
              onAction={active.markAsFinished}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <ProductList
            products={finished.products}
            loading={finished.loading}
            error={finished.error}
            variant="finished"
            emptyTitle="Пока ничего не закончилось"
            emptySubtitle="Когда продукт кончится, отметьте его на вкладке «В холодосе»"
            onRefresh={finished.refresh}
            onAction={finished.restoreProduct}
            onDelete={handleDelete}
          />
        )}
      </main>
        </>
      )}
    </div>
  );
}
