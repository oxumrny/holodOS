import type { Product } from '@/types/product';

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase('ru');
}

export function productMatchesSearch(
  product: Product,
  normalizedSearch: string,
): boolean {
  if (!normalizedSearch) {
    return true;
  }

  return product.name.toLocaleLowerCase('ru').includes(normalizedSearch);
}

export function filterProductsBySearch(
  products: Product[],
  normalizedSearch: string,
): Product[] {
  if (!normalizedSearch) {
    return products;
  }

  return products.filter((product) =>
    productMatchesSearch(product, normalizedSearch),
  );
}
