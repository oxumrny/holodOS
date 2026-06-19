import {
  buildRecipeStatusContext,
  classifyRecipe,
  getIngredientStatuses,
  type IngredientAvailabilityStatus,
} from '@/lib/recipeStatus';
import type { Product } from '@/types/product';
import type { RecipeWithIngredients } from '@/types/recipe';

import './RecipeDetail.css';

interface RecipeDetailProps {
  recipe: RecipeWithIngredients;
  activeProducts: Product[];
  finishedProducts: Product[];
  onEdit: () => void;
  onClose: () => void;
}

function formatCookTime(minutes: number): string | null {
  if (minutes <= 0) {
    return null;
  }

  return `${minutes} мин`;
}

function ingredientStatusIcon(
  status: IngredientAvailabilityStatus,
): string {
  switch (status) {
    case 'active':
      return '✅';
    case 'finished':
      return '❌';
    case 'deleted':
      return '⚠️';
  }
}

function ingredientStatusLabel(
  status: IngredientAvailabilityStatus,
  productName: string | null,
): string {
  if (status === 'deleted') {
    return 'удалённый ингредиент';
  }

  return productName ?? 'неизвестный продукт';
}

export function RecipeDetail({
  recipe,
  activeProducts,
  finishedProducts,
  onEdit,
  onClose,
}: RecipeDetailProps) {
  const statusContext = buildRecipeStatusContext(
    activeProducts,
    finishedProducts,
  );
  const classifiedRecipe = classifyRecipe(recipe, statusContext);
  const ingredientStatuses = getIngredientStatuses(recipe, statusContext);
  const cookTime = formatCookTime(recipe.cook_time_minutes);

  return (
    <div className="recipe-detail">
      <div className="recipe-detail__header">
        <div className="recipe-detail__title-block">
          <h2 className="recipe-detail__title" id="recipe-detail-title">
            {recipe.title}
          </h2>
          {cookTime && (
            <p className="recipe-detail__time">{cookTime}</p>
          )}
        </div>
        <button
          type="button"
          className="recipe-detail__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      {classifiedRecipe.status === 'broken' && (
        <div className="recipe-detail__alert" role="status">
          Нужно поправить: замените удалённые ингредиенты
        </div>
      )}

      <section className="recipe-detail__section">
        <h3 className="recipe-detail__section-title">Ингредиенты</h3>
        <ul className="recipe-detail__ingredients">
          {ingredientStatuses.map((entry, index) => (
            <li
              key={`${recipe.id}-${entry.product?.id ?? 'deleted'}-${index}`}
              className={`recipe-detail__ingredient recipe-detail__ingredient--${entry.status}`}
            >
              <span className="recipe-detail__ingredient-icon" aria-hidden>
                {ingredientStatusIcon(entry.status)}
              </span>
              <span className="recipe-detail__ingredient-name">
                {ingredientStatusLabel(entry.status, entry.product?.name ?? null)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.instructions.trim() && (
        <section className="recipe-detail__section">
          <h3 className="recipe-detail__section-title">Инструкция</h3>
          <p className="recipe-detail__instructions">{recipe.instructions}</p>
        </section>
      )}

      <div className="recipe-detail__actions">
        <button
          type="button"
          className="recipe-detail__edit"
          onClick={onEdit}
        >
          Редактировать
        </button>
      </div>
    </div>
  );
}
