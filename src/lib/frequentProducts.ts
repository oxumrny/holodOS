import { supabase } from '@/lib/supabase';

const LEGACY_PINNED_KEY = 'holodos-pinned-products';
const LEGACY_ACTIVITY_KEY = 'holodos-product-activity';
const PINNED_MIGRATION_KEY = 'holodos-pinned-migrated';

export const MAX_FREQUENT = 8;

export async function migrateFavoriteProductsFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(PINNED_MIGRATION_KEY)) {
    localStorage.removeItem(LEGACY_ACTIVITY_KEY);
    return;
  }

  let pinnedIds: string[] = [];

  try {
    const stored = localStorage.getItem(LEGACY_PINNED_KEY);
    pinnedIds = stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    pinnedIds = [];
  }

  if (pinnedIds.length > 0) {
    const { error } = await supabase
      .from('products')
      .update({ is_favorite: true })
      .in('id', pinnedIds);

    if (error) {
      console.error('Не удалось перенести избранное из localStorage:', error.message);
      return;
    }
  }

  localStorage.removeItem(LEGACY_PINNED_KEY);
  localStorage.removeItem(LEGACY_ACTIVITY_KEY);
  localStorage.setItem(PINNED_MIGRATION_KEY, '1');
}

export async function toggleProductFavorite(
  productId: string,
  isCurrentlyFavorite: boolean,
): Promise<{ isFavorite: boolean; error: string | null }> {
  if (!isCurrentlyFavorite) {
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_favorite', true);

    if (countError) {
      return { isFavorite: false, error: countError.message };
    }

    if ((count ?? 0) >= MAX_FREQUENT) {
      return {
        isFavorite: false,
        error: `Можно добавить не больше ${MAX_FREQUENT} мастхэв-продуктов`,
      };
    }
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({ is_favorite: !isCurrentlyFavorite })
    .eq('id', productId);

  if (updateError) {
    return { isFavorite: isCurrentlyFavorite, error: updateError.message };
  }

  return { isFavorite: !isCurrentlyFavorite, error: null };
}
