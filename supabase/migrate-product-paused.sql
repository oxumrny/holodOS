-- «Отложить» продукт: флаг is_paused (не новый status).
-- Применить в SQL Editor проекта Supabase (общий с вебом).

alter table products
  add column if not exists is_paused boolean not null default false;

create index if not exists products_is_paused_idx
  on products (is_paused)
  where is_paused = true;
