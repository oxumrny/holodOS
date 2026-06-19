import type { Product } from '@/types/product';

export type MealType = 'breakfast' | 'lunch';

export interface Recipe {
  id: string;
  title: string;
  meal_type: MealType;
  instructions: string;
  cook_time_minutes: number;
  sort_order: number;
  created_at: string;
}

export interface RecipeRequiredIngredient {
  recipe_id: string;
  product_id: string | null;
  product?: Product | null;
}

export interface RecipeGroupOption {
  group_id: string;
  product_id: string | null;
  product?: Product | null;
}

export interface RecipeIngredientGroup {
  id: string;
  recipe_id: string;
  label: string;
  sort_order: number;
  options: RecipeGroupOption[];
}

export interface RecipeFull extends Recipe {
  required: RecipeRequiredIngredient[];
  groups: RecipeIngredientGroup[];
}

export interface RecipeGroupInput {
  label: string;
  productIds: string[];
}

export interface RecipeIngredientsInput {
  requiredProductIds: string[];
  groups: RecipeGroupInput[];
}

export function countDeletedIngredientSlots(recipe: RecipeFull): number {
  let count = recipe.required.filter((item) => item.product_id === null).length;

  for (const group of recipe.groups) {
    count += group.options.filter((option) => option.product_id === null).length;
  }

  return count;
}

export function requiredProductIds(recipe: RecipeFull): string[] {
  return recipe.required
    .map((item) => item.product_id)
    .filter((productId): productId is string => productId !== null);
}

export function recipeToIngredientsInput(recipe: RecipeFull): RecipeIngredientsInput {
  return {
    requiredProductIds: requiredProductIds(recipe),
    groups: recipe.groups.map((group) => ({
      label: group.label,
      productIds: group.options
        .map((option) => option.product_id)
        .filter((productId): productId is string => productId !== null),
    })),
  };
}
