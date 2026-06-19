import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Store } from '@/types/store';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('stores')
      .select('*')
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setStores([]);
    } else {
      setStores(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const addStore = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { error: 'Введите название магазина' };
    }

    const maxOrder = stores.reduce(
      (max, store) => Math.max(max, store.sort_order),
      -1,
    );

    const { error: insertError } = await supabase.from('stores').insert({
      name: trimmed,
      sort_order: maxOrder + 1,
    });

    if (insertError) {
      return { error: insertError.message };
    }

    await fetchStores();
    return { error: null };
  };

  const renameStore = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { error: 'Введите название магазина' };
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update({ name: trimmed })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    await fetchStores();
    return { error: null };
  };

  const deleteStore = async (id: string) => {
    const { data: deletedRows, error: deleteError } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (!deletedRows?.length) {
      return { error: 'Не удалось удалить магазин' };
    }

    await fetchStores();
    return { error: null };
  };

  const moveStore = async (id: string, direction: 'up' | 'down') => {
    const index = stores.findIndex((store) => store.id === id);
    if (index === -1) {
      return { error: 'Магазин не найден' };
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stores.length) {
      return { error: null };
    }

    const current = stores[index];
    const target = stores[targetIndex];

    const { error: updateCurrentError } = await supabase
      .from('stores')
      .update({ sort_order: target.sort_order })
      .eq('id', current.id);

    if (updateCurrentError) {
      return { error: updateCurrentError.message };
    }

    const { error: updateTargetError } = await supabase
      .from('stores')
      .update({ sort_order: current.sort_order })
      .eq('id', target.id);

    if (updateTargetError) {
      return { error: updateTargetError.message };
    }

    await fetchStores();
    return { error: null };
  };

  return {
    stores,
    loading,
    error,
    refresh: fetchStores,
    clearError: () => setError(null),
    addStore,
    renameStore,
    deleteStore,
    moveStore,
  };
}
