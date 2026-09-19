# Архитектура Finora

## Принцип

UI не знает, откуда приходят данные. Банк, классификация и аналитика —
взаимозаменяемые модули за стабильными контрактами. Поэтому замена
демонстрационного банка на настоящий (или правил на локальную AI-модель)
не потребует правок интерфейса и хранилища.

## Конвейер данных

```
BankProvider          Normalizer        TransactionRepository
(MockBankProvider →   (RawOperation →   (локальное состояние,
 TBankProvider)        Transaction)      сохранение, подписки)
      │                     │                     │
      └── fetchHistory()/fetchUpdates()           │
                            │                     │
                     TransactionClassifier        │
                     (RuleBased → LocalAI)        │
                            │                     │
                        Analytics  ───────────────┤
                     (сводки, динамика,           │
                      наблюдения)                 │
                            │                     │
                           UI  ◄──────────────────┘
                  (экраны читают только
                   state + analytics)
```

Поток при подключении банка:
`connectBank()` → `provider.fetchHistory()` → `normalizeAll()` →
`classifyAll()` → `state.txs` → UI перерисовывается.

Поток при синхронизации — то же самое, но `fetchUpdates(after)` и дедупликация по `id`.

## Слои (app/src)

| Слой | Файлы | Отвечает за |
|---|---|---|
| **domain** | `types.ts`, `normalizer.ts`, `classifier.ts`, `analytics.ts` | Типы, формат данных, классификация, расчёты. Не знают про DOM |
| **data** | `bank/providers.ts`, `syncService.ts`, `generator.ts`, `categories.ts` | Источники данных, оркестрация синхронизации, демо-генератор |
| **state** | `app.ts`, `appearance.ts` | Хранилище, сохранение, применение тем |
| **core** | `utils.ts`, `icons.ts`, `charts.ts`, `export.ts` | Форматирование, иконки, SVG-графики, экспорт |
| **ui** | `*.ts` экранов | Рендер строк HTML + навешивание событий. Только presentation |

### Правила зависимостей

- `ui` → может всё читать; изменяет данные только через `state/app.ts` (mutate).
- `state` → домен и данные.
- `domain` → ничего, кроме типов и утилит.
- `data` → домен и состояние. UI не импортирует провайдеры напрямую — только через `syncService`.

## Провайдеры банков

Контракт (`domain/types.ts`):

```ts
interface BankProvider {
  bankId: BankId;
  title: string;
  fetchHistory(): Promise<RawOperation[]>;
  fetchUpdates(after: string): Promise<RawOperation[]>;
}
```

Реализации (`data/bank/providers.ts`):

- **MockBankProvider** — активен. Генерирует 12 месяцев правдоподобных операций
  детерминированным ГПСЧ (одинаковые данные при каждом сбросе демо).
- **TBankProvider** — заготовка с тем же контрактом, кидает понятную ошибку.
  Этап 2: реализация на стороне Rust-ядра (tauri::command) и вызов отсюда.

Подключение реального банка = `export const activeProvider = new TBankProvider()`.
Больше нигде в коде источник не выбирается.

## Классификаторы

Контракт:

```ts
interface TransactionClassifier {
  id: string;
  classify(tx: Transaction): Promise<ClassifyResult>;
  // ClassifyResult { category, confidence 0..1, needsReview, classifiedBy }
}
```

Реализации:

- **RuleBasedClassifier** — активен. Regex-правила по названию/описанию,
  порог «крупный перевод → на разбор» (15 000 ₽). Предсказуем, офлайн, быстрый.
- **LocalAIClassifier** — заготовка (этап 3, Ollama на Mac).
- **RemoteAIClassifier** — заготовка с запретом: кидает ошибку «отключён
  политикой приватности». Ничего не отправляет.

Поле `confidence` уже есть в контракте — для будущих AI-классификаторов.
Операции с `needsReview: true` попадают в экран «Разобрать».

## Состояние и хранение

- `state/app.ts` — единственный мутатор: `mutate(patch)` меняет `AppState`,
  дебаунсом сохраняет в localStorage (прототип) и оповещает подписчиков.
- В финальной версии на это место встаёт локальная БД через Rust-ядро —
  контракт подписки сохраняется.
- Демо-режим: сброс localStorage + перезагрузка (`resetAll`), включается в
  настройках и отключается одной правкой (см. TODO).

## Оболочка Tauri

`app/src-tauri` — стандартный шаблон Tauri 2: окно 1400×880, системное меню,
загрузка собранного `dist/`. Для этапа 2 сюда добавляются команды Rust
(получение выписок, SQLite), а TypeScript вызывает их через `@tauri-apps/api`.

## Демо-данные

`data/generator.ts` — детерминированный генератор: зарплата 5-го числа, аренда
2-го, подписки 1-го, продукты 2–3 раза в неделю, кофе по будням, такси, крупные
покупки по особым датам, «неопознаваемые» платежи для очереди «Разобрать».
Итого ~1000 операций за год. Никаких реальных данных.
