# Рецепты — инструкция для реализации

Пошаговое ТЗ для вкладки «Рецепты» в holodOS. Согласовано с [ROADMAP.md](./ROADMAP.md), п. 3.

---

## Цель

Вкладка **«Рецепты»**: пользователь видит, что можно приготовить из продуктов в холодосе. Рецепты только свои, вручную. Бинарная модель: ингредиент есть (`active`) / нет (`finished` или удалён).

Утром (до 12:00) сверху — **завтраки**, ниже — **обеды**. С 12:00 — наоборот.

---

## Принципы

- Ингредиент = **`product_id`** из **всего каталога** продуктов app (не только `active`).
- **Без** внешних библиотек, ссылок, граммовок, замен ингредиентов.
- **Без** кнопки «купить недостающее» — `finished` уже в списке покупок.
- Удалённый продукт → рецепт в секции **«Нужно поправить»**.
- Карточка рецепта: название, **завтрак/обед**, ингредиенты, инструкция (text), время (минуты).
- Оба типа приёма пищи **всегда видны**; время суток меняет только **порядок блоков** (мягкий режим).

---

## Этап 1 — База данных

**Файл:** `supabase/migrate-recipes.sql`

```sql
recipes:
  id uuid PK
  title text NOT NULL
  meal_type text NOT NULL check (meal_type in ('breakfast', 'lunch'))
  instructions text NOT NULL DEFAULT ''
  cook_time_minutes integer NOT NULL DEFAULT 0   -- 0 = не указано
  sort_order integer NOT NULL DEFAULT 0
  created_at timestamptz

recipe_ingredients:
  recipe_id uuid FK → recipes ON DELETE CASCADE
  product_id uuid FK → products ON DELETE SET NULL
  PRIMARY KEY (recipe_id, product_id)
```

- RLS — по аналогии с `products` / `stores`.
- `ON DELETE SET NULL` на `product_id`: удаление продукта не удаляет рецепт, а «ломает» его.

**Опционально (полировка):** `product_name_snapshot text` на `recipe_ingredients` — показать «был: сыр» в «нужно поправить».

---

## Этап 2 — Типы и хуки

**Файлы:**
- `src/types/recipe.ts`
- `src/hooks/useRecipes.ts`

```ts
type MealType = 'breakfast' | 'lunch';

Recipe {
  id, title, meal_type, instructions, cook_time_minutes,
  sort_order, created_at
}

RecipeWithIngredients — recipe + ingredients[] (join products)
```

**CRUD:**
- `createRecipe(title, mealType, instructions, cookTimeMinutes, productIds[])`
- `updateRecipe(...)`
- `deleteRecipe(id)`
- `replaceRecipeIngredients(recipeId, productIds[])`

---

## Этап 3 — Логика статуса рецепта

**Файл:** `src/lib/recipeStatus.ts`

| Статус | Условие |
|--------|---------|
| `broken` | ингредиент с `product_id === null` или продукт не найден |
| `ready` | не broken и все ингредиенты `active` |
| `missing` | не broken и хотя бы один ингредиент не `active` |

**Вспомогательно:**
- `getMissingIngredients(recipe)` → список с именами и статусом
- `missingCount` — для сортировки «почти готов»

Пересчёт в `useMemo` при изменении продуктов и рецептов.

---

## Этап 4 — Время суток (завтрак / обед)

**Файл:** `src/lib/recipeMealTime.ts`

```ts
export const BREAKFAST_UNTIL_HOUR = 12;

export function getPrimaryMealType(now = new Date()): MealType {
  return now.getHours() < BREAKFAST_UNTIL_HOUR ? 'breakfast' : 'lunch';
}

export function getMealTypeOrder(now = new Date()): MealType[] {
  const primary = getPrimaryMealType(now);
  const secondary = primary === 'breakfast' ? 'lunch' : 'breakfast';
  return [primary, secondary];
}
```

**UI:**
- группировка рецептов по `meal_type`;
- рендер блоков в порядке `getMealTypeOrder()`;
- заголовки: «Завтраки», «Обеды»;
- второй блок — сворачиваемый (`collapsedSecondaryMeal`, state в `RecipesView`);
- подсказка под заголовком primary-блока до 12:00: «Утро — завтраки» (опционально).

**Не делать:** скрывать второй тип полностью; cron; серверное время.

---

## Этап 5 — Навигация

**Файл:** `src/App.tsx`

- Добавить view/tab `'recipes'` (отдельно от `active` / `finished`).
- В header — иконка рецептов (🍳), рядом с холодос/покупки/настройки.
- На вкладке рецептов **не показывать** `ProductQueryBar` и store selector.
- При возврате с рецептов — refresh продуктов при необходимости.

---

## Этап 6 — Экран «Рецепты»

**Файл:** `src/components/RecipesView.tsx` (+ CSS)

**Структура:**

```
[ + Рецепт ]   [ поиск по названию ]

── Завтраки (primary или secondary) ──
  Можно сейчас
  Не хватает        ← сортировка по missingCount ↑
  Нужно поправить

── Обеды (свёрнуть ▾) ──
  (та же структура)
```

**Строка рецепта:** название, время (`30 мин`, скрыть если 0), тап → просмотр/редактирование.

**«Не хватает»:** подпись «нет: сыр, молоко» + «в списке покупок».

**«Нужно поправить»:** бейдж, текст «удалён ингредиент» → редактирование.

**Empty state:** «Пока нет рецептов».

---

## Этап 7 — Форма рецепта

**Файл:** `src/components/RecipeForm.tsx`

**Поля:**
- Название (required)
- **Тип:** radio или select — «Завтрак» / «Обед» (required)
- Ингредиенты — multiselect из **всех** продуктов (🧊 / 📋 в picker, поиск)
- Инструкция — textarea
- Время — number, минуты

**Кнопки:** Сохранить / Удалить (при edit) / Отмена

Паттерн — как `ProductSettingsForm` (modal/sheet).

**Валидация:** title не пустой; ≥ 1 ингредиент; `meal_type` задан.

---

## Этап 8 — Детальный просмотр

**Файл:** `src/components/RecipeDetail.tsx` или режим в `RecipeForm`

- название, тип (Завтрак/Обед), время, инструкция;
- ингредиенты: ✅ active / ❌ finished / ⚠️ удалён;
- для `broken` — «Нужно поправить: замените удалённые ингредиенты»;
- кнопка «Редактировать».

---

## Этап 9 — Удаление продукта

Достаточно `ON DELETE SET NULL` — доп. логика в `deleteProduct` не нужна.

После delete на вкладке рецептов — `recipes.refresh()`.

---

## Этап 10 — Полировка (после MVP)

- [ ] Сортировка «почти готов» в «Не хватает»
- [ ] Подпись «в списке покупок»
- [ ] `product_name_snapshot` для сломанных ингредиентов
- [ ] Тип «ужин» + настраиваемый порог в Settings

---

## Не делать в v1

- Внешние API, preset-рецепты, URL
- Кнопка «добавить в покупки»
- Граммы, порции, замены ингредиентов
- Жёсткое скрытие «неактуального» meal_type
- Связь рецептов с магазинами

---

## Критерий «готово» (сквозной сценарий)

1. Продукты яйца, сыр, молоко — все `active`.
2. Рецепт «Омлет» (завтрак) с тремя ингредиентами → утром в блоке «Завтраки» → «Можно сейчас».
3. Сыр `finished` → «Омлет» в «Не хватает: сыр (в списке покупок)».
4. Сыр восстановлен → снова «Можно сейчас».
5. Молоко удалено → «Омлет» в «Нужно поправить».
6. В 11:00 блок «Завтраки» сверху; в 12:30 — «Обеды» сверху, «Завтраки» ниже (можно свернуть).
7. Обед «Суп» (обед) виден в обоих случаях в своём блоке.

---

## Ключевые файлы

| Новые | Изменяемые |
|-------|------------|
| `supabase/migrate-recipes.sql` | `src/App.tsx` |
| `src/types/recipe.ts` | `ROADMAP.md` |
| `src/hooks/useRecipes.ts` | |
| `src/lib/recipeStatus.ts` | |
| `src/lib/recipeMealTime.ts` | |
| `src/components/RecipesView.tsx` | |
| `src/components/RecipeForm.tsx` | |
| `src/components/RecipeDetail.tsx` | |

---

## Порядок работ в соседнем чате

1. Миграция БД
2. Типы + `useRecipes`
3. `recipeStatus.ts` + `recipeMealTime.ts`
4. Навигация в `App.tsx`
5. `RecipesView` (без формы — заглушка)
6. `RecipeForm` + CRUD
7. Группировка по meal_type и порядок по времени
8. Детальный просмотр + «нужно поправить»
9. Полировка

Стартовый промпт: «Реализуй рецепты по RECIPES_IMPLEMENTATION.md».
