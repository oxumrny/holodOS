create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'finished')),
  category text not null default 'прочее',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Если таблица уже создана раньше, выполните отдельно:
-- alter table products add column if not exists category text not null default 'прочее';
-- alter table products add column if not exists is_favorite boolean not null default false;

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
