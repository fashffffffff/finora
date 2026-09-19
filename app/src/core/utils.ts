/* ============================================================
   Finora — утилиты форматирования и мелкие помощники
   ============================================================ */

export const uid = (p = 'id'): string =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Детерминированный ГПСЧ — демо-данные всегда одинаковые */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rnd = (r: () => number, min: number, max: number): number => min + r() * (max - min);
export const rndInt = (r: () => number, min: number, max: number): number => Math.floor(rnd(r, min, max + 1));
export const pick = <T>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
export const chance = (r: () => number, p: number): boolean => r() < p;

/** Деньги: 84 320,50 ₽ */
const moneyFmt = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export function money(v: number, withSign = false, withCurrency = false): string {
  const s = moneyFmt.format(Math.abs(v)).replace(',', ',');
  const sign = v < 0 ? '−' : withSign && v > 0 ? '+' : '';
  return `${sign}${s}${withCurrency ? ' ₽' : ''}`;
}

/** Компактные деньги для подписей: 84,3 тыс. ₽ */
export function moneyShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')} млн ₽`;
  if (abs >= 10_000) return `${Math.round(v / 1000)} тыс. ₽`;
  return money(v, false, true);
}

export const pct = (v: number): string =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1).replace('.', ',')}%`;

const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const monthName = (m: number): string => MONTHS_NOM[m];
export const monthShort = (m: number): string => MONTHS_SHORT[m];

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((that.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === -1) return 'Вчера';
  if (diff === 1) return 'Завтра';
  const y = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${y}`;
}

export function dateFull(iso: string): string {
  const d = new Date(iso);
  return `${dateLabel(iso)}, ${WEEKDAYS_SHORT[d.getDay()]}`;
}

export const timeLabel = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function dateTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return dateLabel(iso);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function monthKeyLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const now = new Date();
  if (y === now.getFullYear() && m - 1 === now.getMonth()) return 'Этот месяц';
  if (y === now.getFullYear() && m === now.getMonth()) return 'Прошлый месяц';
  return `${MONTHS_NOM[m - 1][0].toUpperCase()}${MONTHS_NOM[m - 1].slice(1)}${y !== now.getFullYear() ? ` ${y}` : ''}`;
}

/** Русская плюрализация: plural(5, 'операция', 'операции', 'операций') */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export const pluralOps = (n: number): string => `${moneyFmt.format(n)} ${plural(n, 'операция', 'операции', 'операций')}`;

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export const sumBy = <T>(arr: T[], f: (x: T) => number): number => arr.reduce((a, x) => a + f(x), 0);

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Диапазон дат периода */
export interface DateRange { from: string; to: string; label: string }

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function rangeThisMonth(): DateRange {
  const n = new Date();
  return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1)), to: iso(n), label: 'Этот месяц' };
}
export function rangeLastMonth(): DateRange {
  const n = new Date();
  const s = new Date(n.getFullYear(), n.getMonth() - 1, 1);
  const e = new Date(n.getFullYear(), n.getMonth(), 0);
  return { from: iso(s), to: iso(e), label: 'Прошлый месяц' };
}
export function rangeLast(nMonths: number, label: string): DateRange {
  const n = new Date();
  const s = new Date(n.getFullYear(), n.getMonth() - nMonths + 1, 1);
  return { from: iso(s), to: iso(n), label };
}
export function rangeYear(): DateRange {
  const n = new Date();
  return { from: iso(new Date(n.getFullYear() - 1, n.getMonth(), n.getDate())), to: iso(n), label: 'Год' };
}
export function rangeAll(fromIso: string): DateRange {
  return { from: fromIso, to: iso(new Date()), label: 'Всё время' };
}

export function inRange(tIso: string, r: DateRange): boolean {
  const d = tIso.slice(0, 10);
  return d >= r.from && d <= r.to;
}

/** CSV с BOM и «;» — открывается в Numbers и русском Excel */
export function toCSV(rows: (string | number)[][]): string {
  const body = rows
    .map((r) => r.map((c) => (typeof c === 'number' ? String(c).replace('.', ',') : `"${String(c).replace(/"/g, '""')}"`)).join(';'))
    .join('\r\n');
  return '\uFEFF' + body;
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
