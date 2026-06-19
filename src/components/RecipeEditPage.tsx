import { useRef } from 'react';

import {
  RecipeForm,
  type RecipeFormHandle,
  type RecipeFormValues,
} from '@/components/RecipeForm';
import type { Product } from '@/types/product';

import './RecipeEditPage.css';

interface RecipeEditPageProps {
  products: Product[];
  activeProductIds: Set<string>;
  initialValues: RecipeFormValues;
  initialDeletedIngredientCount: number;
  onSave: (values: RecipeFormValues) => Promise<{ error: string | null }>;
  onDelete: () => Promise<{ error: string | null }>;
  onBack: () => void;
}

export function RecipeEditPage({
  products,
  activeProductIds,
  initialValues,
  initialDeletedIngredientCount,
  onSave,
  onDelete,
  onBack,
}: RecipeEditPageProps) {
  const formRef = useRef<RecipeFormHandle>(null);

  const handleBack = () => {
    formRef.current?.requestClose();
  };

  return (
    <div className="recipe-edit-page">
      <div className="recipe-edit-page__top">
        <button
          type="button"
          className="recipe-edit-page__back"
          onClick={handleBack}
        >
          ← Рецепты
        </button>
      </div>
      <RecipeForm
        ref={formRef}
        mode="edit"
        layout="page"
        products={products}
        activeProductIds={activeProductIds}
        initialValues={initialValues}
        initialDeletedIngredientCount={initialDeletedIngredientCount}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onBack}
      />
    </div>
  );
}
