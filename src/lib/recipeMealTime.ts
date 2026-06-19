import type { MealType } from '@/types/recipe';

export const BREAKFAST_UNTIL_HOUR = 12;

export function getPrimaryMealType(now = new Date()): MealType {
  return now.getHours() < BREAKFAST_UNTIL_HOUR ? 'breakfast' : 'lunch';
}

export function getMealTypeOrder(now = new Date()): MealType[] {
  const primary = getPrimaryMealType(now);
  const secondary = primary === 'breakfast' ? 'lunch' : 'breakfast';
  return [primary, secondary];
}

export function getMealTypeLabel(mealType: MealType): string {
  return mealType === 'breakfast' ? 'Завтраки' : 'Обеды';
}

export function getMealTypeSingularLabel(mealType: MealType): string {
  return mealType === 'breakfast' ? 'Завтрак' : 'Обед';
}

export function getPrimaryMealHint(mealType: MealType, now = new Date()): string | null {
  if (mealType === 'breakfast' && getPrimaryMealType(now) === 'breakfast') {
    return 'Утро — завтраки';
  }

  if (mealType === 'lunch' && getPrimaryMealType(now) === 'lunch') {
    return 'День — обеды';
  }

  return null;
}
