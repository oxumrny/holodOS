create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'finished')),
  category text not null default 'прочее',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Если таблица products уже создана, НЕ выполняйте весь этот файл повторно.
-- Для магазинов и blacklist используйте: supabase/migrate-stores.sql

create index if not exists products_status_idx on products (status);
create index if not exists products_finished_at_idx on products (finished_at desc nulls last);
create index if not exists products_is_favorite_idx on products (is_favorite) where is_favorite = true;

alter table products enable row level security;

create policy "Anyone can read products"
  on products for select
  using (true);

create policy "Anyone can insert products"
  on products for insert
  with check (true);

create policy "Anyone can update products"
  on products for update
  using (true);

create policy "Anyone can delete products"
  on products for delete
  using (true);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stores_sort_order_idx on stores (sort_order);

alter table stores enable row level security;

create policy "Anyone can read stores"
  on stores for select
  using (true);

create policy "Anyone can insert stores"
  on stores for insert
  with check (true);

create policy "Anyone can update stores"
  on stores for update
  using (true);

create policy "Anyone can delete stores"
  on stores for delete
  using (true);

create table if not exists product_store_exclusions (
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  primary key (product_id, store_id)
);

create index if not exists product_store_exclusions_store_idx
  on product_store_exclusions (store_id);

alter table product_store_exclusions enable row level security;

create policy "Anyone can read product_store_exclusions"
  on product_store_exclusions for select
  using (true);

create policy "Anyone can insert product_store_exclusions"
  on product_store_exclusions for insert
  with check (true);

create policy "Anyone can delete product_store_exclusions"
  on product_store_exclusions for delete
  using (true);

-- Рецепты: для новой БД включены сразу.
-- Если products уже создана отдельно — migrate-recipes.sql (+ fix-null при необходимости).

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
