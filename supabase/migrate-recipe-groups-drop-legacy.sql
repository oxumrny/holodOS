-- Финальный шаг миграции групп ингредиентов (этап 7).
-- Выполните в Supabase SQL Editor ПОСЛЕ проверки приложения.
--
-- Перед запуском:
--   1. Выполнен migrate-recipe-groups.sql
--   2. Приложение обновлено (этапы 2–6)
--   3. Рецепты создаются/редактируются через новую форму
--
-- Проверка (таблица legacy ещё на месте):
--   select count(*) from recipe_ingredients;
--   select count(*) from recipe_required_ingredients;
--
-- После Run — recipe_ingredients больше не существует:
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name like 'recipe_%'
--   order by table_name;

drop table if exists recipe_ingredients;
