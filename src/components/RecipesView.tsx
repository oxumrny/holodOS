import { useMemo, useState } from 'react';

import { ErrorBanner } from '@/components/ErrorBanner';
import {
  buildRecipeStatusContext,
  classifyRecipes,
  isBrokenIngredient,
  type ClassifiedRecipe,
} from '@/lib/recipeStatus';
import {
  getMealTypeLabel,
  getMealTypeOrder,
  getPrimaryMealHint,
  getPrimaryMealType,
} from '@/lib/recipeMealTime';
import { normalizeSearchQuery } from '@/lib/productSearch';
import type { Product } from '@/types/product';
import type { MealType, RecipeWithIngredients } from '@/types/recipe';

import './RecipesView.css';

interface RecipesViewProps {
  recipes: RecipeWithIngredients[];
  loading: boolean;
  error: string | null;
  activeProducts: Product[];
  finishedProducts: Product[];
  onRefresh: () => void;
  onAddRecipe: () => void;
  onRecipeClick: (recipe: ClassifiedRecipe) => void;
}

function formatCookTime(minutes: number): string | null {
  if (minutes <= 0) {
    return null;
  }

  return `${minutes} мин`;
}

function recipeMatchesSearch(
  recipe: ClassifiedRecipe,
  normalizedSearch: string,
): boolean {
  if (!normalizedSearch) {
    return true;
  }

  return recipe.title.toLocaleLowerCase('ru').includes(normalizedSearch);
}

function getDeletedIngredientCount(
  recipe: ClassifiedRecipe,
  productsById: Map<string, Product>,
): number {
  return recipe.ingredients.filter((ingredient) =>
    isBrokenIngredient(ingredient, productsById),
  ).length;
}

interface RecipeRowProps {
  recipe: ClassifiedRecipe;
  variant: 'ready' | 'missing' | 'broken';
  productsById: Map<string, Product>;
  onClick: () => void;
}

function RecipeRow({
  recipe,
  variant,
  productsById,
  onClick,
}: RecipeRowProps) {
  const cookTime = formatCookTime(recipe.cook_time_minutes);
  const missingNames = recipe.missingIngredients
    .map((entry) => entry.product.name)
    .join(', ');
  const deletedCount = getDeletedIngredientCount(recipe, productsById);

  return (
    <li className="recipes-view__item">
      <button
        type="button"
        className="recipes-view__row"
        onClick={onClick}
      >
        <div className="recipes-view__row-main">
          <span className="recipes-view__row-title">{recipe.title}</span>
          {cookTime && (
            <span className="recipes-view__row-time">{cookTime}</span>
          )}
        </div>

        {variant === 'missing' && missingNames && (
          <p className="recipes-view__row-meta">
            нет: {missingNames}
          </p>
        )}

        {variant === 'broken' && (
          <p className="recipes-view__row-meta recipes-view__row-meta--broken">
            {deletedCount === 1
              ? 'удалён ингредиент'
              : `удалены ингредиенты (${deletedCount})`}
          </p>
        )}
      </button>
    </li>
  );
}

interface RecipeSectionProps {
  title: string;
  recipes: ClassifiedRecipe[];
  variant: 'ready' | 'missing' | 'broken';
  productsById: Map<string, Product>;
  onRecipeClick: (recipe: ClassifiedRecipe) => void;
}

function RecipeSection({
  title,
  recipes,
  variant,
  productsById,
  onRecipeClick,
}: RecipeSectionProps) {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <section className="recipes-view__section">
      <div className="recipes-view__section-header">
        <h3 className="recipes-view__section-title">{title}</h3>
        {variant === 'broken' && (
          <span className="recipes-view__badge">Нужно поправить</span>
        )}
      </div>
      <ul className="recipes-view__list">
        {recipes.map((recipe) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            variant={variant}
            productsById={productsById}
            onClick={() => onRecipeClick(recipe)}
          />
        ))}
      </ul>
    </section>
  );
}

function filterRecipesByMealType(
  recipes: ClassifiedRecipe[],
  mealType: MealType,
): ClassifiedRecipe[] {
  return recipes.filter((recipe) => recipe.meal_type === mealType);
}

interface MealTypeBlockProps {
  mealType: MealType;
  isPrimary: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  readyRecipes: ClassifiedRecipe[];
  missingRecipes: ClassifiedRecipe[];
  brokenRecipes: ClassifiedRecipe[];
  productsById: Map<string, Product>;
  onRecipeClick: (recipe: ClassifiedRecipe) => void;
}

function MealTypeBlock({
  mealType,
  isPrimary,
  collapsed,
  onToggleCollapse,
  readyRecipes,
  missingRecipes,
  brokenRecipes,
  productsById,
  onRecipeClick,
}: MealTypeBlockProps) {
  const mealHint = isPrimary ? getPrimaryMealHint(mealType) : null;
  const hasRecipes =
    readyRecipes.length > 0 ||
    missingRecipes.length > 0 ||
    brokenRecipes.length > 0;
  const isExpanded = isPrimary || !collapsed;

  return (
    <section className="recipes-view__meal-block">
      <div className="recipes-view__meal-header">
        {isPrimary ? (
          <h3 className="recipes-view__meal-title">
            {getMealTypeLabel(mealType)}
          </h3>
        ) : (
          <button
            type="button"
            className="recipes-view__meal-toggle"
            onClick={onToggleCollapse}
            aria-expanded={isExpanded}
          >
            <span className="recipes-view__meal-toggle-label">
              {getMealTypeLabel(mealType)}
            </span>
            <span className="recipes-view__meal-toggle-icon" aria-hidden>
              {collapsed ? '▸' : '▾'}
            </span>
          </button>
        )}
      </div>

      {mealHint && (
        <p className="recipes-view__meal-hint">{mealHint}</p>
      )}

      {isExpanded && (
        <div className="recipes-view__meal-sections">
          {hasRecipes ? (
            <>
              <RecipeSection
                title="Можно сейчас"
                recipes={readyRecipes}
                variant="ready"
                productsById={productsById}
                onRecipeClick={onRecipeClick}
              />
              <RecipeSection
                title="Не хватает"
                recipes={missingRecipes}
                variant="missing"
                productsById={productsById}
                onRecipeClick={onRecipeClick}
              />
              <RecipeSection
                title="Нужно поправить"
                recipes={brokenRecipes}
                variant="broken"
                productsById={productsById}
                onRecipeClick={onRecipeClick}
              />
            </>
          ) : (
            <p className="recipes-view__meal-empty">Пока нет рецептов</p>
          )}
        </div>
      )}
    </section>
  );
}

export function RecipesView({
  recipes,
  loading,
  error,
  activeProducts,
  finishedProducts,
  onRefresh,
  onAddRecipe,
  onRecipeClick,
}: RecipesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSecondaryMeal, setCollapsedSecondaryMeal] = useState(true);

  const mealTypeOrder = getMealTypeOrder();
  const primaryMealType = getPrimaryMealType();
  const secondaryMealType =
    mealTypeOrder[0] === primaryMealType
      ? mealTypeOrder[1]
      : mealTypeOrder[0];

  const statusContext = useMemo(
    () => buildRecipeStatusContext(activeProducts, finishedProducts),
    [activeProducts, finishedProducts],
  );

  const classifiedRecipes = useMemo(
    () => classifyRecipes(recipes, statusContext),
    [recipes, statusContext],
  );

  const normalizedSearch = useMemo(
    () => normalizeSearchQuery(searchQuery),
    [searchQuery],
  );

  const filteredRecipes = useMemo(
    () =>
      classifiedRecipes.filter((recipe) =>
        recipeMatchesSearch(recipe, normalizedSearch),
      ),
    [classifiedRecipes, normalizedSearch],
  );

  const readyRecipes = useMemo(
    () => filteredRecipes.filter((recipe) => recipe.status === 'ready'),
    [filteredRecipes],
  );

  const missingRecipes = useMemo(
    () =>
      filteredRecipes
        .filter((recipe) => recipe.status === 'missing')
        .sort((a, b) => a.missingCount - b.missingCount),
    [filteredRecipes],
  );

  const brokenRecipes = useMemo(
    () => filteredRecipes.filter((recipe) => recipe.status === 'broken'),
    [filteredRecipes],
  );

  const hasVisibleRecipes = filteredRecipes.length > 0;

  if (loading) {
    return (
      <div className="recipes-view">
        <div className="recipes-view__centered">
          <div className="recipes-view__spinner" aria-hidden />
          <p className="recipes-view__status-text">Загрузка рецептов…</p>
        </div>
      </div>
    );
  }

  if (error && recipes.length === 0) {
    return (
      <div className="recipes-view">
        <div className="recipes-view__centered">
          <ErrorBanner message={`Не удалось загрузить рецепты: ${error}`} />
          <button
            type="button"
            className="recipes-view__retry"
            onClick={onRefresh}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recipes-view">
      <div className="recipes-view__header">
        <h2 className="recipes-view__title">Рецепты</h2>
        <button
          type="button"
          className="recipes-view__add-button"
          onClick={onAddRecipe}
        >
          + Рецепт
        </button>
      </div>

      {error && recipes.length > 0 && (
        <ErrorBanner message={`Не удалось обновить рецепты: ${error}`} />
      )}

      {recipes.length > 0 && (
        <div className="recipes-view__search">
          <input
            type="search"
            className="recipes-view__search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по названию…"
            aria-label="Поиск рецептов по названию"
          />
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="recipes-view__centered">
          <p className="recipes-view__empty-icon" aria-hidden>
            🍳
          </p>
          <p className="recipes-view__empty-title">Пока нет рецептов</p>
          <button
            type="button"
            className="recipes-view__empty-action"
            onClick={onAddRecipe}
          >
            + Рецепт
          </button>
        </div>
      ) : !hasVisibleRecipes ? (
        <div className="recipes-view__centered recipes-view__centered--compact">
          <p className="recipes-view__empty-subtitle">
            {normalizedSearch
              ? `Ничего не найдено по запросу «${searchQuery.trim()}»`
              : 'Нет рецептов для отображения'}
          </p>
        </div>
      ) : (
        <div className="recipes-view__sections">
          <MealTypeBlock
            mealType={primaryMealType}
            isPrimary
            collapsed={false}
            onToggleCollapse={() => undefined}
            readyRecipes={filterRecipesByMealType(readyRecipes, primaryMealType)}
            missingRecipes={filterRecipesByMealType(
              missingRecipes,
              primaryMealType,
            )}
            brokenRecipes={filterRecipesByMealType(
              brokenRecipes,
              primaryMealType,
            )}
            productsById={statusContext.productsById}
            onRecipeClick={onRecipeClick}
          />
          <MealTypeBlock
            mealType={secondaryMealType}
            isPrimary={false}
            collapsed={collapsedSecondaryMeal}
            onToggleCollapse={() =>
              setCollapsedSecondaryMeal((current) => !current)
            }
            readyRecipes={filterRecipesByMealType(
              readyRecipes,
              secondaryMealType,
            )}
            missingRecipes={filterRecipesByMealType(
              missingRecipes,
              secondaryMealType,
            )}
            brokenRecipes={filterRecipesByMealType(
              brokenRecipes,
              secondaryMealType,
            )}
            productsById={statusContext.productsById}
            onRecipeClick={onRecipeClick}
          />
        </div>
      )}
    </div>
  );
}
