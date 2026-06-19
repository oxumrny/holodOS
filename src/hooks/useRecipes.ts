import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';
import type {
  MealType,
  RecipeFull,
  RecipeGroupOption,
  RecipeIngredientGroup,
  RecipeIngredientsInput,
  RecipeRequiredIngredient,
} from '@/types/recipe';

type RequiredIngredientRow = {
  recipe_id: string;
  product_id: string | null;
  products: Product | null;
};

type GroupOptionRow = {
  group_id: string;
  product_id: string | null;
  products: Product | null;
};

type IngredientGroupRow = {
  id: string;
  recipe_id: string;
  label: string;
  sort_order: number;
  recipe_ingredient_group_options: GroupOptionRow[];
};

type RecipeRow = {
  id: string;
  title: string;
  meal_type: MealType | null;
  instructions: string;
  cook_time_minutes: number;
  sort_order: number;
  created_at: string;
  recipe_required_ingredients: RequiredIngredientRow[] | null;
  recipe_ingredient_groups: IngredientGroupRow[] | null;
};

export interface RecipeWriteInput {
  title: string;
  mealType: MealType;
  instructions: string;
  cookTimeMinutes: number;
  requiredProductIds: string[];
  groups: RecipeIngredientsInput['groups'];
}

interface NormalizedGroup {
  label: string;
  productIds: string[];
  sort_order: number;
}

function normalizeMealType(mealType: MealType | null | undefined): MealType {
  return mealType === 'breakfast' ? 'breakfast' : 'lunch';
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    is_favorite: product.is_favorite ?? false,
  };
}

function mapRequiredRow(row: RequiredIngredientRow): RecipeRequiredIngredient {
  return {
    recipe_id: row.recipe_id,
    product_id: row.product_id,
    product: row.products ? normalizeProduct(row.products) : null,
  };
}

function mapGroupOptionRow(row: GroupOptionRow): RecipeGroupOption {
  return {
    group_id: row.group_id,
    product_id: row.product_id,
    product: row.products ? normalizeProduct(row.products) : null,
  };
}

function mapGroupRow(row: IngredientGroupRow): RecipeIngredientGroup {
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    label: row.label,
    sort_order: row.sort_order,
    options: (row.recipe_ingredient_group_options ?? []).map(mapGroupOptionRow),
  };
}

function mapRecipeRow(row: RecipeRow): RecipeFull {
  const groups = (row.recipe_ingredient_groups ?? [])
    .map(mapGroupRow)
    .sort((left, right) => left.sort_order - right.sort_order);

  return {
    id: row.id,
    title: row.title,
    meal_type: normalizeMealType(row.meal_type),
    instructions: row.instructions,
    cook_time_minutes: row.cook_time_minutes,
    sort_order: row.sort_order,
    created_at: row.created_at,
    required: (row.recipe_required_ingredients ?? []).map(mapRequiredRow),
    groups,
  };
}

function uniqueProductIds(productIds: string[]): string[] {
  return [...new Set(productIds)];
}

function normalizeIngredientGroups(
  groups: RecipeIngredientsInput['groups'],
): NormalizedGroup[] {
  return groups
    .map((group, index) => ({
      label: group.label.trim(),
      productIds: uniqueProductIds(group.productIds),
      sort_order: index,
    }))
    .filter((group) => group.label.length > 0 || group.productIds.length > 0);
}

export function validateRecipeIngredients(
  requiredProductIds: string[],
  groups: RecipeIngredientsInput['groups'],
): string | null {
  const required = uniqueProductIds(requiredProductIds);
  const normalizedGroups = normalizeIngredientGroups(groups);
  const hasRequired = required.length > 0;
  const hasValidGroup = normalizedGroups.some(
    (group) => group.label.length > 0 && group.productIds.length >= 2,
  );

  if (!hasRequired && !hasValidGroup) {
    return 'Добавьте обязательные ингредиенты или группу «одно из» с двумя продуктами';
  }

  for (const group of normalizedGroups) {
    if (!group.label) {
      return 'Укажите название группы';
    }

    if (group.productIds.length < 2) {
      return `В группе «${group.label}» нужно минимум 2 продукта`;
    }
  }

  for (const productId of required) {
    for (const group of normalizedGroups) {
      if (group.productIds.includes(productId)) {
        return 'Один продукт нельзя указать и в обязательных, и в группе';
      }
    }
  }

  const groupProductIds = new Set<string>();

  for (const group of normalizedGroups) {
    for (const productId of group.productIds) {
      if (groupProductIds.has(productId)) {
        return 'Один продукт нельзя указать в нескольких группах';
      }

      groupProductIds.add(productId);
    }
  }

  return null;
}

async function replaceRequiredIngredients(
  recipeId: string,
  productIds: string[],
) {
  const uniqueIds = uniqueProductIds(productIds);

  const { error: deleteError } = await supabase
    .from('recipe_required_ingredients')
    .delete()
    .eq('recipe_id', recipeId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (uniqueIds.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase
    .from('recipe_required_ingredients')
    .insert(
      uniqueIds.map((productId) => ({
        recipe_id: recipeId,
        product_id: productId,
      })),
    );

  if (insertError) {
    return { error: insertError.message };
  }

  return { error: null };
}

async function replaceGroupsForRecipe(
  recipeId: string,
  groups: NormalizedGroup[],
) {
  const { error: deleteError } = await supabase
    .from('recipe_ingredient_groups')
    .delete()
    .eq('recipe_id', recipeId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  for (const group of groups) {
    const { data: insertedGroup, error: groupError } = await supabase
      .from('recipe_ingredient_groups')
      .insert({
        recipe_id: recipeId,
        label: group.label,
        sort_order: group.sort_order,
      })
      .select('id')
      .single();

    if (groupError) {
      return { error: groupError.message };
    }

    const { error: optionsError } = await supabase
      .from('recipe_ingredient_group_options')
      .insert(
        group.productIds.map((productId) => ({
          group_id: insertedGroup.id,
          product_id: productId,
        })),
      );

    if (optionsError) {
      return { error: optionsError.message };
    }
  }

  return { error: null };
}

async function saveRecipeIngredients(
  recipeId: string,
  requiredProductIds: string[],
  groups: NormalizedGroup[],
) {
  const requiredResult = await replaceRequiredIngredients(
    recipeId,
    requiredProductIds,
  );

  if (requiredResult.error) {
    return requiredResult;
  }

  return replaceGroupsForRecipe(recipeId, groups);
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('recipes')
      .select(
        `
        *,
        recipe_required_ingredients (
          recipe_id,
          product_id,
          products (*)
        ),
        recipe_ingredient_groups (
          id,
          recipe_id,
          label,
          sort_order,
          recipe_ingredient_group_options (
            group_id,
            product_id,
            products (*)
          )
        )
      `,
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setRecipes([]);
    } else {
      setRecipes((data ?? []).map((row) => mapRecipeRow(row as RecipeRow)));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRecipes();
  }, [fetchRecipes]);

  const createRecipe = async (input: RecipeWriteInput) => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: 'Введите название рецепта' };
    }

    const normalizedGroups = normalizeIngredientGroups(input.groups);
    const validationError = validateRecipeIngredients(
      input.requiredProductIds,
      normalizedGroups,
    );

    if (validationError) {
      return { error: validationError };
    }

    const maxOrder = recipes.reduce(
      (max, recipe) => Math.max(max, recipe.sort_order),
      -1,
    );

    const { data: insertedRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        title: trimmedTitle,
        meal_type: input.mealType,
        instructions: input.instructions.trim(),
        cook_time_minutes: Math.max(0, input.cookTimeMinutes),
        sort_order: maxOrder + 1,
      })
      .select('id')
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    const { error: ingredientsError } = await saveRecipeIngredients(
      insertedRecipe.id,
      input.requiredProductIds,
      normalizedGroups,
    );

    if (ingredientsError) {
      await supabase.from('recipes').delete().eq('id', insertedRecipe.id);
      return { error: ingredientsError };
    }

    await fetchRecipes();
    return { error: null, id: insertedRecipe.id };
  };

  const updateRecipe = async (
    id: string,
    input: RecipeWriteInput,
    options?: { updateIngredients?: boolean },
  ) => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { error: 'Введите название рецепта' };
    }

    const shouldUpdateIngredients = options?.updateIngredients ?? true;
    const normalizedGroups = normalizeIngredientGroups(input.groups);

    if (shouldUpdateIngredients) {
      const validationError = validateRecipeIngredients(
        input.requiredProductIds,
        normalizedGroups,
      );

      if (validationError) {
        return { error: validationError };
      }
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title: trimmedTitle,
        meal_type: input.mealType,
        instructions: input.instructions.trim(),
        cook_time_minutes: Math.max(0, input.cookTimeMinutes),
      })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    if (shouldUpdateIngredients) {
      const { error: ingredientsError } = await saveRecipeIngredients(
        id,
        input.requiredProductIds,
        normalizedGroups,
      );

      if (ingredientsError) {
        return { error: ingredientsError };
      }
    }

    await fetchRecipes();
    return { error: null };
  };

  const deleteRecipe = async (id: string) => {
    const { data: deletedRows, error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (!deletedRows?.length) {
      return { error: 'Не удалось удалить рецепт' };
    }

    await fetchRecipes();
    return { error: null };
  };

  return {
    recipes,
    loading,
    error,
    refresh: fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
}
