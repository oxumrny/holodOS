-- Исправление recipe_ingredients: product_id должен быть nullable.
--
-- Причина ошибки при удалении продукта:
--   PRIMARY KEY (recipe_id, product_id) неявно делает product_id NOT NULL,
--   поэтому ON DELETE SET NULL падает с
--   "null value in column product_id violates not-null constraint".
--
-- Выполните этот файл в Supabase SQL Editor, если migrate-recipes.sql уже был применён.

alter table recipe_ingredients
  drop constraint if exists recipe_ingredients_pkey;

alter table recipe_ingredients
  add column if not exists id uuid default gen_random_uuid();

update recipe_ingredients
set id = gen_random_uuid()
where id is null;

alter table recipe_ingredients
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_ingredients_pkey'
      and conrelid = 'recipe_ingredients'::regclass
  ) then
    alter table recipe_ingredients
      add constraint recipe_ingredients_pkey primary key (id);
  end if;
end $$;

alter table recipe_ingredients
  alter column product_id drop not null;

alter table recipe_ingredients
  drop constraint if exists recipe_ingredients_product_id_fkey;

alter table recipe_ingredients
  add constraint recipe_ingredients_product_id_fkey
  foreign key (product_id)
  references products(id)
  on delete set null;

create unique index if not exists recipe_ingredients_recipe_product_unique
  on recipe_ingredients (recipe_id, product_id)
  where product_id is not null;
