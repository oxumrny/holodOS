-- Добавить meal_type к существующей таблице recipes.
-- Выполните, если migrate-recipes.sql уже был применён без meal_type.

alter table recipes
  add column if not exists meal_type text;

update recipes
set meal_type = 'lunch'
where meal_type is null;

alter table recipes
  alter column meal_type set default 'lunch',
  alter column meal_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_meal_type_check'
      and conrelid = 'recipes'::regclass
  ) then
    alter table recipes
      add constraint recipes_meal_type_check
      check (meal_type in ('breakfast', 'lunch'));
  end if;
end $$;

create index if not exists recipes_meal_type_idx on recipes (meal_type);
