import { useEffect, useState } from 'react';

import { fetchExcludedStoreIdsByProduct } from '@/lib/productExclusions';

export function useProductExclusionsMap(
  productIds: string[],
  refreshKey = 0,
) {
  const [exclusionsMap, setExclusionsMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productIdsKey = productIds.join(',');

  useEffect(() => {
    if (productIds.length === 0) {
      setExclusionsMap(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchExcludedStoreIdsByProduct(productIds).then(
      ({ map, error: fetchError }) => {
        if (cancelled) {
          return;
        }

        if (fetchError) {
          setError(fetchError);
          setExclusionsMap(new Map());
        } else {
          setExclusionsMap(map);
        }

        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [productIdsKey, productIds.length, refreshKey]);

  return { exclusionsMap, loading, error };
}
