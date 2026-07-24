# holodOS iOS

Нативное iOS-приложение (Iteration 1). Backend — тот же Supabase, что у веб-приложения.

## Требования

- macOS с Xcode 15+
- iOS Simulator (iOS 17+)
- URL и anon key проекта Supabase (из корневого `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Настройка секретов

```bash
cd ios/HolodOS
cp Configs/Secrets.example.xcconfig Configs/Secrets.xcconfig
```

Откройте `Configs/Secrets.xcconfig` и подставьте значения:

```
SLASH = /
SUPABASE_URL = https:$(SLASH)$(SLASH)YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY = your-anon-key
```

`Secrets.xcconfig` в git не коммитится.

URL и anon key подставляются в `HolodOS/Info.plist` при сборке (`$(SUPABASE_URL)`, `$(SUPABASE_ANON_KEY)`).

## Запуск

1. Убедитесь, что есть `Configs/Secrets.xcconfig` (см. выше).
2. Откройте `ios/HolodOS/HolodOS.xcodeproj` в Xcode.
3. Дождитесь разрешения Swift-пакета `supabase-swift` (File → Packages → Resolve Package Versions при необходимости).
4. Выберите симулятор iPhone.
5. Product → Run (⌘R).

Стартовая вкладка — **Покупки** (`status = finished`). **Холодос** — `status = active`.

### Iteration 1 (шаг 2)

- Добавление: кнопка `+` в toolbar
- Перенос: swipe «Куплено» / «Закончилось»
- Отложить (Покупки): long press → «Отложить»; секция «Отложено» → swipe «Вернуть»
- Поиск, pull-to-refresh, категории, индикатор мастхэва

## Структура

```
HolodOS/
  App/                 # точка входа, TabView
  Features/
    Shopping/          # вкладка покупок
    Fridge/            # вкладка холодоса
    SharedProducts/    # общий список, store, row, группировка
  Data/                # Product, ProductService, CategoryDetector, Supabase
Configs/               # xcconfig + Secrets.example
```
