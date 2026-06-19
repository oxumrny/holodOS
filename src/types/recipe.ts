import type { Product } from '@/types/product';

export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  cook_time_minutes: number;
  sort_order: number;
  created_at: string;
}

export interface RecipeIngredient {
  recipe_id: string;
  product_id: string | null;
  product?: Product | null;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}
