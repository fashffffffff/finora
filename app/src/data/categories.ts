/* ============================================================
   Finora — каталог категорий
   ============================================================ */

import type { Category, CategoryKind } from '../domain/types';

const c = (id: string, name: string, kind: CategoryKind, color: string, icon: string): Category =>
  ({ id, name, kind, color, icon });

/** Базовый набор. kind: expense — расход, income — доход, service — служебная */
export const BASE_CATEGORIES: Category[] = [
  // Расходы
  c('groceries', 'Продукты', 'expense', '#61a862', 'cart'),
  c('dining', 'Кафе и рестораны', 'expense', '#de7e66', 'cup'),
  c('transport', 'Транспорт', 'expense', '#7186d8', 'transport'),
  c('housing', 'Жильё и ЖКХ', 'expense', '#c9a25c', 'home'),
  c('health', 'Здоровье', 'expense', '#cb7a93', 'heart'),
  c('fun', 'Развлечения', 'expense', '#b085cb', 'tv'),
  c('subscriptions', 'Подписки', 'expense', '#4fb8a8', 'repeat'),
  c('clothing', 'Одежда', 'expense', '#b08960', 'shirt'),
  c('tech', 'Техника', 'expense', '#7f9ba9', 'laptop'),
  c('education', 'Образование', 'expense', '#9cab55', 'education'),
  c('travel', 'Путешествия', 'expense', '#45a6c9', 'travel'),
  c('gifts', 'Подарки', 'expense', '#c95b7e', 'gift'),
  c('other', 'Прочее', 'expense', '#8b939b', 'box'),
  // Доходы
  c('salary', 'Зарплата', 'income', '#4cc38a', 'briefcase'),
  c('freelance', 'Подработка', 'income', '#47b692', 'laptop'),
  c('cashback', 'Кэшбэк', 'income', '#8fc93a', 'percent'),
  c('refund', 'Возвраты', 'income', '#a5cf7f', 'refund'),
  c('interest', 'Проценты', 'income', '#b5c95c', 'trending'),
  c('income_other', 'Прочий доход', 'income', '#86c5a8', 'plusCircle'),
  // Служебные
  c('transfers', 'Переводы', 'service', '#93a1ad', 'swap'),
  c('uncategorized', 'Не определено', 'service', '#707880', 'question'),
];

/** Быстрые варианты для экрана «Разобрать» */
export const REVIEW_SUGGESTIONS = [
  'groceries', 'dining', 'transport', 'housing', 'education', 'tech', 'gifts', 'travel', 'other',
];

export function categoryMap(cats: Category[]): Map<string, Category> {
  return new Map(cats.map((x) => [x.id, x]));
}

export function catById(cats: Category[], id: string): Category {
  return cats.find((x) => x.id === id) ?? { id: 'other', name: 'Прочее', kind: 'expense', color: '#8b939b', icon: 'box' };
}
