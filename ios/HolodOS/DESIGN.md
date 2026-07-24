# holodOS — Design System (iOS)

Краткая спецификация UI, разработанного для нативного приложения. Только **светлая тема** на уровне системы; холодос использует тёмную **поверхность списка**, не отдельную color scheme ОС.

Исходники: `HolodOS/Design/`, `HolodOS/Features/SharedProducts/`.

---

## Палитра

### Основная (UI приложения)

| Токен | HEX | Назначение |
|-------|-----|------------|
| **Mine Shaft** | `#2D2D2D` | Тёмный текст, тёмные поверхности |
| **White Rock** | `#EAE0D2` | Светлый фон |
| **Akaroa** | `#D7C9AE` | Рамки полей, акценты второго порядка |
| **Barley Corn** | `#A68763` | Акценты: `+`, звезда, каретка поиска (покупки), ошибки |

### Swipe и прогресс (отдельно от основной палитры)

| Токен | HEX | Назначение |
|-------|-----|------------|
| **Oceanic** | `#003F47` | Swipe покупок / отложено; **заполненные** точки прогресс-бара |
| **Oceanic Light** | `#E6F1F2` | Иконки на Oceanic |
| **Nectarine** | `#FFBD76` | Swipe холодоса; каретка поиска (холодос) |
| **Nectarine Dark** | `#4A3020` | Иконки на Nectarine |
| **Progress Dot** | `#F8F3EC` | **Незаполненные** точки прогресс-бара (светлее White Rock) |

Swift: `Color.holod*` в `HolodTheme.swift`.

---

## Скругления

| Токен | pt | Где |
|-------|-----|-----|
| `HolodCornerRadius.container` | 4 | Контейнер таб-бара |
| `HolodCornerRadius.control` | 2 | Вкладки таб-бара, swipe-кнопки, прогресс-бар, sheet, primary-кнопки |

Без скруглений: разделители, рамки полей ввода, swipe-область строки.

---

## Типографика

- Шрифт: **Nunito** (variable, `Resources/Fonts/Nunito-Variable.ttf`, Cyrillic OK).
- Регистрация: `Info.plist` → `UIAppFonts`; `HolodFontSetup.apply()` при старте.

| Стиль | Font | Размер |
|-------|------|--------|
| `.holodBody` | Nunito-Regular | 17 |
| `.holodBodyMedium` | Nunito-Medium | 17 |
| `.holodSubheadline` | Nunito-Regular | 15 |
| `.holodCaption` | Nunito-Regular | 12 |
| `.holodCaptionMedium` | Nunito-Medium | 12 |
| `.holodCaption2Semibold` | Nunito-SemiBold | 11 |

Dynamic Type: через `UIFontMetrics`.

---

## Две темы списка — `HolodListAppearance`

Передаётся через `@Environment(\.holodListAppearance)`.

| | Покупки `.shopping` | Холодос `.fridge` |
|---|---------------------|-------------------|
| Фон | White Rock | Mine Shaft |
| Текст | Mine Shaft | White Rock |
| Placeholder поиска | Mine Shaft 52% | White Rock 52% |
| Каретка поиска | Barley Corn | Nectarine |

Фон списков: `.holodPaperBackground(_)` — цвет + paper grain overlay (~4.2% opacity, blend overlay).

---

## Layout списка

- **Без** `.insetGrouped`, без navigation title, без чекбоксов.
- Плоский `List` + `.plain`, фон строк = `appearance.background`.
- Горизонтальные отступы строк: **20 pt**.
- Вертикальный padding строки: **5 pt** (`HolodListMetrics.rowVerticalPadding`).
- Разделители: 1 pt, только под поиском и между секциями категорий.
- Sticky-шапка: поиск + divider (+ прогресс на покупках) не скроллятся.

### Строка поиска (`HolodSearchMetrics`)

- Padding horizontal: 20, vertical: 12, spacing: 12.
- Слева: `magnifyingglass`, центр: `TextField`, справа: `+` (32×32, Barley Corn).
- Закрытие sheet добавления — тап вне sheet или свайп вниз.

### Прогресс покупок

- Только вкладка **Покупки** (`showsShoppingProgress`).
- Под divider поиска, отступы **8 pt** сверху и снизу.
- Ширина = между иконками лупы и `+` (как поле поиска).
- Высота бара: **14 pt**; точки 1.5 pt, шаг 3 pt.
- Заполнение: Oceanic-точки; фон: светлые точки (`holodProgressDot`).
- Логика: `куплено сегодня / (куплено + осталось)`; сессия до **полуночи** (`ShoppingProgressStorage`).

### Секции категорий

- Заголовок: uppercase caption, collapsible chevron.
- **Покупки:** свёрнуты по умолчанию; разворот хранится в `ProductsStore.shoppingExpandedSectionIDs` до конца сессии.
- **Холодос:** развёрнуты по умолчанию.
- **«Отложено»:** свёрнуто по умолчанию.

---

## Tab bar — `HolodTabBar`

- Плавающий, по центру, max width **168 pt**, bottom inset **12 pt**.
- Segmented pill: контейнер инвертируется при смене вкладки.
  - Покупки активны: контейнер Mine Shaft, pill White Rock.
  - Холодос активен: контейнер White Rock, pill Mine Shaft.
- `RootTabView`: фон под таб-баром = фон активной вкладки.

---

## Swipe — `HolodEdgeSwipe`

Кастомный жест с края, **не** системный `swipeActions`.

| Контекст | Направление | Фон | Иконка |
|----------|-------------|-----|--------|
| Покупки | leading (→) | Oceanic | `checkmark` |
| Холодос | trailing (←) | Nectarine | `circle` |
| Отложено | leading | Oceanic | `arrow.uturn.backward` |

- Кнопка: квадрат, скругление **2 pt**, высота = высота строки / 1.5.
- Зазор между кнопкой и текстом строки: **10 pt**.

---

## Компоненты

| Комponent | Файл | Назначение |
|-----------|------|------------|
| `HolodDivider` | HolodTheme | 1 pt линия из appearance |
| `HolodPlaceholderView` | HolodPlaceholderView | Пустой список, ошибка, нет результатов |
| `HolodLoadingView` | HolodPlaceholderView | Загрузка |
| `HolodErrorBanner` | HolodErrorBanner | Ошибки действий (верх экрана) |
| `HolodFilledButton` | HolodFilledButton | Primary CTA (pill таб-бара) |
| `HolodShoppingProgressBar` | HolodShoppingProgressBar | Stipple progress bar |
| `AddProductSheet` | AddProductSheet | Sheet добавления продукта |
| `CollapsibleSectionHeader` | CollapsibleSectionHeader | Заголовок секции |
| `ProductRowView` | ProductRowView | Строка продукта + звезда мастхэва |

### Sheet «Новый продукт»

- `presentationCornerRadius`: 2 pt, drag indicator скрыт.
- Заголовок слева, без кнопки отмены.
- Поле: прямоугольная рамка (Akaroa / White Rock 25%).
- Кнопка «Добавить»: `HolodFilledButton.primary` под полем.

---

## Поведение (UX)

- **Отложить:** context menu на покупках и холодосе; секция «Отложено» на обеих вкладках.
- **Pull-to-refresh** на списках.
- Haptic success при swipe / pause / resume.
- `.preferredColorScheme`: light (покупки), dark (холодос) — для status bar и системных контролов на тёмном списке.

---

## Чего нет (намеренно)

- Системный `ContentUnavailableView`, `.insetGrouped`, navigation titles в списках.
- Oceanic/Nectarine как основной фон приложения (только swipe + progress fill).
- Checkboxes в строках.
- Тёмная тема ОС глобально.

---

## Быстрая карта файлов

```
Design/
  HolodTheme.swift           — цвета, appearance, grain, metrics
  HolodTypography.swift      — Nunito
  HolodTabBar.swift          — таб-бар
  HolodShoppingProgressBar.swift
  HolodFilledButton.swift
  HolodPlaceholderView.swift
  HolodErrorBanner.swift
Features/SharedProducts/
  ProductListView.swift      — список, поиск, прогресс, states
  HolodEdgeSwipe.swift       — swipe
  AddProductSheet.swift
  ProductRowView.swift
  CollapsibleSectionHeader.swift
  PausedProductsSection.swift
Features/Shopping/
  ShoppingProgressTracker.swift — сессия прогресса до полуночи
```
