# holodOS iOS 2.0 — ТЗ для агента

Нативное iOS-приложение holodOS как **версия продукта 2.0**.  
Веб-приложение в этом репозитории остаётся источником **доменных правил и схемы Supabase**, не источником UI.

---

## Ветвление (обязательно)

| Что | Правило |
|-----|---------|
| Ветка iOS-разработки | **`cursor/ios-2.0`** (эта ветка) |
| База | `main` |
| Веб-изменения | отдельные PR в `main`, **не** смешивать с iOS-кодом без необходимости |
| Коммиты iOS | только в `cursor/ios-2.0` (или feature-ветки от неё: `cursor/ios-2.0-…`) |
| Схема БД | менять только по явному запросу; iOS и веб делят один Supabase-проект |

Xcode-проект размещать в репозитории, например:

```
ios/
  HolodOS/
    HolodOS.xcodeproj
    …
```

Не коммитить: DerivedData, `.xcuserstate`, секреты с anon key (только `*.example`).

---

## Продуктовая рамка

| | |
|--|--|
| Платформа | iOS 17+, Swift, SwiftUI |
| Backend | существующий Supabase (PostgREST), тот же проект, что у веба |
| Auth | нет (открытый RLS — личный проект) |
| Realtime | нет — pull-to-refresh / появление экрана |
| Язык UI | русский |
| UI Iteration 1 | **дефолтный iOS-стиль** (system List, SF Symbols, NavigationStack, searchable) |
| Кастомный дизайн | **отдельные итерации** по референсам владельца — не сейчас |

Это **не** пиксель-порт веба и **не** Capacitor/WebView. UX можно улучшать по ходу, но крупные UX-правки — **отдельные итерации** после демо.

---

## Переиспользование веба

| Слой | Оценка | Как |
|------|--------|-----|
| Supabase schema / API | ~100% | as-is |
| Доменные правила | ~70% идей | порт в Swift |
| Data CRUD-семантика | ~40% | `ProductService` на supabase-swift |
| UI / CSS | ~0–5% | только смысловые паттерны, не вёрстка |
| **Итого по Iteration 1** | **~30%** | БД + правила; UI пишется заново |

Источники правды в репо:

- [README.md](./README.md) — продукт и поведение
- `src/hooks/useProducts.ts` — CRUD продуктов
- `src/lib/detectCategory.ts` — автокатегории
- `src/types/product.ts` — модель, `CATEGORY_ORDER`
- `supabase/schema.sql` — схема

Игнорировать для UI: `*.css`, React-компоненты, emoji-chrome веба.

---

## Roadmap итераций

| Итерация | Scope | Статус |
|----------|--------|--------|
| **1** | Холодос + список покупок + поиск/add/перенос | done / in progress |
| **2** | **«Отложить» продукт** (`is_paused`) | [PAUSED_PRODUCTS_IMPLEMENTATION.md](./PAUSED_PRODUCTS_IMPLEMENTATION.md) |
| 3+ | UX-правки владельца (отдельные небольшие PR) | по запросу |
| позже | магазины / blacklist / фильтр покупок | |
| позже | настройки продукта / категории | |
| позже | рецепты | |
| позже | кастомный дизайн по референсам | |
| опционально | Auth + RLS для App Store | |

---

# Iteration 1 — Холодос и список покупок

## Цель агента

Собрать нативный каркас приложения и **два рабочих списка** против реальной Supabase-базы, общей с вебом. UI — системный iOS. После демо — стоп; следующие улучшения только по новым ТЗ/чатам.

## Стек

| Решение | Выбор |
|---------|--------|
| Язык | Swift 5.9+ |
| UI | SwiftUI |
| Мин. iOS | 17+ |
| Архитектура | простой MV / MVVM, без оверинжиниринга |
| Клиент | [supabase-swift](https://github.com/supabase/supabase-swift) |
| Секреты | `Secrets.xcconfig` / env (в git — только `Secrets.example.xcconfig`) |
| Навигация | `TabView`: **Холодос** \| **Покупки** (или эквивалент с двумя списками) |

**Запрещено в Iteration 1:** React Native, Capacitor, WebView с веб-фронтом, кастомная бренд-палитра из веба.

---

## Scope

### In scope

1. Xcode-проект в `ios/`, README по запуску.
2. Подключение Supabase (`URL` + `anon key`).
3. Модель `Product` и `ProductService`.
4. Список **В холодосе** (`status = active`).
5. Список **Покупки** (`status = finished`).
6. Поиск по названию в текущем списке.
7. Добавление продукта в **текущий** список.
8. Перенос: холодос → покупки; покупки → холодос.
9. Группировка по категориям (`Section`).
10. Индикатор мастхэва (`is_favorite`) — **только отображение**.
11. Loading / empty / error + pull-to-refresh.
12. Порт `detectCategory` + дефолтный `CATEGORY_ORDER`.

### Out of scope

- Рецепты
- Настройки (CRUD продуктов / магазинов / категорий)
- Фильтр магазина, blacklist / exclusions
- Редактирование и удаление продукта из списка
- Toggle мастхэва
- Кастомный дизайн
- Auth, push, offline-cache, виджеты, App Store listing
- «Заготовки» экранов рецептов/настроек сверх пустой заглушки (лучше не делать)

---

## Данные

### Таблица `products`

| Поле | Тип | Notes |
|------|-----|--------|
| `id` | uuid | |
| `name` | text | хранить **lowercase** |
| `status` | `active` \| `finished` | |
| `category` | text | default `прочее` |
| `is_favorite` | bool | default `false` |
| `created_at` | timestamptz | |
| `finished_at` | timestamptz? | при уходе в `finished`; `null` при restore |

### Запросы (parity с `useProducts.ts`)

| Действие | Поведение |
|----------|-----------|
| Fetch холодос | `status = active`, order `created_at desc` |
| Fetch покупки | `status = finished`, order `finished_at desc` |
| Insert | trim → lowercase; `category = detectCategory(name)`; при `finished` — `finished_at = now()` |
| Дубликат | `ilike` по имени, любой status → ошибка «уже в холодосе / в списке покупок» |
| → покупки | `status = finished`, `finished_at = now()` |
| → холодос | `status = active`, `finished_at = null` |

Кастомный `categoryConfig` / UserDefaults для категорий в Iteration 1 **не обязателен** — дефолтный порядок + detect.

Таблицы `stores`, recipes и exclusions **не использовать**.

---

## Поведение UI

### Добавление

1. Trim → lowercase.
2. Пустое имя → «Введите название продукта».
3. Дубликат → сообщение с локацией существующего продукта.
4. **2.0 UX (разрешено, не блокер):** action «Перейти» / «Перенести сюда» при дубликате.

### Перенос

| Откуда | Действие | Результат |
|--------|----------|-----------|
| Холодос | «Закончилось» | → `finished` |
| Покупки | «Куплено» | → `active` |

После успеха обновить оба списка (или общий кэш).

### Поиск

- Фильтр по подстроке имени (case-insensitive) в текущем списке.
- **2.0 UX (желательно, не блокер):** если пусто здесь, но hit в другом списке — подсказка с переходом.

### Список и категории

- Группировка по `category`, заголовки секций.
- Порядок секций: `CATEGORY_ORDER` из веба; неизвестные — в конце (зафиксировать один вариант в коде и следовать).
- Внутри секции — порядок с сервера.
- Строка: название + индикатор favorite при `true`. Категорию на строке не дублировать.

---

## UI — дефолтный iOS

**Обязательно:**

- System `List` (inset grouped)
- SF Symbols (`refrigerator`, `cart`, `plus`, `checkmark`, …) — **без emoji** как chrome
- Navigation titles: «Холодос», «Покупки»
- `.searchable` (или search в toolbar)
- Swipe actions и/или кнопка переноса — один основной паттерн
- `ContentUnavailableView` / empty states
- `.refreshable`
- Dynamic Type + Dark Mode из системы

**Не делать:**

- цвета из веб-`theme.ts`
- emoji-кнопки 🧊📋
- web-модалки и карточки «ради карточек»

**Минимальные 2.0 UX-улучшения (можно сразу):**

1. Swipe для переноса между списками.
2. Лёгкий haptic на успешный перенос.
3. `@AppStorage` — последняя выбранная вкладка.
4. Alerts только для реальных ошибок / пустого имени (удалений в Iteration 1 нет).

Любые другие UX-идеи — **не внедрять молча**: кратко предложить в summary и ждать approve, либо отдельная итерация.

---

## Структура кода (ориентир)

```
ios/HolodOS/
  App/
    HolodOSApp.swift
    RootTabView.swift
  Features/
    Fridge/
    Shopping/
    SharedProducts/          # row, grouping, search
  Data/
    SupabaseClient.swift
    Product.swift
    ProductService.swift
    CategoryDetector.swift
  Resources/
    Secrets.example.xcconfig
  README.md                  # как задать URL/key и запустить
```

---

## Definition of Done — Iteration 1

- [ ] Проект собирается в Xcode на симуляторе iPhone
- [ ] Подключён реальный Supabase; видны те же продукты, что в вебе
- [ ] Вкладки Холодос / Покупки работают
- [ ] Add / search / move — по правилам выше
- [ ] Категории и detect работают
- [ ] Loading / empty / error / pull-to-refresh
- [ ] Dark Mode и Dynamic Type не ломают UI
- [ ] Нет кода рецептов / настроек / магазинов «на вырост»
- [ ] `ios/…/README.md` с инструкцией запуска
- [ ] В summary: что сделано + что отложено
- [ ] Работа в ветке **`cursor/ios-2.0`** (или от неё)

---

## Процесс работы агента

1. Каркас + `ProductService` + один список end-to-end.
2. Вторая вкладка + переносы + поиск.
3. Не менять веб-код и схему Supabase без явного запроса.
4. Не начинать кастомный дизайн.
5. Коммиты — только если пользователь попросил; push — только по запросу.
6. Крупные UX-правки владельца — **новые итерации**, не раздувать Iteration 1.

---

## Критерий успеха Iteration 1

На симуляторе можно вести холодос и список покупок на общей БД с вебом; UI выглядит как обычное системное iOS-приложение; ветка `cursor/ios-2.0` готова к Iteration 2 (магазины **или** UX-правки **или** настройки — по приоритету владельца).
