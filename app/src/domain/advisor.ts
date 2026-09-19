/* ============================================================
   Finora — AI-советник чата (этап 3).

   Два режима за одним фасадом:
   1. advisorAnswer() — основной путь. Если скачана локальная
      модель (Qwen3.5-4B, исполняется llama.cpp на этом Mac),
      вопрос уходит ей вместе со сводкой фактов: цифры всегда
      считает TypeScript, модель только формулирует ответ.
   2. advisorReply() — синхронные правила, сохраняют старую
      сигнатуру. Работают всегда: без модели (бразуер, слабый
      ноут, недокачанный файл) и как fallback при любой ошибке.

   Privacy: наружу не ходит ничего. Единственный сетевой
   запрос в истории этапа — скачивание файла модели.
   ============================================================ */

import type { AppState, Goal, Transaction } from './types';
import { balance, summarize } from './analytics';
import { catById } from '../data/categories';
import {
  clamp, dateFull, inRange, money, monthName, plural, rangeLastMonth, rangeLast,
  rangeThisMonth, type DateRange,
} from '../core/utils';
import { AI_MODEL_LABEL, aiAvailable, aiGenerate, aiModelCached, aiStatus, type AiChatMsg } from './aiEngine';

const fmt = (v: number): string => money(Math.round(v), false, true);

const monthTxs = (s: AppState, r: DateRange) =>
  s.txs.filter((t) => !t.internal && inRange(t.date, r));

function monthsUntil(iso: string): number {
  const now = new Date();
  const d = new Date(iso);
  return Math.max(1, Math.ceil((d.getTime() - now.getTime()) / (30.4 * 86400000)));
}

function monthLabel(d: Date): string {
  return `${monthName(d.getMonth())} ${d.getFullYear()}`;
}

/* ============================================================
   1. ПРАВИЛА — синхронный режим (advisorReply)
   ============================================================ */

/* ---------- Ответы по темам ---------- */

function balanceReply(s: AppState): string {
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  const lines = [`Сейчас на счетах ${fmt(balance(s.txs))}.`, `В этом месяце: доходы ${fmt(cur.income)}, расходы ${fmt(cur.expense)}.`];
  if (cur.net >= 0) lines.push(`Свободно ${fmt(cur.net)} — можно направить в цели.`);
  else lines.push(`Расходы выше доходов на ${fmt(-cur.net)} — проверьте крупные траты.`);
  return lines.join('\n');
}

function spendReply(s: AppState): string {
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  const prev = summarize(monthTxs(s, rangeLastMonth()));
  if (cur.byCategory.length === 0) return 'В этом месяце расходов пока не было. Как подключите банк — разберу траты по категориям.';
  const total = cur.expense || 1;
  const dayAvg = cur.expense / new Date().getDate();
  const top = cur.byCategory.slice(0, 3).map((c, i) => {
    const share = Math.round((c.total / total) * 100);
    return `${i + 1}. ${catById(s.categories, c.id).name} — ${fmt(c.total)} (${share}%)`;
  });
  const lines = [
    `Больше всего в этом месяце ушло на:\n${top.join('\n')}`,
    `Всего расходы: ${fmt(cur.expense)}, в среднем ${fmt(dayAvg)} в день.`,
  ];
  if (prev.expense > 0) {
    const diff = cur.expense - prev.expense;
    lines.push(diff > 0
      ? `К прошлому месяцу это на ${fmt(diff)} больше.`
      : `К прошлому месяцу это на ${fmt(-diff)} меньше — так держать.`);
  }
  lines.push('Скажите «совет», если хотите понять, где ужаться.');
  return lines.join('\n');
}

function incomeReply(s: AppState): string {
  const cur = monthTxs(s, rangeThisMonth()).filter((t) => t.type === 'income');
  if (cur.length === 0) return 'В этом месяце поступлений пока не было.';
  const bySrc = new Map<string, number>();
  for (const t of cur) bySrc.set(t.category, (bySrc.get(t.category) ?? 0) + t.amount);
  const top = [...bySrc.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = cur.reduce((a, t) => a + t.amount, 0);
  const share = Math.round((top[1] / Math.max(1, total)) * 100);
  const srcName = catById(s.categories, top[0]).name;
  return `Доходы за месяц — ${fmt(total)} из ${cur.length} ${plural(cur.length, 'поступления', 'поступлений', 'поступлений')}. Основной источник: «${srcName}» (${share}%).`;
}

function goalLine(s: AppState, g: Goal): string {
  const pctDone = Math.round(clamp(g.saved / Math.max(1, g.target), 0, 1) * 100);
  const left = Math.max(0, g.target - g.saved);
  let tail = `Осталось накопить ${fmt(left)}.`;
  if (g.deadline && left > 0) {
    const months = monthsUntil(g.deadline);
    tail = `До срока ${dateFull(g.deadline)} — ${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}, примерно по ${fmt(left / months)} в месяц.`;
  }
  return `• «${g.title}» — ${fmt(g.saved)} из ${fmt(g.target)} (${pctDone}%). ${tail}`;
}

function goalsReply(s: AppState): string {
  if (s.goals.length === 0) return 'Целей пока нет. Создайте первую на вкладке «Цели» — и я подскажу, сколько откладывать.';
  const lines = s.goals.map((g) => goalLine(s, g));
  return `Как дела у целей:\n${lines.join('\n')}`;
}

/** Подсказка «где сэкономить»: от самой конкретной причины к общей */
function tipReply(s: AppState): string {
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  const prev = summarize(monthTxs(s, rangeLastMonth()));

  // 1. Подписки: переводим в годовую сумму
  const subs = cur.byCategory.find((c) => c.id === 'subscriptions');
  if (subs && subs.total > 0) {
    return `Подписки съедают ${fmt(subs.total)} в месяц — это ${fmt(subs.total * 12)} в год. Отключите то, чем не пользовались месяц: разница сама уйдёт в «сокровищницу».`;
  }

  // 2. Категория, которая заметно выросла к прошлому месяцу
  const growth = cur.byCategory
    .map((c) => ({ ...c, prev: prev.byCategory.find((x) => x.id === c.id)?.total ?? 0 }))
    .filter((c) => c.prev > 0 && c.total > c.prev * 1.2 && c.total - c.prev > 2000)
    .sort((a, b) => (b.total - b.prev) - (a.total - a.prev))[0];
  if (growth) {
    const name = catById(s.categories, growth.id).name;
    return `Расходы на «${name}» выросли на ${fmt(growth.total - growth.prev)} к прошлому месяцу. Если это не разовая покупка — стоит задать себе лимит.`;
  }

  // 3. Есть свободные деньги — предлагаем ближайшую цель
  if (cur.net > 0) {
    const next = [...s.goals]
      .filter((g) => g.target > g.saved)
      .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))[0];
    return next
      ? `В этом месяце свободно ${fmt(cur.net)}. Переведите их в «${next.title}» сразу после зарплаты — так накопление идёт само.`
      : `В этом месяце свободно ${fmt(cur.net)} — хороший запас. Подумайте о новой цели или подушке на 3 месяца расходов.`;
  }

  return 'Попробуйте правило 50/30/20: половина дохода — на необходимое, 30% — на желания, 20% — сразу в накопления. У вас уже есть «сокровищница» — ей это подходит.';
}

/* ---------- Жизненные ситуации: «трачу N в неделю на X» ---------- */

/** Ключевые слова категорий для разбора свободного текста */
const CAT_KEYWORDS: Array<[RegExp, string]> = [
  [/подарк/, 'gifts'], [/подписк/, 'subscriptions'], [/коф/, 'dining'], [/кафе|ресторан|доставк|ед[ау] вне/, 'dining'],
  [/такси|транспорт|бензин|проезд/, 'transport'], [/продукт|супермаркет|ед[ау]|магазин/, 'groceries'],
  [/одежд|шопинг|вещ/, 'clothing'], [/техник|электроник|гаджет/, 'tech'], [/развлеч|кино|игр/, 'fun'],
  [/аптек|лекарств|здоров/, 'health'], [/фитнес|спортзал/, 'health'], [/обучен|курс/, 'education'],
  [/путешеств|отпус|поездк/, 'travel'],
];

const PERIODS: Array<[RegExp, number, string]> = [
  [/в день|ежедневно|каждый день/, 30.4, 'в день'],
  [/в недел|еженедельно|каждую неделю/, 4.33, 'в неделю'],
  [/в месяц|ежемесячно|каждый месяц/, 1, 'в месяц'],
];

/** «10 тысяч в неделю» → сумма и период; null, если распознать не удалось */
function parseSpendPattern(q: string): { amount: number; perMonth: number; period: string; catId: string | null } | null {
  const m = q.match(/(?:трачу|уходит|откладываю|платю|тратю| spend(?:ing)?)\s*(?:около|примерно|порядка)?\s*(\d[\d\s.,]*)\s*(тыс\.?|тысяч|к|k)?/);
  if (!m) return null;
  let amount = parseFloat(m[1].replace(/[\s,]/g, '')) || 0;
  if (/^(тыс|тысяч|к|k)\.?$/.test(m[2] ?? '')) amount *= 1000;
  if (amount <= 0) return null;
  const period = PERIODS.find(([re]) => re.test(q)) ?? PERIODS[2];
  const cat = CAT_KEYWORDS.find(([re]) => re.test(q));
  return { amount, perMonth: amount * period[1], period: period[2], catId: cat?.[1] ?? null };
}

/** Живые альтернативы по категориям — то, за что нельзя «спасибо, капец какой полезный совет» */
const HABIT_ALTERNATIVES: Record<string, string> = {
  gifts: 'Попробуйте «подарки — впечатления»: прогулка по красивым местам, спектакль, поездка на выходные часто запоминаются больше вещей и стоят дешевле. Ещё работает договорённость о разумном лимите — это про заботу, а не про жадность.',
  dining: 'Обычно спасают два шага: лимит на доставку (готовить 2–3 вечера в неделю) и «кофе с собой» вместо кафе по будням. Вкус жизни не страдает, а сумма падает заметно.',
  transport: 'Посмотрите на такси в часы пик — часть поездок часто заменяется метро или велосипедом без потери времени.',
  groceries: 'Помогает список покупок перед походом в магазин и один большой закуп вместо мелких: мелочи по дороге съедают больше всего.',
  subscriptions: 'Выпишите все подписки и отключите те, где за месяц ни одного захода. Годовая сумма у таких «забытых» — самая обидная трата.',
  clothing: 'Правило «24 часа перед покупкой» отсекает импульсивные вещи, а качество важнее количества — гардероб от этого только выигрывает.',
  tech: 'Апгрейды лучше привязывать к реальной потребности: если гаджет решает задачи — обновление можно отложить, а разницу направить в цель.',
  fun: 'Развлечения нельзя убирать совсем — иначе сорвётесь. Проще задать месячный бюджет и выбирать, что приносит больше радости за эти деньги.',
  health: 'Здоровье — то, где экономить опасно. Лучше сокращать соседние категории, а это оставить как есть.',
  education: 'Вложения в себя обычно окупаются — разумнее ужимать другие категории, чем отменять обучение.',
  travel: 'Дешевле выходит планирование за 2–3 месяца и гибкие даты: билеты и жильё в будни заметно доступнее.',
};

function habitReply(s: AppState, p: { amount: number; perMonth: number; period: string; catId: string | null }): string {
  const catName = p.catId ? catById(s.categories, p.catId).name.toLowerCase() : null;
  const yearly = p.perMonth * 12;
  const lines = [
    `Если вы тратите ${fmt(p.amount)} ${p.period}, то в год это около ${fmt(yearly)}${catName ? ` только на ${catName}` : ''}.`,
  ];
  // сравним с реальностью пользователя, если данные уже есть
  if (p.catId && s.txs.length > 0) {
    const cur = summarize(monthTxs(s, rangeThisMonth()));
    const real = cur.byCategory.find((c) => c.id === p.catId)?.total;
    if (real !== undefined && real > 0) {
      lines.push(real >= p.perMonth
        ? `По данным Finora в этом месяце на это уже ушло ${fmt(real)} — так что оценка сходится.`
        : `По данным Finora в этом месяце вышло ${fmt(real)} — чуть меньше вашей оценки.`);
    }
  }
  if (p.catId && HABIT_ALTERNATIVES[p.catId]) lines.push(HABIT_ALTERNATIVES[p.catId]);
  else lines.push('Хороший приём: задать этой категории месячный лимит и раз в неделю сверяться — осознанность сама сокращает лишнее процентов на двадцать.');
  // привяжем к цели, если она есть
  const goal = s.goals.find((g) => g.target > g.saved);
  if (goal) {
    const half = p.perMonth * 0.3;
    lines.push(`А если сократить это хотя бы на треть (примерно ${fmt(half)} в месяц) и переводить разницу в «${goal.title}» — цель приблизится сама, без героизма.`);
  }
  return lines.join('\n');
}

/** «Сколько я потратил на X» — по категории из свободного текста */
function categorySpendReply(s: AppState, q: string): string | null {
  const cat = CAT_KEYWORDS.find(([re]) => re.test(q));
  if (!cat) return null;
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  const prev = summarize(monthTxs(s, rangeLastMonth()));
  const curC = cur.byCategory.find((c) => c.id === cat[1]);
  const prevC = prev.byCategory.find((c) => c.id === cat[1])?.total ?? 0;
  if (!curC && prevC === 0) return null;
  const name = catById(s.categories, cat[1]).name;
  const lines = [curC
    ? `На «${name}» в этом месяце ушло ${fmt(curC.total)} из ${fmt(cur.expense)} расходов (${Math.round((curC.total / Math.max(1, cur.expense)) * 100)}%).`
    : `В этом месяце на «${name}» трат пока не было.`];
  if (prevC > 0) lines.push(`В прошлом месяце — ${fmt(prevC)}.`);
  return lines.join('\n');
}

/** «Как накопить на X» — план под конкретную цель */
function savingPlanReply(s: AppState, q: string): string {
  const goal = s.goals.find((g) => q.includes(g.title.toLowerCase().slice(0, 6)) || g.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w)));
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  if (goal && goal.target > goal.saved) {
    const left = goal.target - goal.saved;
    const months = goal.deadline ? monthsUntil(goal.deadline) : 6;
    const perMonth = left / months;
    const lines = [
      `Цель «${goal.title}»: осталось ${fmt(left)}.`,
      goal.deadline
        ? `До срока ${dateFull(goal.deadline)} — по ${fmt(perMonth)} в месяц.`
        : `Если хотите успеть за ${months} ${plural(months, 'месяц', 'месяца', 'месяцев')} — по ${fmt(perMonth)} в месяц.`,
    ];
    if (cur.net >= perMonth) lines.push(`Сейчас вы и так свободно держите ${fmt(cur.net)} в месяц — просто настройте автоперевод в «сокровищницу» после зарплаты.`);
    else lines.push(`Свободных ${fmt(cur.net)} не хватает на ${fmt(perMonth)}. Посмотрите на верхние категории месяца — даже 10–15% с пары из них закроют разницу.`);
    return lines.join('\n');
  }
  // цели нет — прикинем от свободных денег
  if (cur.net > 0) {
    return `Свободно примерно ${fmt(cur.net)} в месяц. Создайте цель на вкладке «Цели» — я посчитаю срок, а «сокровищница» будет держать деньги отдельной строкой.`;
  }
  return 'Пока в этом месяце свободных денег нет — сначала стоит разобрать крупные траты. Скажите «куда уходят деньги», и я покажу картину.';
}

/* ---------- Публичная точка входа (правила) ---------- */

export function advisorReply(question: string, s: AppState): string {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has('привет', 'здравств', 'хай', 'добрый день', 'добрый вечер', 'доброе утро')) {
    return `Привет, ${s.settings.profileName}! Я Finora AI — помощник по вашим деньгам. Всё, что мы обсуждаем, остаётся на этом устройстве. Спросите про баланс, траты или цели.`;
  }
  if (has('спасибо', 'благодар')) {
    return 'Всегда пожалуйста! Если захотите — спросите, как дела у целей или где можно ужать расходы.';
  }
  if (has('кто ты', 'что ты умеешь', 'умеешь', 'помощь', 'help', 'как тебя использовать')) {
    return 'Я отвечаю по вашим локальным данным:\n• баланс — «сколько у меня денег»\n• траты — «куда уходят деньги», «сколько я трачу на кофе»\n• доходы — «откуда приходят деньги»\n• цели — «как дела с целями», «как накопить на ноутбук»\n• жизненные ситуации — «трачу 10 тысяч в месяц на доставку еды, это нормально?»\n• советы — «как сэкономить».\nСо свободным разговором ещё лучше после подключения локальной модели — Настройки → «AI-модель».';
  }
  if (has('приватность', 'безопасн', 'данные утек', 'куда отправля', 'интернет', 'онлайн')) {
    return 'Всё работает локально: операции, анализ и этот диалог живут только на вашем Mac. Облачный AI в Finora выключен на уровне архитектуры, а локальная модель исполняется llama.cpp прямо здесь.';
  }
  if (s.txs.length === 0) {
    return 'Пока у меня нет данных. Подключите демо-банк на вкладке «Банк» — и я разберу ваши траты и подскажу, как накопить.';
  }

  // жизненная ситуация: сумма + период (+ категория из текста)
  const spendPattern = parseSpendPattern(q);
  if (spendPattern && has('норм', 'много', 'стоит ли', 'как думаете', 'как считаешь', 'ок', 'допустимо') || (spendPattern && has('трачу', 'уходит'))) {
    return habitReply(s, spendPattern);
  }
  if (has('сколько я потратил', 'сколько трачу', 'сколько ушло') ) {
    const byCat = categorySpendReply(s, q);
    if (byCat) return byCat;
  }
  if (has('как накопить', 'хочу накопить', 'успею ли', 'сколько откладывать')) return savingPlanReply(s, q);

  if (has('баланс', 'сколько денег', 'сколько у меня', 'остаток')) return balanceReply(s);
  if (/(^|[^а-я])цел(ь|и|я|ей|ям|ях|ями)/.test(q) || has('накопит', 'копить', 'сокровищ')) return goalsReply(s);
  if (has('трат', 'расход', 'куда', 'на что', 'потратил', 'категори')) return spendReply(s);
  if (has('доход', 'зарплат', 'заработал', 'поступлен')) return incomeReply(s);
  if (has('совет', 'сэконом', 'экономи', 'подскаж', 'сократ')) return tipReply(s);

  return 'Такого я ещё не понял — я лучше всего разбираю вопросы про баланс, траты, доходы и цели. А со скачанной локальной моделью (Настройки → «AI-модель») отвечаю свободно на любой финансовый вопрос.';
}

/* ============================================================
   2. МОДЕЛЬ — основной режим при подключённой модели
   ============================================================ */

/** Сводка фактов: всё считается здесь, модель не выдумывает цифры */
export function buildFacts(s: AppState): string {
  const now = new Date();
  const cur = summarize(monthTxs(s, rangeThisMonth()));
  const prev = summarize(monthTxs(s, rangeLastMonth()));
  const lines: string[] = [];

  lines.push(`Сегодня: ${dateFull(now.toISOString())}. Имя пользователя: ${s.settings.profileName}.`);
  lines.push(`Баланс счетов: ${fmt(balance(s.txs))}.`);
  lines.push(`Текущий месяц (${monthLabel(now)}): доходы ${fmt(cur.income)}, расходы ${fmt(cur.expense)}, остаток ${fmt(cur.net)}.`);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lines.push(`Прошлый месяц (${monthLabel(prevDate)}): доходы ${fmt(prev.income)}, расходы ${fmt(prev.expense)}.`);
  lines.push(`Средние расходы в день (текущий месяц): ${fmt(cur.expense / now.getDate())}.`);

  const total = cur.expense || 1;
  const top = cur.byCategory.slice(0, 5).map((c, i) => {
    const share = Math.round((c.total / total) * 100);
    return `${i + 1}) ${catById(s.categories, c.id).name} — ${fmt(c.total)} (${share}%)`;
  });
  lines.push(`Топ-5 расходов текущего месяца:\n${top.join('\n') || '—'}`);

  const year = summarize(monthTxs(s, rangeLast(12, 'год')));
  const topYear = year.byCategory.slice(0, 3)
    .map((c) => `${catById(s.categories, c.id).name} — ${fmt(c.total)} за 12 мес`)
    .join('; ');
  if (topYear) lines.push(`Крупнейшие категории за год: ${topYear}.`);

  const bigOps = monthTxs(s, rangeLast(3, '3 месяца'))
    .filter((t) => t.type === 'expense' && t.amount >= 5000)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((t) => `${t.merchant} — ${fmt(t.amount)} (${dateFull(t.date)})`);
  if (bigOps.length) lines.push(`Крупные траты за 3 месяца: ${bigOps.join('; ')}.`);

  if (s.goals.length) {
    lines.push('Цели — это накопления на покупки, не расходы:');
    s.goals.forEach((g) => lines.push(`- ${goalLine(s, g)}`));
  } else {
    lines.push('Целей пока нет.');
  }

  const subs = cur.byCategory.find((c) => c.id === 'subscriptions');
  if (subs && subs.total > 0) lines.push(`Подписки в этом месяце: ${fmt(subs.total)}.`);

  const review = s.txs.filter((t: Transaction) => t.needsReview).length;
  if (review > 0) lines.push(`Операций на разборе: ${review} (вкладка «Разобрать»).`);

  return lines.join('\n');
}

function systemPrompt(s: AppState): string {
  return [
    'Ты — Finora AI, финансовый советник в приложении Finora для macOS. Работаешь полностью локально на компьютере пользователя (llama.cpp), ни один байт его данных не уходит в сеть.',
    '',
    'Правила ответа:',
    '1. Твоё главное дело — деньги пользователя: баланс, траты, доходы, цели. Опирайся ТОЛЬКО на цифры из блока данных ниже; если данных не хватает — честно скажи и задай уточняющий вопрос.',
    '2. При этом ты живой собеседник: на любую тему — хобби, учёба, работа, отношения, кино — отвечай охотно и по существу. Никаких отказов и «это не моя тема» не существует. Просто когда человек спрашивает про деньги — работай с его цифрами, а финансовый совет давай с учётом его реальных сумм.',
    '3. Пиши по-русски: простыми, живыми и грамотными предложениями, без канцелярита. Кратко: 2–5 предложений или список из 3–5 коротких пунктов. Обращайся к пользователю по имени.',
    '4. Оформлять ответ можно markdown: **жирный**, списки через «- » или «1. » — чат отрисует их красиво. Не используй заголовки # и таблицы.',
    '5. Советуй конкретно и выполнимо, отталкиваясь от его категорий, сумм и целей. Помни: цели — это накопления на покупки, а не траты; на цель ничего не «тратят». Для трат на близких предлагай тёплые недорогие альтернативы, а не «тратьте меньше».',
    '6. Не давай рекомендаций покупать конкретные ценные бумаги и не консультируй по медицине/праву.',
    '',
    'Как устроено приложение (эти разделы — единственные, других нет; не выдумывай):',
    '- «Главная» — баланс, доходы и расходы месяца, динамика, топ-категории, последние операции.',
    '- «Операции» — все операции списком: поиск, фильтры, сортировка по сумме (самая крупная трата ищется там).',
    '- «Разобрать» — операции без категории, их нужно распределить.',
    '- «Аналитика» — структура расходов за период, сравнение месяцев, крупные траты, источники дохода.',
    '- «Цели» — копилки на покупки: прогресс, пополнение.',
    '- «Банк» и «Синхронизация» — подключение банка и журнал синхронизаций.',
    '- «Настройки» — внешний вид, категории, экспорт, AI-модель, приватность.',
    'Если не уверен, где что в приложении, — честно скажи, что подсказать точный путь не можешь.',
    '',
    `Данные пользователя (рассчитаны приложением на дату ниже):\n${buildFacts(s)}`,
  ].join('\n');
}

export interface AdvisorAnswer {
  text: string;
  /** true — ответила локальная модель */
  byModel: boolean;
  /** Пояснение перед ответом (например, «модель не подключена») */
  note?: string;
}

export interface AdvisorHistory {
  role: 'user' | 'ai';
  text: string;
}

const FALLBACK_NOTE = 'Локальная модель не подключена — отвечаю встроенными правилами. Скачать модель можно в Настройках → «AI-модель».';

/**
 * Основная точка входа чата. При подключённой модели — свободный
 * разговор с фактами; иначе (или при любой ошибке) — правила.
 */
export async function advisorAnswer(
  question: string,
  s: AppState,
  history: AdvisorHistory[],
  onToken?: (accumulated: string) => void,
  onStatus?: (message: string) => void,
): Promise<AdvisorAnswer> {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  // Мгновенные правила не зависят от модели: приветствие, справка, нет данных
  const instant = !s.txs.length || has('привет', 'здравств', 'хай', 'добрый', 'спасибо', 'благодар', 'кто ты', 'что ты умеешь', 'умеешь', 'помощь', 'help', 'приватность', 'безопасн', 'куда отправля');
  if (instant) return { text: advisorReply(question, s), byModel: false };

  const status = aiAvailable() ? await aiStatus() : null;
  if (status?.modelReady) {
    const msgs: AiChatMsg[] = [
      { role: 'system', content: systemPrompt(s) },
      ...history.slice(-8).map((m): AiChatMsg => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: question },
    ];
    try {
      const text = await aiGenerate(msgs, (acc) => onToken?.(acc), (m) => onStatus?.(m));
      if (text.trim()) return { text: text.trim(), byModel: true };
    } catch {
      /* любая ошибка модели — тихий откат на правила */
    }
  }

  return { text: advisorReply(question, s), byModel: false, note: FALLBACK_NOTE };
}

/** Для строки статуса в шапке чата: есть ли модель (по последнему опросу) */
export function advisorModelReady(): boolean {
  return aiModelCached();
}

export { AI_MODEL_LABEL };
