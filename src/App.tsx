import { useEffect, useMemo, useRef, useState } from 'react';

import { ProductQueryBar } from '@/components/ProductQueryBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProductList } from '@/components/ProductList';
import { RecipeDetail } from '@/components/RecipeDetail';
import {
  RecipeForm,
  type RecipeFormHandle,
  type RecipeFormValues,
} from '@/components/RecipeForm';
import { RecipesView } from '@/components/RecipesView';
import { Settings } from '@/components/Settings';
import { useProducts } from '@/hooks/useProducts';
import { useProductExclusionsMap } from '@/hooks/useProductExclusionsMap';
import { useRecipes } from '@/hooks/useRecipes';
import { useStores } from '@/hooks/useStores';
import type { ClassifiedRecipe } from '@/lib/recipeStatus';
import { getPrimaryMealType } from '@/lib/recipeMealTime';
import {
  migrateFavoriteProductsFromLocalStorage,
} from '@/lib/frequentProducts';
import {
  clearSelectedStoreId,
  getSelectedStoreId,
  setSelectedStoreId as persistSelectedStoreId,
} from '@/lib/selectedStore';
import { supabaseConfigError } from '@/lib/supabase';

import type { Product } from '@/types/product';
import type { RecipeWithIngredients } from '@/types/recipe';

import './App.css';

type ProductTab = 'active' | 'finished';
type Tab = ProductTab | 'recipes';
type View = 'main' | 'settings';

type RecipeModalState =
  | { view: 'detail'; recipeId: string }
  | { view: 'create' }
  | { view: 'edit'; recipeId: string };

function buildCatalogProducts(
  activeProducts: Product[],
  finishedProducts: Product[],
): Product[] {
  const byId = new Map<string, Product>();

  for (const product of [...activeProducts, ...finishedProducts]) {
    byId.set(product.id, product);
  }

  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'ru'),
  );
}

function countDeletedIngredients(recipe: RecipeWithIngredients): number {
  return recipe.ingredients.filter(
    (ingredient) => ingredient.product_id === null,
  ).length;
}

function recipeToFormValues(recipe: RecipeWithIngredients): RecipeFormValues {
  return {
    title: recipe.title,
    mealType: recipe.meal_type,
    instructions: recipe.instructions,
    cookTimeMinutes: recipe.cook_time_minutes,
    productIds: recipe.ingredients
      .map((ingredient) => ingredient.product_id)
      .filter((productId): productId is string => productId !== null),
  };
}

const emptyRecipeFormValues: RecipeFormValues = {
  title: '',
  mealType: 'lunch',
  instructions: '',
  cookTimeMinutes: 0,
  productIds: [],
};

export default function App() {
  const [view, setView] = useState<View>('main');
  const [tab, setTab] = useState<Tab>('active');
  const [lastProductTab, setLastProductTab] = useState<ProductTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [exclusionsRefreshKey, setExclusionsRefreshKey] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    getSelectedStoreId(),
  );
  const [recipeModalState, setRecipeModalState] =
    useState<RecipeModalState | null>(null);
  const recipeFormRef = useRef<RecipeFormHandle>(null);

  const active = useProducts('active');
  const finished = useProducts('finished');
  const recipesState = useRecipes();
  const { stores } = useStores();
  const finishedProductIds = useMemo(
    () => finished.products.map((product) => product.id),
    [finished.products],
  );
  const { exclusionsMap } = useProductExclusionsMap(
    finishedProductIds,
    exclusionsRefreshKey,
  );

  const catalogProducts = useMemo(
    () => buildCatalogProducts(active.products, finished.products),
    [active.products, finished.products],
  );

  const activeProductIds = useMemo(
    () => new Set(active.products.map((product) => product.id)),
    [active.products],
  );

  const selectedRecipe = useMemo(() => {
    if (!recipeModalState || recipeModalState.view === 'create') {
      return null;
    }

    return (
      recipesState.recipes.find(
        (recipe) => recipe.id === recipeModalState.recipeId,
      ) ?? null
    );
  }, [recipeModalState, recipesState.recipes]);

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
    if (tab === 'recipes' && nextTab !== 'recipes') {
      void Promise.all([active.refresh(), finished.refresh()]);
    }

    if (nextTab === 'active' || nextTab === 'finished') {
      setLastProductTab(nextTab);
    }

    setTab(nextTab);

    if (nextTab === 'finished') {
      void finished.refresh();
    } else if (nextTab === 'active') {
      void active.refresh();
    } else if (nextTab === 'recipes') {
      void Promise.all([
        active.refresh(),
        finished.refresh(),
        recipesState.refresh(),
      ]);
    }
  };

  const handleGoToTab = (nextTab: ProductTab, query?: string) => {
    if (query !== undefined) {
      setSearchQuery(query);
    }
    handleTabChange(nextTab);
  };

  const handleProductTabToggle = () => {
    if (tab === 'recipes') {
      handleTabChange(lastProductTab);
      return;
    }

    handleTabChange(tab === 'active' ? 'finished' : 'active');
  };

  const productTabIcon: ProductTab =
    tab === 'recipes' ? lastProductTab : tab;

  const handleBackFromSettings = () => {
    setView('main');
    setExclusionsRefreshKey((key) => key + 1);
    void Promise.all([
      active.refresh(),
      finished.refresh(),
      recipesState.refresh(),
    ]);
  };

  const handleMarkAsFinished = async (id: string) => {
    const result = await active.markAsFinished(id);

    if (!result.error) {
      void Promise.all([finished.refresh(), recipesState.refresh()]);
    }

    return result;
  };

  const handleRestoreProduct = async (id: string) => {
    const result = await finished.restoreProduct(id);

    if (!result.error) {
      void Promise.all([active.refresh(), recipesState.refresh()]);
    }

    return result;
  };

  const handleOtherTabActionFromActive = async (id: string) => {
    const result = await finished.restoreProduct(id);

    if (!result.error) {
      await Promise.all([
        active.refresh(),
        finished.refresh(),
        recipesState.refresh(),
      ]);
    }

    return result;
  };

  const handleOtherTabActionFromFinished = async (id: string) => {
    const result = await active.markAsFinished(id);

    if (!result.error) {
      await Promise.all([
        active.refresh(),
        finished.refresh(),
        recipesState.refresh(),
      ]);
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

  const handleOpenCreateRecipe = () => {
    setRecipeModalState({ view: 'create' });
  };

  const handleOpenRecipeDetail = (recipe: ClassifiedRecipe) => {
    setRecipeModalState({ view: 'detail', recipeId: recipe.id });
  };

  const handleOpenEditRecipe = (recipeId: string) => {
    setRecipeModalState({ view: 'edit', recipeId });
  };

  const handleCloseRecipeModal = () => {
    setRecipeModalState(null);
  };

  const handleSaveRecipe = async (values: RecipeFormValues) => {
    if (recipeModalState?.view === 'create') {
      const result = await recipesState.createRecipe(
        values.title,
        values.mealType,
        values.instructions,
        values.cookTimeMinutes,
        values.productIds,
      );

      if (!result.error) {
        handleCloseRecipeModal();
      }

      return { error: result.error };
    }

    if (recipeModalState?.view === 'edit') {
      const result = await recipesState.updateRecipe(
        recipeModalState.recipeId,
        values.title,
        values.mealType,
        values.instructions,
        values.cookTimeMinutes,
        values.productIds,
      );

      if (!result.error) {
        handleCloseRecipeModal();
      }

      return { error: result.error };
    }

    return { error: null };
  };

  const handleDeleteRecipe = async () => {
    if (recipeModalState?.view !== 'edit') {
      return { error: null };
    }

    const result = await recipesState.deleteRecipe(recipeModalState.recipeId);

    if (!result.error) {
      handleCloseRecipeModal();
    }

    return { error: result.error };
  };

  const renderRecipeModal = () => {
    if (!recipeModalState) {
      return null;
    }

    if (
      (recipeModalState.view === 'detail' ||
        recipeModalState.view === 'edit') &&
      !selectedRecipe
    ) {
      return null;
    }

    const overlayCloseHandler = () => {
      if (recipeModalState.view === 'create' || recipeModalState.view === 'edit') {
        recipeFormRef.current?.requestClose();
        return;
      }

      handleCloseRecipeModal();
    };

    const dialogLabelledBy =
      recipeModalState.view === 'create'
        ? 'recipe-form-create-title'
        : recipeModalState.view === 'edit'
          ? 'recipe-form-edit-title'
          : 'recipe-detail-title';

    return (
      <div className="recipe-form-overlay" onClick={overlayCloseHandler}>
        <div
          className="recipe-form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogLabelledBy}
          onClick={(event) => event.stopPropagation()}
        >
          {recipeModalState.view === 'detail' && selectedRecipe ? (
            <RecipeDetail
              recipe={selectedRecipe}
              activeProducts={active.products}
              finishedProducts={finished.products}
              onEdit={() => handleOpenEditRecipe(selectedRecipe.id)}
              onClose={handleCloseRecipeModal}
            />
          ) : (
            <RecipeForm
              key={
                recipeModalState.view === 'create'
                  ? 'create'
                  : `edit-${recipeModalState.recipeId}`
              }
              ref={recipeFormRef}
              mode={recipeModalState.view === 'create' ? 'create' : 'edit'}
              products={catalogProducts}
              activeProductIds={activeProductIds}
              initialValues={
                recipeModalState.view === 'edit' && selectedRecipe
                  ? recipeToFormValues(selectedRecipe)
                  : {
                      ...emptyRecipeFormValues,
                      mealType: getPrimaryMealType(),
                    }
              }
              initialDeletedIngredientCount={
                recipeModalState.view === 'edit' && selectedRecipe
                  ? countDeletedIngredients(selectedRecipe)
                  : 0
              }
              onSave={handleSaveRecipe}
              onDelete={
                recipeModalState.view === 'edit'
                  ? handleDeleteRecipe
                  : undefined
              }
              onClose={handleCloseRecipeModal}
            />
          )}
        </div>
      </div>
    );
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
                className={`app__icon-button${
                  tab !== 'recipes' ? ' app__icon-button--active' : ''
                }`}
                onClick={handleProductTabToggle}
                aria-label={
                  productTabIcon === 'active'
                    ? 'В холодосе'
                    : 'Список покупок'
                }
                title={
                  productTabIcon === 'active'
                    ? 'В холодосе'
                    : 'Список покупок'
                }
              >
                <span aria-hidden>
                  {productTabIcon === 'active' ? '🧊' : '📋'}
                </span>
              </button>
              <button
                type="button"
                className={`app__icon-button${
                  tab === 'recipes' ? ' app__icon-button--active' : ''
                }`}
                onClick={() => handleTabChange('recipes')}
                aria-label="Рецепты"
                title="Рецепты"
              >
                <span aria-hidden>🍳</span>
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
        {tab !== 'recipes' && (
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
        )}
        {tab === 'recipes' ? (
          <RecipesView
            recipes={recipesState.recipes}
            loading={recipesState.loading}
            error={recipesState.error}
            activeProducts={active.products}
            finishedProducts={finished.products}
            onRefresh={recipesState.refresh}
            onAddRecipe={handleOpenCreateRecipe}
            onRecipeClick={handleOpenRecipeDetail}
          />
        ) : tab === 'active' ? (
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
          />
        )}
      </main>
        </>
      )}

      {renderRecipeModal()}
    </div>
  );
}
