# Рецепты — обязательные и дополнительные ингредиенты (простая реализация)

Минимальное ТЗ для комбо типа «мясо + гарнир». Делается **поверх** базовых рецепт из [RECIPES_IMPLEMENTATION.md](./RECIPES_IMPLEMENTATION.md) **или** сразу в одной миграции, если рецепты ещё не в коде.

---

## Идея в одном абзаце

Рецепт = **обязательные** продукты (все должны быть в холодосе) + **группы «одно из»** (явный список `product_id` на рецепт, не категория).  
Пример: лук + масло обязательны; группа «Мясо»: курица | говядина; группа «Гарнир»: рис | картофель.  
**Можно готовить**, если все обязательные `active` и в **каждой** группе хотя бы один вариант `active`.

---

## Принципы (минимум)

- Только **явные** `product_id` в группе — **без** матча по категории.
- В v1: всегда **«ровно одно из»** (`min = max = 1`) — не хранить в БД, захардкодить.
- Категория продукта — опционально только как кнопка «набросать список» при редактировании (не в v1).
- Удалённый продукт → рецепт **«Нужно поправить»** (как в базовом ТЗ).
- Без комбинаций-пар (курица только с рисом), без «2 из 3», без граммов.

---

## Этап 1 — База данных

**Файл:** `supabase/migrate-recipe-groups.sql`  
(или включить в `migrate-recipes.sql`, если рецептов ещё нет)

```sql
-- Обязательные ингредиенты
recipe_required_ingredients:
  recipe_id uuid FK → recipes ON DELETE CASCADE
  product_id uuid FK → products ON DELETE SET NULL
  PRIMARY KEY (recipe_id, product_id)

-- Группа «одно из» (на рецепт)
recipe_ingredient_groups:
  id uuid PK
  recipe_id uuid FK → recipes ON DELETE CASCADE
  label text NOT NULL          -- «Мясо», «Гарнир»
  sort_order integer NOT NULL DEFAULT 0

-- Варианты внутри группы
recipe_ingredient_group_options:
  group_id uuid FK → recipe_ingredient_groups ON DELETE CASCADE
  product_id uuid FK → products ON DELETE SET NULL
  PRIMARY KEY (group_id, product_id)
```

**Если уже есть flat `recipe_ingredients`:** миграция данных → все строки в `recipe_required_ingredients`, затем drop старой таблицы.

**Broken при удалении продукта:**
- `ON DELETE SET NULL` на всех `product_id`;
- группа «сломана», если **все** options группы стали `null`;
- рецепт broken, если сломан required **или** хотя бы одна группа.

---

## Этап 2 — Типы

**Файл:** `src/types/recipe.ts` (расширить)

```ts
RecipeRequiredIngredient { recipe_id, product_id, product?: Product | null }

RecipeIngredientGroup {
  id, recipe_id, label, sort_order
  options: RecipeGroupOption[]
}

RecipeGroupOption { group_id, product_id, product?: Product | null }

RecipeFull = Recipe & {
  required: RecipeRequiredIngredient[]
  groups: RecipeIngredientGroup[]
}
```

---

## Этап 3 — Логика готовности

**Файл:** `src/lib/recipeStatus.ts` (расширить или заменить flat-логику)

```ts
function isProductActive(productId: string | null, catalog: Map<string, Product>): boolean
function isProductBroken(productId: string | null, catalog: Map<string, Product>): boolean

// broken
recipeBroken =
  any required.product_id is null
  OR any group has zero non-null options
  OR any required has null product (deleted)

// ready (не broken)
recipeReady =
  every required: product active
  AND every group: at least one option active

// missing (не broken, не ready)
missingRequired = required where not active
missingGroups = groups where no option active
```

**Для списка «Не хватает» показывать:**
- обязательные по имени: «нет: лук»;
- группу одной строкой: «нет мяса» / «нет гарнира» (по `label`), не все 3 вида мяса.

**missingCount** для сортировки «почти готов»:
```
missingRequired.length + missingGroups.length
```

**Опционально (простая полировка):** `getActiveCombinations(recipe)` — декартово произведение active options по группам; в строке рецепта подпись «курица + рис» если одна пара, «3 варианта» если больше. Не обязательно в v1.

---

## Этап 4 — CRUD

**Файл:** `src/hooks/useRecipes.ts`

```ts
createRecipe({
  title, mealType, instructions, cookTimeMinutes,
  requiredProductIds: string[],
  groups: { label: string; productIds: string[] }[],
})

updateRecipe(...) // то же
```

**Сохранение (транзакция или последовательно):**
1. insert/update `recipes`
2. delete + re-insert `recipe_required_ingredients`
3. delete groups for recipe + re-insert groups + options

**Валидация:**
- `title` не пустой;
- `meal_type` задан;
- **либо** ≥1 required, **либо** ≥1 группа с ≥2 options (иначе рецепт бессмысленный);
- каждая группа: `label` не пустой, ≥2 `product_id` (один вариант = лучше в required);
- один `product_id` не дублировать в required и в той же группе.

---

## Этап 5 — Форма рецепта

**Файл:** `src/components/RecipeForm.tsx`

```
Название
Завтрак / Обед
Время, инструкция

── Обязательно ──
  [ multiselect продуктов из каталога ]

── Одно из (группы) ──
  Группа 1:
    Название группы: [ Мясо ]
    Продукты: [ multiselect ]
  [ + Добавить группу ]
  [ × Удалить группу ]

Сохранить
```

- Multiselect — тот же picker, что для flat-ингредиентов (🧊 / 📋, поиск).
- Новая группа по умолчанию: label «Группа 2», пустой список.
- Рецепт только из групп без required — **разрешить** (напр. только «мясо + гарнир» без базы).

---

## Этап 6 — Просмотр и список

**RecipeDetail / строка в RecipesView:**

```
Обязательно
  лук ✅   масло ✅

Мясо (одно из)
  курица ✅   говядина 📋   свинина 📋

Гарнир (одно из)
  рис ✅   картофель 📋
```

**Статус:**
- broken → «Нужно поправить» + указать удалённые слоты;
- ready → «Можно сейчас»;
- missing → «Не хватает: гарнир» (+ обязательные, если есть).

---

## Не делать в v1

- Матч по категории как правило готовности
- `min_pick` / `max_pick` в БД
- Связанные пары ингредиентов
- Кнопка «добавить из категории» (можно позже)
- Отдельные инструкции на каждую комбинацию

---

## Критерий «готово»

1. Рецепт «Мясо с гарниром»: required лук; группа «Мясо» (курица, говядина); группа «Гарнир» (рис, картофель).
2. Лук + курица + рис `active` → **Можно сейчас**.
3. Лук `active`, курица `active`, рис `finished` → **Не хватает: гарнир**.
4. Все мяса `finished`, рис `active` → **Не хватает: мясо**.
5. Удалена курица, говядина и свинина остались → группа жива, статус по оставшимся.
6. Удалены все продукты группы «Мясо» → **Нужно поправить**.

---

## Порядок работ

1. Миграция БД (3 таблицы)
2. Типы + fetch с join
3. `recipeStatus.ts` — required + groups
4. CRUD в `useRecipes`
5. Форма: required + динамические группы
6. Detail + подписи в списке
7. Сквозной сценарий

**Стартовый промпт:** «Реализуй группы ингредиентов рецептов по RECIPES_INGREDIENT_GROUPS.md».

**Зависимость:** базовая вкладка рецептов из [RECIPES_IMPLEMENTATION.md](./RECIPES_IMPLEMENTATION.md).
