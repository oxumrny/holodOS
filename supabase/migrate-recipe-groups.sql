-- Мягкая миграция: группы ингредиентов рецептов (этап 1).
-- Выполните ТОЛЬКО этот файл в Supabase SQL Editor.
-- Не копируйте весь schema.sql — policies для products уже есть.
--
-- Что делает:
--   1. Создаёт recipe_required_ingredients, recipe_ingredient_groups,
--      recipe_ingredient_group_options
--   2. Копирует строки из recipe_ingredients → recipe_required_ingredients
--   3. НЕ удаляет recipe_ingredients (старый код продолжит работать)
--
-- После проверки приложения — migrate-recipe-groups-drop-legacy.sql

-- ── Обязательные ингредиенты ────────────────────────────────────────────────

create table if not exists recipe_required_ingredients (
  recipe_id uuid not null references recipes(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  primary key (recipe_id, product_id)
);

create index if not exists recipe_required_ingredients_recipe_idx
  on recipe_required_ingredients (recipe_id);

create index if not exists recipe_required_ingredients_product_idx
  on recipe_required_ingredients (product_id);

alter table recipe_required_ingredients enable row level security;

create policy "Anyone can read recipe_required_ingredients"
  on recipe_required_ingredients for select
  using (true);

create policy "Anyone can insert recipe_required_ingredients"
  on recipe_required_ingredients for insert
  with check (true);

create policy "Anyone can update recipe_required_ingredients"
  on recipe_required_ingredients for update
  using (true);

create policy "Anyone can delete recipe_required_ingredients"
  on recipe_required_ingredients for delete
  using (true);

-- ── Группы «одно из» ──────────────────────────────────────────────────────

create table if not exists recipe_ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  sort_order integer not null default 0
);

create index if not exists recipe_ingredient_groups_recipe_idx
  on recipe_ingredient_groups (recipe_id);

alter table recipe_ingredient_groups enable row level security;

create policy "Anyone can read recipe_ingredient_groups"
  on recipe_ingredient_groups for select
  using (true);

create policy "Anyone can insert recipe_ingredient_groups"
  on recipe_ingredient_groups for insert
  with check (true);

create policy "Anyone can update recipe_ingredient_groups"
  on recipe_ingredient_groups for update
  using (true);

create policy "Anyone can delete recipe_ingredient_groups"
  on recipe_ingredient_groups for delete
  using (true);

-- ── Варианты внутри группы ──────────────────────────────────────────────────

create table if not exists recipe_ingredient_group_options (
  group_id uuid not null references recipe_ingredient_groups(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  primary key (group_id, product_id)
);

create index if not exists recipe_ingredient_group_options_product_idx
  on recipe_ingredient_group_options (product_id);

alter table recipe_ingredient_group_options enable row level security;

create policy "Anyone can read recipe_ingredient_group_options"
  on recipe_ingredient_group_options for select
  using (true);

create policy "Anyone can insert recipe_ingredient_group_options"
  on recipe_ingredient_group_options for insert
  with check (true);

create policy "Anyone can update recipe_ingredient_group_options"
  on recipe_ingredient_group_options for update
  using (true);

create policy "Anyone can delete recipe_ingredient_group_options"
  on recipe_ingredient_group_options for delete
  using (true);

-- ── Перенос данных из recipe_ingredients ────────────────────────────────────
-- Строки с product_id = null (удалённый продукт) не копируем: в новой таблице
-- PK (recipe_id, product_id) не допускает null в product_id.
-- Такие «сломанные» слоты останутся только в recipe_ingredients до этапа 6.

insert into recipe_required_ingredients (recipe_id, product_id)
select distinct recipe_id, product_id
from recipe_ingredients
where product_id is not null
on conflict (recipe_id, product_id) do nothing;
