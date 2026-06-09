import { CATEGORY_ORDER } from '@/types/product';

const CUSTOM_KEY = 'holodos-custom-categories';
const HIDDEN_KEY = 'holodos-hidden-categories';
const ALIASES_KEY = 'holodos-category-aliases';
const MISC_CATEGORY = 'прочее';

function readJsonArray(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function readAliases(): Record<string, string> {
  try {
    const stored = localStorage.getItem(ALIASES_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function getCustomCategories(): string[] {
  return readJsonArray(CUSTOM_KEY);
}

export function getHiddenCategories(): string[] {
  return readJsonArray(HIDDEN_KEY);
}

export function getDetectAliases(): Record<string, string> {
  return readAliases();
}

export function sortCategoriesForSelect(categories: string[]): string[] {
  const rest = categories
    .filter((category) => category !== MISC_CATEGORY)
    .sort((a, b) => a.localeCompare(b, 'ru'));
  return categories.includes(MISC_CATEGORY) ? [MISC_CATEGORY, ...rest] : rest;
}

export function getAllCategories(): string[] {
  const hidden = new Set(getHiddenCategories());
  const merged = CATEGORY_ORDER.filter((category) => !hidden.has(category));

  for (const category of getCustomCategories()) {
    if (!hidden.has(category) && !merged.includes(category)) {
      merged.push(category);
    }
  }

  return sortCategoriesForSelect(merged);
}

export function resolveDetectedCategory(detected: string): string {
  const aliases = getDetectAliases();
  const hidden = new Set(getHiddenCategories());
  const resolved = aliases[detected] ?? detected;

  if (hidden.has(resolved)) {
    return MISC_CATEGORY;
  }

  const available = getAllCategories();
  if (available.includes(resolved)) {
    return resolved;
  }

  if (hidden.has(detected)) {
    return MISC_CATEGORY;
  }

  return resolved;
}

export function addCustomCategory(name: string): { error: string | null } {
  const trimmed = normalizeCategoryName(name);

  if (!trimmed) {
    return { error: 'Введите название категории' };
  }

  if (getAllCategories().includes(trimmed)) {
    return { error: 'Такая категория уже есть' };
  }

  const custom = getCustomCategories();
  custom.push(trimmed);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));

  return { error: null };
}

export function renameCategoryInConfig(
  oldName: string,
  newName: string,
): { error: string | null } {
  const trimmed = normalizeCategoryName(newName);

  if (!trimmed) {
    return { error: 'Введите название категории' };
  }

  if (trimmed === oldName) {
    return { error: null };
  }

  if (getAllCategories().includes(trimmed)) {
    return { error: 'Такая категория уже есть' };
  }

  const custom = getCustomCategories().filter((category) => category !== oldName);
  const hidden = getHiddenCategories().filter((category) => category !== trimmed);
  const aliases = getDetectAliases();

  if (CATEGORY_ORDER.includes(oldName as (typeof CATEGORY_ORDER)[number])) {
    if (!hidden.includes(oldName)) {
      hidden.push(oldName);
    }
    aliases[oldName] = trimmed;
    custom.push(trimmed);
  } else if (getCustomCategories().includes(oldName)) {
    custom.push(trimmed);
    if (!hidden.includes(oldName)) {
      hidden.push(oldName);
    }
  } else {
    custom.push(trimmed);
    if (!hidden.includes(oldName)) {
      hidden.push(oldName);
    }
  }

  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));

  return { error: null };
}

export function deleteCategoryFromConfig(name: string): { error: string | null } {
  if (name === MISC_CATEGORY) {
    return { error: 'Нельзя удалить категорию «прочее»' };
  }

  const hidden = getHiddenCategories();
  if (!hidden.includes(name)) {
    hidden.push(name);
  }

  const custom = getCustomCategories().filter((category) => category !== name);
  const aliases = getDetectAliases();
  delete aliases[name];

  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));

  return { error: null };
}

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}
