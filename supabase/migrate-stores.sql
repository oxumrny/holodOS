-- Миграция для существующей БД (этапы 1–2: магазины + blacklist).
-- Выполните ТОЛЬКО этот файл, если products уже создана.
-- Не копируйте весь schema.sql — там policies для products уже есть.

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
