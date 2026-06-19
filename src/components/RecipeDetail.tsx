import {
  buildRecipeStatusContext,
  classifyRecipe,
  formatMissingLabels,
  getGroupStatuses,
  getRequiredStatuses,
  type IngredientAvailabilityStatus,
  type IngredientStatusEntry,
} from '@/lib/recipeStatus';
import { getMealTypeSingularLabel } from '@/lib/recipeMealTime';
import type { Product } from '@/types/product';
import type { RecipeFull } from '@/types/recipe';

import './RecipeDetail.css';

interface RecipeDetailProps {
  recipe: RecipeFull;
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

function sortIngredientStatuses(
  entries: IngredientStatusEntry[],
): IngredientStatusEntry[] {
  return [...entries].sort((left, right) => {
    if (left.status === 'finished' && right.status !== 'finished') {
      return -1;
    }

    if (right.status === 'finished' && left.status !== 'finished') {
      return 1;
    }

    return 0;
  });
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
  const requiredStatuses = getRequiredStatuses(recipe, statusContext).sort(
    (left, right) => {
      if (left.status === 'finished' && right.status !== 'finished') {
        return -1;
      }

      if (right.status === 'finished' && left.status !== 'finished') {
        return 1;
      }

      return 0;
    },
  );
  const groupStatuses = getGroupStatuses(recipe, statusContext);
  const cookTime = formatCookTime(recipe.cook_time_minutes);
  const hasRequired = requiredStatuses.length > 0;
  const hasGroups = groupStatuses.length > 0;

  return (
    <div className="recipe-detail">
      <div className="recipe-detail__header">
        <div className="recipe-detail__title-block">
          <h2 className="recipe-detail__title" id="recipe-detail-title">
            {recipe.title}
          </h2>
          <p className="recipe-detail__meal-type">
            {getMealTypeSingularLabel(recipe.meal_type)}
          </p>
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

      {classifiedRecipe.status === 'ready' &&
        classifiedRecipe.readyCombinationLabel && (
          <div
            className="recipe-detail__alert recipe-detail__alert--ready"
            role="status"
          >
            Можно сейчас: {classifiedRecipe.readyCombinationLabel}
          </div>
        )}

      {classifiedRecipe.status === 'broken' && (
        <div className="recipe-detail__alert" role="status">
          Нужно поправить: замените удалённые ингредиенты
        </div>
      )}

      {classifiedRecipe.status === 'missing' && (
        <div className="recipe-detail__alert recipe-detail__alert--missing" role="status">
          Не хватает:{' '}
          {formatMissingLabels(
            classifiedRecipe.missingIngredients,
            classifiedRecipe.missingGroups,
          )}
        </div>
      )}

      <section className="recipe-detail__section">
        <h3 className="recipe-detail__section-title">Ингредиенты</h3>

        {hasRequired && (
          <div className="recipe-detail__ingredient-block">
            <h4 className="recipe-detail__ingredient-block-title">Обязательно</h4>
            <ul className="recipe-detail__ingredients">
              {requiredStatuses.map((entry, index) => (
                <li
                  key={`${recipe.id}-required-${entry.product_id ?? 'deleted'}-${index}`}
                  className={`recipe-detail__ingredient recipe-detail__ingredient--${entry.status}`}
                >
                  <span className="recipe-detail__ingredient-icon" aria-hidden>
                    {ingredientStatusIcon(entry.status)}
                  </span>
                  <span className="recipe-detail__ingredient-name">
                    {ingredientStatusLabel(
                      entry.status,
                      entry.product?.name ?? null,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {groupStatuses.map((groupEntry) => (
          <div
            key={groupEntry.group.id}
            className="recipe-detail__ingredient-block"
          >
            <h4 className="recipe-detail__ingredient-block-title">
              {groupEntry.group.label} (одно из)
            </h4>
            <ul className="recipe-detail__ingredients">
              {sortIngredientStatuses(groupEntry.options).map((entry, index) => (
                <li
                  key={`${recipe.id}-group-${groupEntry.group.id}-${entry.product?.id ?? 'deleted'}-${index}`}
                  className={`recipe-detail__ingredient recipe-detail__ingredient--${entry.status}`}
                >
                  <span className="recipe-detail__ingredient-icon" aria-hidden>
                    {ingredientStatusIcon(entry.status)}
                  </span>
                  <span className="recipe-detail__ingredient-name">
                    {ingredientStatusLabel(
                      entry.status,
                      entry.product?.name ?? null,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!hasRequired && !hasGroups && (
          <p className="recipe-detail__empty-ingredients">Нет ингредиентов</p>
        )}
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
