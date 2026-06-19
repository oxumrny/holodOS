import { useCallback, useEffect, useState } from 'react';

import { resolveDetectedCategory } from '@/lib/categoryConfig';
import { detectCategory } from '@/lib/detectCategory';
import { supabase } from '@/lib/supabase';
import type { Product, ProductStatus } from '@/types/product';

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    is_favorite: product.is_favorite ?? false,
  };
}

export function useProducts(status: ProductStatus) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = supabase
      .from('products')
      .select('*')
      .eq('status', status)
      .order(status === 'finished' ? 'finished_at' : 'created_at', {
        ascending: false,
      });

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setProducts([]);
    } else {
      setProducts((data ?? []).map(normalizeProduct));
    }

    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (
    name: string,
    targetStatus: ProductStatus = status,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { error: 'Введите название продукта' };
    }

    const normalizedName = trimmed.toLowerCase();

    const { data: existingProduct, error: lookupError } = await supabase
      .from('products')
      .select('id, status, name')
      .ilike('name', normalizedName)
      .maybeSingle();

    if (lookupError) {
      return { error: lookupError.message };
    }

    if (existingProduct) {
      const location =
        existingProduct.status === 'active'
          ? 'в холодосе'
          : 'в списке покупок';

      return {
        error: `«${existingProduct.name}» уже ${location}`,
        duplicateStatus: existingProduct.status as ProductStatus,
      };
    }

    const insertPayload: {
      name: string;
      status: ProductStatus;
      category: string;
      finished_at?: string;
    } = {
      name: normalizedName,
      status: targetStatus,
      category: resolveDetectedCategory(detectCategory(normalizedName)),
    };

    if (targetStatus === 'finished') {
      insertPayload.finished_at = new Date().toISOString();
    }

    const { error: insertError } = await supabase
      .from('products')
      .insert(insertPayload);

    if (insertError) {
      return { error: insertError.message };
    }

    await fetchProducts();
    return { error: null };
  };

  const markAsFinished = async (id: string) => {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    await fetchProducts();
    return { error: null };
  };

  const restoreProduct = async (id: string) => {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        status: 'active',
        finished_at: null,
      })
      .eq('id', id);

    if (updateError) {
      return { error: updateError.message };
    }

    await fetchProducts();
    return { error: null };
  };

  const deleteProduct = async (id: string) => {
    const { data: deletedRows, error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (!deletedRows?.length) {
      return { error: 'Не удалось удалить продукт' };
    }

    return { error: null };
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    addProduct,
    markAsFinished,
    restoreProduct,
    deleteProduct,
  };
}
