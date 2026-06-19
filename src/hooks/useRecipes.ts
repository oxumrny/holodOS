import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/types/product';
import type { RecipeWithIngredients } from '@/types/recipe';

type RecipeIngredientRow = {
  recipe_id: string;
  product_id: string | null;
  products: Product | null;
};

type RecipeRow = {
  id: string;
  title: string;
  instructions: string;
  cook_time_minutes: number;
  sort_order: number;
  created_at: string;
  recipe_ingredients: RecipeIngredientRow[];
};

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    is_favorite: product.is_favorite ?? false,
  };
}

function mapRecipeRow(row: RecipeRow): RecipeWithIngredients {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    cook_time_minutes: row.cook_time_minutes,
    sort_order: row.sort_order,
    created_at: row.created_at,
    ingredients: (row.recipe_ingredients ?? []).map((ingredient) => ({
      recipe_id: ingredient.recipe_id,
      product_id: ingredient.product_id,
      product: ingredient.products
        ? normalizeProduct(ingredient.products)
        : null,
    })),
  };
}

function uniqueProductIds(productIds: string[]): string[] {
  return [...new Set(productIds)];
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
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
        recipe_ingredients (
          recipe_id,
          product_id,
          products (*)
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

  const replaceRecipeIngredients = async (
    recipeId: string,
    productIds: string[],
  ) => {
    const uniqueIds = uniqueProductIds(productIds);

    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (uniqueIds.length === 0) {
      return { error: null };
    }

    const { error: insertError } = await supabase
      .from('recipe_ingredients')
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
  };

  const createRecipe = async (
    title: string,
    instructions: string,
    cookTimeMinutes: number,
    productIds: string[],
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { error: 'Введите название рецепта' };
    }

    const uniqueIds = uniqueProductIds(productIds);
    if (uniqueIds.length === 0) {
      return { error: 'Добавьте хотя бы один ингредиент' };
    }

    const maxOrder = recipes.reduce(
      (max, recipe) => Math.max(max, recipe.sort_order),
      -1,
    );

    const { data: insertedRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        title: trimmedTitle,
        instructions: instructions.trim(),
        cook_time_minutes: Math.max(0, cookTimeMinutes),
        sort_order: maxOrder + 1,
      })
      .select('id')
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    const { error: ingredientsError } = await replaceRecipeIngredients(
      insertedRecipe.id,
      uniqueIds,
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
    title: string,
    instructions: string,
    cookTimeMinutes: number,
    productIds?: string[],
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { error: 'Введите название рецепта' };
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title: trimmedTitle,
        instructions: instructions.trim(),
        cook_time_minutes: Math.max(0, cookTimeMinutes),
      })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    if (productIds !== undefined) {
      const uniqueIds = uniqueProductIds(productIds);
      if (uniqueIds.length === 0) {
        return { error: 'Добавьте хотя бы один ингредиент' };
      }

      const { error: ingredientsError } = await replaceRecipeIngredients(
        id,
        uniqueIds,
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
    replaceRecipeIngredients,
  };
}
