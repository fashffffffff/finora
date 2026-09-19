/* ============================================================
   Finora — аналитика. Чистые функции над списком операций.
   Здесь нет UI и нет обращения к хранилищу.
   ============================================================ */

import type { Transaction } from './types';
import { START_BALANCE } from '../data/generator';
import { inRange, monthKey, monthShort, type DateRange } from '../core/utils';

export interface Summary {
  income: number;
  expense: number;
  net: number;
  transfersOut: number;
  count: number;
  byCategory: { id: string; total: number; count: number }[];
}

export function summarize(txs: Transaction[]): Summary {
  let income = 0, expense = 0, transfersOut = 0;
  const byCat = new Map<string, { total: number; count: number }>();

  for (const t of txs) {
    if (t.internal) continue;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') {
      expense += t.amount;
      const c = byCat.get(t.category) ?? { total: 0, count: 0 };
      c.total += t.amount; c.count++;
      byCat.set(t.category, c);
    } else {
      // внешние переводы: исходящие — трата, входящие — не доход и не расход
      if (t.direction === 'out') transfersOut += t.amount;
    }
  }
  const list = [...byCat.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total);
  return { income, expense, net: income - expense, transfersOut, count: txs.length, byCategory: list };
}

/** Текущий общий баланс (включая накопительный счёт) */
export function balance(txs: Transaction[]): number {
  let b = START_BALANCE;
  for (const t of txs) {
    if (t.internal) continue;
    b += t.direction === 'in' ? t.amount : -t.amount;
  }
  return b;
}

export function inRangeTxs(txs: Transaction[], r: DateRange): Transaction[] {
  return txs.filter((t) => inRange(t.date, r));
}

export interface MonthPoint { key: string; label: string; income: number; expense: number }

export function monthlySeries(txs: Transaction[], months: number): MonthPoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const byKey = new Map<string, MonthPoint>(keys.map((k) => [k, { key: k, label: monthShort(Number(k.slice(5, 7)) - 1), income: 0, expense: 0 }]));
  for (const t of txs) {
    if (t.internal) continue;
    const p = byKey.get(monthKey(t.date));
    if (!p) continue;
    if (t.type === 'income') p.income += t.amount;
    else if (t.type === 'expense') p.expense += t.amount;
  }
  return keys.map((k) => byKey.get(k)!);
}

/** Ежедневный баланс для спарклайна */
export function balanceSeries(txs: Transaction[], r: DateRange): { x: string; v: number }[] {
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? -1 : 1));
  const startBalance = (() => {
    let b = START_BALANCE;
    for (const t of sorted) {
      if (t.date.slice(0, 10) >= r.from) break;
      if (t.internal) continue;
      b += t.type === 'income' ? t.amount : -t.amount;
    }
    return b;
  })();

  const days = Math.max(1, Math.round((new Date(r.to).getTime() - new Date(r.from).getTime()) / 86400000) + 1);
  const step = Math.max(1, Math.floor(days / 60)); // не более ~60 точек
  const deltas = new Map<string, number>();
  for (const t of sorted) {
    if (t.internal) continue;
    if (!inRange(t.date, r)) continue;
    const d = t.date.slice(0, 10);
    deltas.set(d, (deltas.get(d) ?? 0) + (t.direction === 'in' ? t.amount : -t.amount));
  }

  const pts: { x: string; v: number }[] = [];
  let v = startBalance;
  const cur = new Date(r.from);
  let i = 0;
  while (cur <= new Date(r.to) && pts.length < 90) {
    const iso = cur.toISOString().slice(0, 10);
    v += deltas.get(iso) ?? 0;
    if (i % step === 0) pts.push({ x: iso, v });
    cur.setDate(cur.getDate() + 1);
    i++;
  }
  if (pts.length === 0) pts.push({ x: r.to, v: balance(txs) });
  return pts;
}

/** Дельта значения в процентах */
export function deltaPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export interface Insight { icon: string; title: string; text: string; tone: 'neutral' | 'good' | 'warn' }

/** Заметки о привычках. Сейчас — правила; в будущем подключится локальный ИИ */
export function insights(txs: Transaction[]): Insight[] {
  const out: Insight[] = [];
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevKey = `${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)}`;

  const cur = txs.filter((t) => monthKey(t.date) === curKey && !t.internal);
  const prev = txs.filter((t) => monthKey(t.date) === prevKey && !t.internal);
  const sCur = summarize(cur);
  const sPrev = summarize(prev);

  // 1. Свободные деньги
  if (sCur.income > 0) {
    const free = sCur.income - sCur.expense;
    const share = Math.round((free / sCur.income) * 100);
    out.push({
      icon: free >= 0 ? 'trending' : 'alert',
      title: free >= 0 ? `Свободно ${Math.round(free).toLocaleString('ru-RU')} ₽` : `Расходы выше доходов на ${Math.round(-free).toLocaleString('ru-RU')} ₽`,
      text: free >= 0
        ? `В этом месяце вы отложили ${share}% заработанного${sPrev.net > 0 ? ` (в прошлом — ${Math.round((sPrev.net / Math.max(1, sPrev.income)) * 100)}%)` : ''}.`
        : 'Проверите крупные траты этого месяца — возможно, часть из них разовые.',
      tone: free >= 0 ? 'good' : 'warn',
    });
  }

  // 2. Подписки
  const subs = cur.filter((t) => t.category === 'subscriptions');
  if (subs.length >= 2) {
    const total = subs.reduce((s, t) => s + t.amount, 0);
    const names = [...new Set(subs.map((t) => t.merchant))].slice(0, 4).join(', ');
    out.push({
      icon: 'repeat',
      title: `Подписки: ${Math.round(total).toLocaleString('ru-RU')} ₽/мес`,
      text: `${subs.length} списаний — ${names}. За год это ${Math.round(total * 12).toLocaleString('ru-RU')} ₽.`,
      tone: 'neutral',
    });
  }

  // 3. Самая растущая категория
  const growth = sCur.byCategory
    .map((c) => {
      const p = sPrev.byCategory.find((x) => x.id === c.id)?.total ?? 0;
      return { ...c, d: c.total - p, p };
    })
    .filter((c) => c.d > 2000 && c.p > 0)
    .sort((a, b) => b.d - a.d)[0];
  if (growth) {
    out.push({
      icon: 'trending',
      title: 'Категория растёт',
      text: `Расходы в категории «${growth.id}» выросли на ${Math.round(growth.d).toLocaleString('ru-RU')} ₽ к прошлому месяцу.`,
      tone: 'warn',
    });
  }

  // 4. Траты в выходные
  const weekend = cur.filter((t) => t.type === 'expense' && [0, 6].includes(new Date(t.date).getDay()));
  if (weekend.length >= 3) {
    const wSum = weekend.reduce((s, t) => s + t.amount, 0);
    const share = Math.round((wSum / Math.max(1, sCur.expense)) * 100);
    out.push({
      icon: 'calendar',
      title: `Выходные — ${share}% трат`,
      text: `${weekend.length} покупок на ${Math.round(wSum).toLocaleString('ru-RU')} ₽ пришлись на субботу и воскресенье.`,
      tone: 'neutral',
    });
  }

  // 5. Средний чек продуктов
  const groc = cur.filter((t) => t.category === 'groceries');
  if (groc.length >= 4) {
    const avg = groc.reduce((s, t) => s + t.amount, 0) / groc.length;
    out.push({
      icon: 'cart',
      title: `Средний чек в магазинах — ${Math.round(avg).toLocaleString('ru-RU')} ₽`,
      text: `${groc.length} покупок за месяц. Доставка — ${groc.filter((t) => /лавк|самокат/i.test(t.merchant)).length} из них.`,
      tone: 'neutral',
    });
  }

  return out.slice(0, 5);
}
