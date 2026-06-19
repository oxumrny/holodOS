export type ProductStatus = 'active' | 'finished';

export type ProductCategory = string;

export const CATEGORY_ORDER: ProductCategory[] = [
  'молочка',
  'овощи и фрукты',
  'мясо и рыба',
  'бакалея',
  'напитки',
  'заморозка',
  'бытовая химия',
  'прочее',
];

export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  category: ProductCategory;
  is_favorite: boolean;
  created_at: string;
  finished_at: string | null;
}
