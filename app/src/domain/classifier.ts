/* ============================================================
   Finora — классификатор операций.

   Интерфейс TransactionClassifier един для всех реализаций:
     • RuleBasedClassifier  — правила по названию (сейчас),
     • LocalAIClassifier    — локальная модель (этап 2),
     • RemoteAIClassifier   — облачная модель, ВЫКЛЮЧЕНА
                             по умолчанию и навсегда до явного
                             согласия пользователя.
   Замена классификатора не требует правок UI и хранилища.
   ============================================================ */

import type { Transaction } from './types';
import { sleep } from '../core/utils';

export interface ClassifyResult {
  category: string;
  confidence: number;
  needsReview: boolean;
  classifiedBy: string;
}

export interface TransactionClassifier {
  readonly id: string;
  readonly title: string;
  classify(tx: Transaction): Promise<ClassifyResult>;
}

interface Rule { cats: string[]; test: RegExp; income?: boolean }

/** Правила по строке операции. Порядок важен: частые — выше. */
const RULES: Rule[] = [
  // Доходы
  { cats: ['зарплата', 'заработная плата', 'премия'], test: /зарплат|преми/i, income: true },
  { cats: [], test: /интех групп/i, income: true },
  { cats: [], test: /лебедева|фриланс|дизайн интерфейсов/i, income: true },
  { cats: [], test: /кэшбэк/i, income: true },
  { cats: [], test: /возврат|refund/i, income: true },
  { cats: [], test: /проценты на остаток/i, income: true },
  { cats: [], test: /налогового вычета/i, income: true },
  // Продукты
  { cats: [], test: /пятёрочк|вкусвилл|магнит|лента|лавк|самокат|перекрёст|ашан|оке|метро маркет|продукт/i },
  // Кафе
  { cats: [], test: /cofix|шоколадниц|кофе|теремок|вкусно — и точка|додо|тануки|лосос|пхали|farsh|столовая|шаурм|shaurma|бургер|пицц|ресторан|кафе|ужин|обед/i },
  // Транспорт
  { cats: [], test: /яндекс go|тройк|метро|ситидрайв|ржд|аэрофлот|поездк|банкомат т|такси/i },
  // Жильё
  { cats: [], test: /жку|аренда|ростелеком|мтс|домашний интернет|ковалёва/i },
  // Здоровье
  { cats: [], test: /горздрав|апрель|ригла|аптек|дентал|фэнтези|x-fit|фитнес|клиник|стоматолог/i },
  // Развлечения
  { cats: [], test: /каро|кино|steam|мосигр|настол|боулинг|квест/i },
  // Подписки
  { cats: [], test: /яндекс плюс|кинопоиск|icloud|apple|figma|подписк|notion|spotify|дзен/i },
  // Одежда
  { cats: [], test: /lamoda|спортмастер|zara|h&m|глирия|ferrari style|бершк|reserved|одежд/i },
  // Техника
  { cats: [], test: /dns|м\.видео|эльдорадо|техник|cyber|мозг/i },
  // Образование
  { cats: [], test: /хекслет|skyeng|учеб|курс|читай-город|литрес|книг|школ|универ|образован/i },
  // Путешествия
  { cats: [], test: /островок|ostrovok|отель|билет|авиа|ржд|туr|путешеств|booking/i },
  // Подарки
  { cats: [], test: /золотое яблоко|цветочн|подарок|подарки/i },
  // Маркетплейсы и прочее
  { cats: [], test: /ozon|wildberr|маркетплейс|алиэкспресс/i },
];

const CATEGORY_OF_RULE: string[] = [
  'salary', 'salary', 'freelance', 'cashback', 'refund', 'interest', 'income_other',
  'groceries', 'dining', 'transport', 'housing', 'health', 'fun', 'subscriptions',
  'clothing', 'tech', 'education', 'travel', 'gifts', 'other',
];

/** Порог суммы перевода, после которого спрашиваем пользователя */
export const LARGE_TRANSFER = 15_000;

/** Правила: быстро, предсказуемо, работает офлайн */
export class RuleBasedClassifier implements TransactionClassifier {
  readonly id = 'rules';
  readonly title = 'Правила по названию операции';

  async classify(tx: Transaction): Promise<ClassifyResult> {
    await sleep(0); // единый асинхронный контракт с AI-классификаторами
    const s = `${tx.merchant} ${tx.description}`;

    // Внутренние переводы между счетами не требуют категории расходов
    if (tx.internal) {
      return { category: 'transfers', confidence: 1, needsReview: false, classifiedBy: this.id };
    }

    // Внешние переводы: крупные — на разбор, мелкие — в «Переводы»
    if (tx.type === 'transfer') {
      if (tx.amount >= LARGE_TRANSFER) {
        return { category: 'transfers', confidence: 0.4, needsReview: true, classifiedBy: this.id };
      }
      return { category: 'transfers', confidence: 0.9, needsReview: false, classifiedBy: this.id };
    }

    if (tx.type === 'income') {
      for (let i = 0; i < RULES.length; i++) {
        if (RULES[i].income && RULES[i].test.test(s)) {
          return { category: CATEGORY_OF_RULE[i], confidence: 0.95, needsReview: false, classifiedBy: this.id };
        }
      }
      return { category: 'income_other', confidence: 0.5, needsReview: tx.amount >= 20_000, classifiedBy: this.id };
    }

    // Расходы
    for (let i = 0; i < RULES.length; i++) {
      if (!RULES[i].income && RULES[i].test.test(s)) {
        return { category: CATEGORY_OF_RULE[i], confidence: 0.92, needsReview: false, classifiedBy: this.id };
      }
    }
    return { category: 'uncategorized', confidence: 0.2, needsReview: true, classifiedBy: this.id };
  }
}

/** Локальная модель (этап 2): запускается на компьютере пользователя */
export class LocalAIClassifier implements TransactionClassifier {
  readonly id = 'local-ai';
  readonly title = 'Локальная AI-модель (этап 2)';
  async classify(_tx: Transaction): Promise<ClassifyResult> {
    throw new Error('LocalAIClassifier: модель будет подключена на этапе 2');
  }
}

/** Облачная модель. По умолчанию выключена — принцип privacy-first. */
export class RemoteAIClassifier implements TransactionClassifier {
  readonly id = 'remote-ai';
  readonly title = 'Облачная AI-модель (выключена)';
  async classify(_tx: Transaction): Promise<ClassifyResult> {
    throw new Error('RemoteAIClassifier: отключён политикой приватности');
  }
}

/** Активный классификатор. Замена — в одном месте. */
export const activeClassifier: TransactionClassifier = new RuleBasedClassifier();

export async function classifyAll(txs: Transaction[]): Promise<Transaction[]> {
  // операции независимы — классифицируем параллельно
  const results = await Promise.all(txs.map((tx) => activeClassifier.classify(tx)));
  return txs.map((tx, i) => ({ ...tx, category: results[i].category, needsReview: results[i].needsReview }));
}
