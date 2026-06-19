import type { Product } from '@/types/product';
import type {
  RecipeFull,
  RecipeGroupOption,
  RecipeIngredientGroup,
  RecipeRequiredIngredient,
} from '@/types/recipe';

export type RecipeStatus = 'ready' | 'missing' | 'broken';

export type IngredientAvailabilityStatus = 'active' | 'finished' | 'deleted';

export interface RecipeStatusContext {
  activeProductIds: Set<string>;
  productsById: Map<string, Product>;
}

export interface IngredientStatusEntry {
  product: Product | null;
  status: IngredientAvailabilityStatus;
}

export interface RequiredStatusEntry extends IngredientStatusEntry {
  recipe_id: string;
  product_id: string | null;
}

export interface GroupStatusEntry {
  group: RecipeIngredientGroup;
  options: IngredientStatusEntry[];
  hasActiveOption: boolean;
}

export interface MissingIngredientEntry {
  product: Product;
  status: 'finished';
}

export interface MissingGroupEntry {
  label: string;
}

export function buildRecipeStatusContext(
  activeProducts: Product[],
  finishedProducts: Product[],
): RecipeStatusContext {
  const productsById = new Map<string, Product>();

  for (const product of [...activeProducts, ...finishedProducts]) {
    productsById.set(product.id, product);
  }

  return {
    activeProductIds: new Set(activeProducts.map((product) => product.id)),
    productsById,
  };
}

export function resolveProduct(
  productId: string | null,
  embeddedProduct: Product | null | undefined,
  productsById: Map<string, Product>,
): Product | null {
  if (productId === null) {
    return null;
  }

  return embeddedProduct ?? productsById.get(productId) ?? null;
}

export function isProductBroken(
  productId: string | null,
  productsById: Map<string, Product>,
): boolean {
  if (productId === null) {
    return true;
  }

  return !productsById.has(productId);
}

export function isProductActive(
  productId: string | null,
  context: RecipeStatusContext,
): boolean {
  if (productId === null) {
    return false;
  }

  return context.activeProductIds.has(productId);
}

export function isGroupBroken(group: RecipeIngredientGroup): boolean {
  return !group.options.some((option) => option.product_id !== null);
}

export function isRequiredSlotBroken(
  item: RecipeRequiredIngredient,
  productsById: Map<string, Product>,
): boolean {
  return isProductBroken(item.product_id, productsById);
}

export function getRequiredAvailabilityStatus(
  item: RecipeRequiredIngredient,
  context: RecipeStatusContext,
): IngredientAvailabilityStatus {
  if (isProductBroken(item.product_id, context.productsById)) {
    return 'deleted';
  }

  if (isProductActive(item.product_id, context)) {
    return 'active';
  }

  return 'finished';
}

export function getOptionAvailabilityStatus(
  option: RecipeGroupOption,
  context: RecipeStatusContext,
): IngredientAvailabilityStatus {
  if (isProductBroken(option.product_id, context.productsById)) {
    return 'deleted';
  }

  if (isProductActive(option.product_id, context)) {
    return 'active';
  }

  return 'finished';
}

export function isGroupMissing(
  group: RecipeIngredientGroup,
  context: RecipeStatusContext,
): boolean {
  if (isGroupBroken(group)) {
    return false;
  }

  return !group.options.some((option) =>
    isProductActive(option.product_id, context),
  );
}

export function isRecipeBroken(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): boolean {
  if (
    recipe.required.some((item) =>
      isRequiredSlotBroken(item, context.productsById),
    )
  ) {
    return true;
  }

  return recipe.groups.some((group) => isGroupBroken(group));
}

export function isRecipeReady(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): boolean {
  if (isRecipeBroken(recipe, context)) {
    return false;
  }

  const allRequiredActive = recipe.required.every((item) =>
    isProductActive(item.product_id, context),
  );
  const allGroupsSatisfied = recipe.groups.every(
    (group) => !isGroupMissing(group, context),
  );

  return allRequiredActive && allGroupsSatisfied;
}

export function getRecipeStatus(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): RecipeStatus {
  if (isRecipeBroken(recipe, context)) {
    return 'broken';
  }

  if (isRecipeReady(recipe, context)) {
    return 'ready';
  }

  return 'missing';
}

export function getMissingRequired(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): MissingIngredientEntry[] {
  return recipe.required.flatMap((item) => {
    if (isRequiredSlotBroken(item, context.productsById)) {
      return [];
    }

    if (isProductActive(item.product_id, context)) {
      return [];
    }

    const product = resolveProduct(
      item.product_id,
      item.product,
      context.productsById,
    );

    if (!product) {
      return [];
    }

    return [{ product, status: 'finished' as const }];
  });
}

export function getMissingGroups(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): MissingGroupEntry[] {
  return recipe.groups.flatMap((group) => {
    if (isGroupBroken(group)) {
      return [];
    }

    if (!isGroupMissing(group, context)) {
      return [];
    }

    return [{ label: group.label }];
  });
}

export function getMissingCount(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): number {
  return (
    getMissingRequired(recipe, context).length +
    getMissingGroups(recipe, context).length
  );
}

export function formatMissingLabels(
  missingIngredients: MissingIngredientEntry[],
  missingGroups: MissingGroupEntry[],
): string {
  const parts = [
    ...missingIngredients.map((entry) => entry.product.name),
    ...missingGroups.map((entry) => entry.label.toLocaleLowerCase('ru')),
  ];

  return parts.join(', ');
}

export function countBrokenSlots(
  recipe: RecipeFull,
  productsById: Map<string, Product>,
): number {
  let count = recipe.required.filter((item) =>
    isRequiredSlotBroken(item, productsById),
  ).length;

  for (const group of recipe.groups) {
    count += group.options.filter((option) =>
      isProductBroken(option.product_id, productsById),
    ).length;
  }

  return count;
}

export function getRequiredStatuses(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): RequiredStatusEntry[] {
  return recipe.required.map((item) => ({
    recipe_id: item.recipe_id,
    product_id: item.product_id,
    product: resolveProduct(item.product_id, item.product, context.productsById),
    status: getRequiredAvailabilityStatus(item, context),
  }));
}

export function getGroupStatuses(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): GroupStatusEntry[] {
  return recipe.groups.map((group) => {
    const options = group.options.map((option) => ({
      product: resolveProduct(
        option.product_id,
        option.product,
        context.productsById,
      ),
      status: getOptionAvailabilityStatus(option, context),
    }));

    return {
      group,
      options,
      hasActiveOption: options.some((entry) => entry.status === 'active'),
    };
  });
}

function getActiveProductName(
  productId: string | null,
  embeddedProduct: Product | null | undefined,
  context: RecipeStatusContext,
): string | null {
  if (!isProductActive(productId, context)) {
    return null;
  }

  return resolveProduct(productId, embeddedProduct, context.productsById)?.name ?? null;
}

export function getActiveCombinations(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): string[][] {
  if (!isRecipeReady(recipe, context)) {
    return [];
  }

  const requiredNames = recipe.required.flatMap((item) => {
    const name = getActiveProductName(
      item.product_id,
      item.product,
      context,
    );

    return name ? [name] : [];
  });

  const activeOptionsByGroup = recipe.groups.map((group) =>
    group.options.flatMap((option) => {
      const name = getActiveProductName(
        option.product_id,
        option.product,
        context,
      );

      return name ? [name] : [];
    }),
  );

  let combinations: string[][] = [requiredNames];

  for (const groupOptions of activeOptionsByGroup) {
    const nextCombinations: string[][] = [];

    for (const combination of combinations) {
      for (const optionName of groupOptions) {
        nextCombinations.push([...combination, optionName]);
      }
    }

    combinations = nextCombinations;
  }

  return combinations;
}

function formatCombinationCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} вариант`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} варианта`;
  }

  return `${count} вариантов`;
}

export function formatReadyCombinationLabel(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): string | null {
  const combinations = getActiveCombinations(recipe, context);

  if (combinations.length === 0) {
    return null;
  }

  if (combinations.length === 1) {
    return combinations[0].join(' + ');
  }

  return formatCombinationCount(combinations.length);
}

export interface ClassifiedRecipe extends RecipeFull {
  status: RecipeStatus;
  missingCount: number;
  missingIngredients: MissingIngredientEntry[];
  missingGroups: MissingGroupEntry[];
  readyCombinationLabel: string | null;
}

export function classifyRecipe(
  recipe: RecipeFull,
  context: RecipeStatusContext,
): ClassifiedRecipe {
  const missingIngredients = getMissingRequired(recipe, context);
  const missingGroups = getMissingGroups(recipe, context);
  const status = getRecipeStatus(recipe, context);

  return {
    ...recipe,
    status,
    missingCount: missingIngredients.length + missingGroups.length,
    missingIngredients,
    missingGroups,
    readyCombinationLabel:
      status === 'ready'
        ? formatReadyCombinationLabel(recipe, context)
        : null,
  };
}

export function classifyRecipes(
  recipes: RecipeFull[],
  context: RecipeStatusContext,
): ClassifiedRecipe[] {
  return recipes.map((recipe) => classifyRecipe(recipe, context));
}
