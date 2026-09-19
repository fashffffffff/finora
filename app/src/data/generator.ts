/* ============================================================
   Finora — генератор демо-данных (полностью синтетических).
   Детерминированный: при каждом сбросе демо набор одинаковый.
   Формат — «сырые» операции банка (RawOperation), как будто
   их отдал реальный BankProvider.
   ============================================================ */

import type { RawOperation } from '../domain/types';
import { chance, mulberry32, pick, rnd, rndInt } from '../core/utils';

const seedRng = mulberry32(20251001);
let n = 0;

const START_BALANCE = 380_500.55; // баланс на 01.10.2025
export { START_BALANCE };

function push(
  ops: RawOperation[],
  d: Date,
  amount: number,
  merchant: string,
  description: string,
  opts: { mcc?: string; status?: 'ok' | 'pending'; cashback?: number; h?: [number, number] } = {},
): void {
  const [h1, h2] = opts.h ?? [10, 21];
  const hh = rndInt(seedRng, h1, h2);
  const mm = rndInt(seedRng, 0, 59);
  const p = (x: number) => String(x).padStart(2, '0');
  ops.push({
    id: `t${(++n).toString(36)}`,
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hh)}:${p(mm)}:00`,
    amount,
    merchant,
    description,
    mcc: opts.mcc,
    status: opts.status ?? 'ok',
    cashback: opts.cashback,
  });
}

const GROCERIES = [
  { m: 'Пятёрочка', min: 480, max: 1750 },
  { m: 'ВкусВилл', min: 950, max: 2600 },
  { m: 'Магнит', min: 390, max: 1400 },
  { m: 'Лента', min: 2100, max: 4300 },
  { m: 'Яндекс Лавка', min: 650, max: 1900 },
  { m: 'Самокат', min: 400, max: 1100 },
];
const COFFEE = ['Cofix', 'Шоколадница', 'One Price Coffee', 'Кофе Хауз'];
const LUNCH = ['Вкусно — и точка', 'Теремок', 'Столовая №1', 'Farsh'];
const DINNER = ['Тануки', 'Додо Пицца', 'Много Лосося', 'Пхали-Хинкали', 'Bro&N'];
const FRIENDS = ['Иван К.', 'Артём С.', 'Мария Л.', 'Сергей П.', 'Данил В.'];

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Особые события по конкретным датам */
const SPECIAL: Record<string, Array<(ops: RawOperation[], d: Date) => void>> = {
  // Осень 2025
  '2025-10-18': [(o, d) => push(o, d, -18990, 'DNS', 'Покупка · DNS · наушники', { mcc: '5732' })],
  '2025-11-14': [(o, d) => push(o, d, -22990, 'DNS', 'Покупка · DNS · AirPods Pro', { mcc: '5732' })],
  '2025-12-19': [(o, d) => push(o, d, 68000, 'Интех Групп', 'Зачисление · годовая премия', { h: [9, 10] })],
  '2025-12-21': [(o, d) => { push(o, d, -6800, 'Золотое Яблоко', 'Покупка · Золотое Яблоко · подарки', { mcc: '5977' }); push(o, d, -8000, 'Марина Р.', 'Перевод · подарок маме', {}); }],
  // Зима 2026
  '2026-01-12': [(o, d) => push(o, d, -39000, 'Хекслет', 'Оплата · Хекслет · курс Python', { mcc: '8299' })],
  '2026-02-23': [(o, d) => { push(o, d, -4990, 'Литрес', 'Покупка · Литрес · книги', { mcc: '5192' }); push(o, d, -3500, 'Артём С.', 'Перевод СБП · 23 февраля', {}); }],
  '2026-03-08': [(o, d) => { push(o, d, -2400, 'Цветочный', 'Покупка · Цветочный · букет', { mcc: '5992' }); push(o, d, -8000, 'Марина Р.', 'Перевод · подарок маме', {}); }],
  '2026-03-21': [(o, d) => push(o, d, -34990, 'DNS', 'Покупка · DNS · монитор', { mcc: '5732' })],
  // Весна 2026
  '2026-04-30': [(o, d) => push(o, d, -23800, 'Ferrari Style', 'Покупка · Ferrari Style · куртка', { mcc: '5651' })],
  '2026-05-07': [(o, d) => push(o, d, -28640, 'Аэрофлот', 'Оплата · Аэрофлот · билеты МСК—Сочи', { mcc: '3005' })],
  '2026-05-08': [(o, d) => push(o, d, -46300, 'Островок', 'Оплата · Островок · отель, Сочи, 6 ночей', { mcc: '7011' })],
  '2026-05-20': [(o, d) => push(o, d, -9490, 'DNS', 'Покупка · DNS · подарок папе', { mcc: '5732' })],
  // Лето 2026
  '2026-06-17': [(o, d) => push(o, d, 12000, 'Перевод card2card', 'Пополнение · card2card · RUS', { h: [12, 16] })],
  '2026-06-24': [(o, d) => push(o, d, -840, 'SHAURMA N1', 'Покупка · SHAURMA N1', { mcc: '5812' })],
  '2026-07-02': [(o, d) => push(o, d, -6500, 'ООО «ПрофРЕСУРС»', 'Платёж · ООО «ПрофРЕСУРС»', {})],
  '2026-07-25': [(o, d) => push(o, d, -2200, 'ИП Ахметов Р.И.', 'Платёж · ИП Ахметов Р.И.', {})],
  '2026-08-14': [(o, d) => push(o, d, -8940, 'РЖД', 'Оплата · РЖД · билеты МСК—СПб', { mcc: '4112' })],
  '2026-08-15': [(o, d) => push(o, d, -21400, 'Ostrovok', 'Оплата · Ostrovok · отель, СПб, 3 ночи', { mcc: '7011' })],
  '2026-08-30': [(o, d) => push(o, d, -25000, 'Перевод card2card', 'Перевод · card2card · на карту другого банка', {})],
  // Осень 2026 — свежие неразобранные
  '2026-09-04': [(o, d) => push(o, d, -1900, 'Y.MONEY', 'Платёж · Y.MONEY', {})],
  '2026-09-12': [(o, d) => push(o, d, -3400, 'ИП Ковалёв А. В.', 'Платёж · ИП Ковалёв А. В.', {})],
};

/** Полная история с 01.10.2025 по указанный день */
export function generateHistory(toDate = new Date()): RawOperation[] {
  n = 0;
  const ops: RawOperation[] = [];
  const start = new Date(2025, 9, 1);

  for (let d = new Date(start); d <= toDate; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const dm = day.getMonth();
    const wd = day.getDay(); // 0 вс … 6 сб
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    // --- Регулярные платежи по числам месяца ---
    if (day.getDate() === 1) {
      push(ops, day, round2(rnd(seedRng, 180, 420)), 'Проценты на остаток', 'Начисление · проценты на остаток по счёту', { h: [4, 6] });
      push(ops, day, -399, 'Кинопоиск', 'Списание · Кинопоиск Плюс · подписка', { mcc: '5899' });
      push(ops, day, -1050, 'Figma', 'Списание · Figma · Pro-подписка', { mcc: '5895' });
    }
    if (day.getDate() === 2) {
      push(ops, day, -65000, 'Марина Ковалёва', 'Перевод · аренда квартиры', { h: [11, 13] });
      push(ops, day, -rndInt(seedRng, 25000, 40000), 'Накопительный счёт', 'Перевод · на накопительный счёт', { h: [9, 11] });
    }
    if (day.getDate() === 3) {
      push(ops, day, -650, 'МТС', 'Списание · МТС · мобильная связь', { mcc: '4814' });
      push(ops, day, -3200, 'Skyeng', 'Списание · Skyeng · занятия с репетитором', { mcc: '8299' });
    }
    if (day.getDate() === 5) {
      push(ops, day, 148500, 'Интех Групп', 'Зачисление · заработная плата', { h: [9, 10] });
      push(ops, day, round2(rnd(seedRng, 700, 2200)), 'Кэшбэк', 'Начисление · кэшбэк за прошедший месяц', { h: [4, 6] });
    }
    if (day.getDate() === 6) push(ops, day, -750, 'Ростелеком', 'Списание · домашний интернет', { mcc: '4814' });
    if (day.getDate() === 7) push(ops, day, -499, 'Яндекс Плюс', 'Списание · Яндекс Плюс · подписка', { mcc: '5899' });
    if (day.getDate() === 10) push(ops, day, -round2(rnd(seedRng, 5400, 7200)), 'ЖКУ Москва', 'Списание · ЖКУ · начисления месяца', { h: [11, 13] });
    if (day.getDate() === 12) push(ops, day, -149, 'Apple', 'Списание · iCloud+ 200 ГБ', { mcc: '5899' });
    if (day.getDate() === 15) push(ops, day, -2990, 'X-Fit', 'Списание · X-Fit · фитнес-клуб', { mcc: '7997' });

    // Подработка: 0–2 раза в месяц, ближе к концу месяца
    if (day.getDate() >= 18 && day.getDate() <= 27 && chance(seedRng, 0.06)) {
      push(ops, day, round2(rnd(seedRng, 9000, 42000)), 'ИП Лебедева М. С.', 'Зачисление · дизайн интерфейсов, проектная оплата', { h: [12, 18] });
    }

    // --- Ежедневная активность ---
    // Продукты: 2–3 покупки в неделю
    if (chance(seedRng, wd === 6 || wd === 5 ? 0.62 : 0.3)) {
      const g = pick(seedRng, GROCERIES);
      push(ops, day, -round2(rnd(seedRng, g.min, g.max)), g.m, `Покупка · ${g.m} ${rndInt(seedRng, 1000, 9800)} · Москва`, {
        mcc: '5411', cashback: chance(seedRng, 0.5) ? round2(rnd(seedRng, 8, 65)) : undefined,
      });
    }
    // Кофе по будням
    if (wd >= 1 && wd <= 5 && chance(seedRng, 0.55)) {
      push(ops, day, -round2(rnd(seedRng, 260, 460)), pick(seedRng, COFFEE), 'Покупка · кофе с собой', { mcc: '5812' });
    }
    // Бизнес-ланч
    if (wd >= 1 && wd <= 5 && chance(seedRng, 0.4)) {
      push(ops, day, -round2(rnd(seedRng, 420, 860)), pick(seedRng, LUNCH), `Покупка · ${pick(seedRng, LUNCH)} · обед`, { mcc: '5812' });
    }
    // Ужин вне дома: чаще в выходные
    if (chance(seedRng, wd === 0 || wd === 6 ? 0.42 : 0.16)) {
      push(ops, day, -round2(rnd(seedRng, 900, 3600)), pick(seedRng, DINNER), 'Покупка · ужин', { mcc: '5812' });
    }
    // Такси
    if (chance(seedRng, 0.16)) {
      push(ops, day, -round2(rnd(seedRng, 240, 680)), 'Яндекс Go', 'Поездка · Яндекс Go', { mcc: '4121' });
    }
    // Метро
    if (chance(seedRng, 0.12)) {
      push(ops, day, -round2(rnd(seedRng, 54, 62)), 'Метро', 'Поездка · Тройка, метро', { mcc: '4111' });
    }
    // Пополнение Тройки дважды в месяц
    if ((day.getDate() === 8 || day.getDate() === 22) && chance(seedRng, 0.8)) {
      push(ops, day, -rndInt(seedRng, 500, 1000), 'Кошелёк «Тройка»', 'Пополнение · Кошелёк «Тройка»', { mcc: '4111' });
    }
    // Аптека
    if (chance(seedRng, 0.07)) {
      push(ops, day, -round2(rnd(seedRng, 480, 2600)), pick(seedRng, ['Горздрав', 'Апрель', 'Ригла']), 'Покупка · аптека', { mcc: '5912' });
    }
    // Стоматология раз в ~3 месяца
    if (day.getDate() === 26 && dm % 3 === 1) {
      push(ops, day, -round2(rnd(seedRng, 6800, 12400)), 'Дентал Фэнтези', 'Оплата · Дентал Фэнтези · приём', { mcc: '8021' });
    }
    // Кино
    if ((wd === 6 || wd === 0) && chance(seedRng, 0.18)) {
      push(ops, day, -rndInt(seedRng, 800, 1500), 'КАРО Фильм', 'Покупка · КАРО · 2 билета', { mcc: '7832' });
    }
    // Steam
    if (chance(seedRng, 0.08)) {
      push(ops, day, -round2(rnd(seedRng, 399, 3400)), 'Steam', 'Покупка · Steam · игра', { mcc: '5816' });
    }
    // Ozon / маркетплейс
    if (chance(seedRng, 0.13)) {
      push(ops, day, -round2(rnd(seedRng, 800, 5600)), 'Ozon', 'Покупка · Ozon · заказ', { mcc: '5999' });
    }
    // Одежда
    if (chance(seedRng, 0.05)) {
      push(ops, day, -round2(rnd(seedRng, 1800, 7800)), pick(seedRng, ['Lamoda', 'Спортмастер', 'ZARA', 'H&M']), 'Покупка · одежда', { mcc: '5651' });
    }
    // Книги
    if (chance(seedRng, 0.05)) {
      push(ops, day, -round2(rnd(seedRng, 700, 2400)), 'Читай-город', 'Покупка · Читай-город · книги', { mcc: '5942' });
    }
    // Перевод другу
    if (chance(seedRng, 0.1)) {
      push(ops, day, -round2(rnd(seedRng, 500, 4500)), pick(seedRng, FRIENDS), 'Перевод СБП · по номеру телефона', { h: [12, 23] });
    }
    // Возврат долга от друга (редко)
    if (chance(seedRng, 0.025)) {
      push(ops, day, round2(rnd(seedRng, 800, 3500)), pick(seedRng, FRIENDS), 'Пополнение · возврат долга', {});
    }
    // Возврат покупки на Ozon
    if (chance(seedRng, 0.02)) {
      push(ops, day, round2(rnd(seedRng, 900, 4200)), 'Ozon', 'Возврат · Ozon · возврат товара', {});
    }
    // Снятие наличных
    if (day.getDate() === 20 && chance(seedRng, 0.7)) {
      push(ops, day, -5000, 'Банкомат Т', 'Снятие наличных · банкомат Т-Банка', { h: [12, 20] });
    }
    // С накопительного обратно (изредка)
    if (chance(seedRng, 0.02)) {
      push(ops, day, rndInt(seedRng, 10000, 25000), 'Накопительный счёт', 'Пополнение · перевод с накопительного счёта', { h: [10, 14] });
    }
    // Комиссия за перевод юрлицу
    if (chance(seedRng, 0.03)) {
      push(ops, day, -49, 'Комиссия', 'Комиссия · перевод по реквизитам', {});
    }

    // --- Особые даты ---
    SPECIAL[key]?.forEach((fn) => fn(ops, day));
  }

  // Свежие операции за последние два дня — дашборд выглядит живым
  const today = new Date(toDate);
  const yest = new Date(toDate); yest.setDate(yest.getDate() - 1);
  if (!SPECIAL[isoOf(yest)]) {
    push(ops, yest, -1287.4, 'Пятёрочка', 'Покупка · ПЯТЕРОЧКА 8231 · Москва', { mcc: '5411', h: [18, 20] });
    push(ops, yest, -342, 'Cofix', 'Покупка · кофе с собой', { mcc: '5812', h: [8, 10] });
  }
  push(ops, today, -568.9, 'Яндекс Go', 'Поездка · Яндекс Go', { mcc: '4121', h: [9, 11] });
  push(ops, today, -2140, 'ВкусВилл', 'Покупка · ВКУСВИЛЛ 4512 · Москва', { mcc: '5411', status: 'pending', h: [12, 14] });

  ops.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return ops;
}

function isoOf(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Новые операции «после последней синхронизации» */
export function generateUpdates(afterISO: string, seed: number): RawOperation[] {
  const r = mulberry32(seed);
  const out: RawOperation[] = [];
  const now = new Date();
  const plan: Array<[string, number, number, string, string, string]> = [
    // merchant, min, max, description, mcc, prefix
    ['Магнит', 520, 1480, 'Покупка · МАГНИТ 2210 · Москва', '5411', 'expense'],
    ['Cofix', 280, 430, 'Покупка · кофе с собой', '5812', 'expense'],
    ['Яндекс Go', 260, 640, 'Поездка · Яндекс Go', '4121', 'expense'],
    ['Ozon', 940, 3900, 'Покупка · Ozon · заказ', '5999', 'expense'],
  ];
  const count = rndInt(r, 3, 6);
  for (let i = 0; i < count; i++) {
    const [m, min, max, desc, mcc] = plan[Math.floor(r() * plan.length)];
    const d = new Date(now.getTime() - Math.floor(r() * Math.max(1, (now.getTime() - new Date(afterISO).getTime()) || 3600000)));
    out.push({
      id: `u${seed.toString(36)}_${i}`,
      date: `${isoOf(d)}T${String(rndInt(r, 9, 21)).padStart(2, '0')}:${String(rndInt(r, 0, 59)).padStart(2, '0')}:00`,
      amount: -round2(rnd(r, min, max)),
      merchant: m,
      description: desc,
      mcc,
      status: 'ok',
    });
  }
  // изредка — новая неразобранная операция
  if (r() < 0.45) {
    out.push({
      id: `u${seed.toString(36)}_q`,
      date: `${isoOf(new Date(now.getTime() - 86400000))}T${String(rndInt(r, 10, 20)).padStart(2, '0')}:30:00`,
      amount: -round2(rnd(r, 900, 3800)),
      merchant: 'ИП Тимофеев К. Е.',
      description: 'Платёж · ИП Тимофеев К. Е.',
      status: 'ok',
    });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}
