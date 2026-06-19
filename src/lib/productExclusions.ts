import { supabase } from '@/lib/supabase';

export async function fetchExcludedStoreIds(
  productId: string,
): Promise<{ storeIds: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from('product_store_exclusions')
    .select('store_id')
    .eq('product_id', productId);

  if (error) {
    return { storeIds: [], error: error.message };
  }

  return {
    storeIds: (data ?? []).map((row) => row.store_id),
    error: null,
  };
}

export async function fetchExcludedStoreIdsByProduct(
  productIds: string[],
): Promise<{ map: Map<string, string[]>; error: string | null }> {
  if (productIds.length === 0) {
    return { map: new Map(), error: null };
  }

  const { data, error } = await supabase
    .from('product_store_exclusions')
    .select('product_id, store_id')
    .in('product_id', productIds);

  if (error) {
    return { map: new Map(), error: error.message };
  }

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const existing = map.get(row.product_id) ?? [];
    existing.push(row.store_id);
    map.set(row.product_id, existing);
  }

  return { map, error: null };
}

export async function setProductExclusions(
  productId: string,
  excludedStoreIds: string[],
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from('product_store_exclusions')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (excludedStoreIds.length === 0) {
    return { error: null };
  }

  const rows = excludedStoreIds.map((storeId) => ({
    product_id: productId,
    store_id: storeId,
  }));

  const { error: insertError } = await supabase
    .from('product_store_exclusions')
    .insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  return { error: null };
}
