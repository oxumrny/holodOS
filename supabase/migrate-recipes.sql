-- Миграция для существующей БД: рецепты и ингредиенты.
-- Выполните ТОЛЬКО этот файл, если products уже создана.
-- Не копируйте весь schema.sql — там policies для products уже есть.

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  instructions text not null default '',
  cook_time_minutes integer not null default 0 check (cook_time_minutes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists recipes_sort_order_idx on recipes (sort_order);
create index if not exists recipes_created_at_idx on recipes (created_at desc);

alter table recipes enable row level security;

create policy "Anyone can read recipes"
  on recipes for select
  using (true);

create policy "Anyone can insert recipes"
  on recipes for insert
  with check (true);

create policy "Anyone can update recipes"
  on recipes for update
  using (true);

create policy "Anyone can delete recipes"
  on recipes for delete
  using (true);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  product_id uuid references products(id) on delete set null
);

create unique index if not exists recipe_ingredients_recipe_product_unique
  on recipe_ingredients (recipe_id, product_id)
  where product_id is not null;

create index if not exists recipe_ingredients_recipe_idx
  on recipe_ingredients (recipe_id);

create index if not exists recipe_ingredients_product_idx
  on recipe_ingredients (product_id);

alter table recipe_ingredients enable row level security;

create policy "Anyone can read recipe_ingredients"
  on recipe_ingredients for select
  using (true);

create policy "Anyone can insert recipe_ingredients"
  on recipe_ingredients for insert
  with check (true);

create policy "Anyone can update recipe_ingredients"
  on recipe_ingredients for update
  using (true);

create policy "Anyone can delete recipe_ingredients"
  on recipe_ingredients for delete
  using (true);
