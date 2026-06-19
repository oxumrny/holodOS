import type { Product } from '@/types/product';
import type { RecipeIngredient, RecipeWithIngredients } from '@/types/recipe';

export type RecipeStatus = 'ready' | 'missing' | 'broken';

export type IngredientAvailabilityStatus = 'active' | 'finished' | 'deleted';

export interface RecipeStatusContext {
  activeProductIds: Set<string>;
  productsById: Map<string, Product>;
}

export interface IngredientStatusEntry {
  product: Product | null;
  status: IngredientAvailabilityStatus;
}

export interface MissingIngredientEntry {
  product: Product;
  status: 'finished';
}

export function buildRecipeStatusContext(
  activeProducts: Product[],
  finishedProducts: Product[],
): RecipeStatusContext {
  const productsById = new Map<string, Product>();

  for (const product of [...activeProducts, ...finishedProducts]) {
    productsById.set(product.id, product);
  }

  return {
    activeProductIds: new Set(activeProducts.map((product) => product.id)),
    productsById,
  };
}

export function resolveIngredientProduct(
  ingredient: RecipeIngredient,
  productsById: Map<string, Product>,
): Product | null {
  if (ingredient.product_id === null) {
    return null;
  }

  return ingredient.product ?? productsById.get(ingredient.product_id) ?? null;
}

export function isBrokenIngredient(
  ingredient: RecipeIngredient,
  productsById: Map<string, Product>,
): boolean {
  if (ingredient.product_id === null) {
    return true;
  }

  return resolveIngredientProduct(ingredient, productsById) === null;
}

export function getIngredientAvailabilityStatus(
  ingredient: RecipeIngredient,
  context: RecipeStatusContext,
): IngredientAvailabilityStatus {
  if (isBrokenIngredient(ingredient, context.productsById)) {
    return 'deleted';
  }

  if (context.activeProductIds.has(ingredient.product_id!)) {
    return 'active';
  }

  return 'finished';
}

export function getIngredientStatuses(
  recipe: RecipeWithIngredients,
  context: RecipeStatusContext,
): IngredientStatusEntry[] {
  return recipe.ingredients.map((ingredient) => ({
    product: resolveIngredientProduct(ingredient, context.productsById),
    status: getIngredientAvailabilityStatus(ingredient, context),
  }));
}

export function getRecipeStatus(
  recipe: RecipeWithIngredients,
  context: RecipeStatusContext,
): RecipeStatus {
  if (
    recipe.ingredients.some((ingredient) =>
      isBrokenIngredient(ingredient, context.productsById),
    )
  ) {
    return 'broken';
  }

  if (
    recipe.ingredients.every((ingredient) =>
      context.activeProductIds.has(ingredient.product_id!),
    )
  ) {
    return 'ready';
  }

  return 'missing';
}

export function getMissingIngredients(
  recipe: RecipeWithIngredients,
  context: RecipeStatusContext,
): MissingIngredientEntry[] {
  return recipe.ingredients.flatMap((ingredient) => {
    if (isBrokenIngredient(ingredient, context.productsById)) {
      return [];
    }

    if (context.activeProductIds.has(ingredient.product_id!)) {
      return [];
    }

    const product = resolveIngredientProduct(
      ingredient,
      context.productsById,
    );

    if (!product) {
      return [];
    }

    return [{ product, status: 'finished' as const }];
  });
}

export function getMissingCount(
  recipe: RecipeWithIngredients,
  context: RecipeStatusContext,
): number {
  return getMissingIngredients(recipe, context).length;
}

export interface ClassifiedRecipe extends RecipeWithIngredients {
  status: RecipeStatus;
  missingCount: number;
  missingIngredients: MissingIngredientEntry[];
}

export function classifyRecipe(
  recipe: RecipeWithIngredients,
  context: RecipeStatusContext,
): ClassifiedRecipe {
  const missingIngredients = getMissingIngredients(recipe, context);

  return {
    ...recipe,
    status: getRecipeStatus(recipe, context),
    missingCount: missingIngredients.length,
    missingIngredients,
  };
}

export function classifyRecipes(
  recipes: RecipeWithIngredients[],
  context: RecipeStatusContext,
): ClassifiedRecipe[] {
  return recipes.map((recipe) => classifyRecipe(recipe, context));
}
