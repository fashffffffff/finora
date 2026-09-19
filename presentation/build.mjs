/* Finora — презентация для заявки. Тёмно-золотой бренд, 10 слайдов. */
import pptxgen from "pptxgenjs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 × 7.5"
pres.author = "Рахматуллин Динар";
pres.title = "Finora — локальный анализ личных финансов";

// ---- палитра (константы, нигде не отступаем) ----
const BG = "14110C";      // фон
const SURFACE = "1C1812"; // карточки
const BORDER = "352C1D";  // границы
const GOLD = "D4A542";    // основной акцент
const GOLD_SOFT = "8A6D2F";
const TEXT = "EFE9DD";
const MUTED = "A99F8C";
const FAINT = "6E6552";
const INCOME = "8FBA72";
const EXPENSE = "E0705E";

const F = "Segoe UI";
const W = 13.33, H = 7.5, M = 0.55;
const ASSETS = "/Users/fash/.zcode/workspace/default/finora/website/assets";

const ingot = (s, x, y, w, h, color, opacity = 1) =>
  s.addShape("trapezoid", { x, y, w, h, fill: { color, transparency: Math.round((1 - opacity) * 100) }, line: { type: "none" } });

// фирменный мотив: три слитка (пирамида)
const ingots = (s, x, y, scale = 1) => {
  const w = 0.34 * scale, h = 0.2 * scale, g = 0.1 * scale;
  ingot(s, x, y + h + 0.06 * scale, w, h, GOLD_SOFT);
  ingot(s, x + w + g, y + h + 0.06 * scale, w, h, GOLD_SOFT);
  ingot(s, x + (w + g) / 2, y, w, h, GOLD);
};

const pageNum = (s, n) =>
  s.addText(String(n).padStart(2, "0"), { x: W - 1.0, y: H - 0.52, w: 0.5, h: 0.3, fontSize: 12, fontFace: F, color: FAINT, align: "right", margin: 0 });

const kicker = (s, text) =>
  s.addText(text.toUpperCase(), { x: M, y: 0.42, w: 6, h: 0.3, fontSize: 12.5, fontFace: F, bold: true, color: GOLD, charSpacing: 3, margin: 0 });

const slideTitle = (s, text, y = 0.74) =>
  s.addText(text, { x: M, y, w: 9.5, h: 0.75, fontSize: 32, fontFace: F, bold: true, color: TEXT, margin: 0 });

const card = (s, x, y, w, h) =>
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.09, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });

/* ================= 1. ТИТУЛ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  s.addImage({ path: "/Users/fash/.zcode/workspace/default/finora/app/app-icon.png", x: M, y: 0.62, w: 1.35, h: 1.35 });
  s.addText("FINORA", { x: M, y: 2.35, w: 11, h: 1.25, fontSize: 72, fontFace: F, bold: true, color: TEXT, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Локальный анализ личных финансов для macOS", options: { fontSize: 22, color: GOLD, breakLine: true } },
    { text: "Все операции — в одном окне. Данные — только у вас.", options: { fontSize: 17, color: MUTED } },
  ], { x: M, y: 3.72, w: 10.5, h: 1.0, fontFace: F, margin: 0, paraSpaceAfter: 8 });

  // разделительная линия + подписи автора
  s.addShape("line", { x: M, y: 6.15, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
  s.addText([
    { text: "Рахматуллин Динар", options: { bold: true, color: TEXT } },
    { text: "   ·   МГТУ им. Н.Э. Баумана, ИУ5   ·   Венчурные игры 2026", options: { color: MUTED } },
  ], { x: M, y: 6.35, w: 10, h: 0.4, fontSize: 14, fontFace: F, margin: 0 });
  ingots(s, W - 1.55, 6.28, 1.4);
}

/* ================= 2. ПРОБЛЕМА ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Проблема");
  slideTitle(s, "Деньги есть везде. Понимания — нигде.");
  const rows = [
    ["300+", "операций в месяц", "у активного пользователя — банковское приложение показывает список, но не картину: на что реально уходят деньги"],
    ["100%", "данных — на чужих серверах", "сторонние агрегаторы хранят выписки в облаке и требуют доступ к банку навсегда"],
    ["0", "гарантий приватности", "облачный «умный анализ» означает отправку полной финансовой истории сторонней модели"],
  ];
  let y = 2.0;
  rows.forEach(([num, lead, text], i) => {
    s.addText(num, { x: M, y, w: 2.3, h: 1.15, fontSize: 60, fontFace: F, bold: true, color: GOLD, align: "left", margin: 0 });
    s.addText([
      { text: lead, options: { bold: true, fontSize: 17, color: TEXT, breakLine: true } },
      { text, options: { fontSize: 14, color: MUTED } },
    ], { x: 3.1, y: y + 0.08, w: 9.4, h: 1.2, fontFace: F, margin: 0, paraSpaceAfter: 4 });
    if (i < 2) s.addShape("line", { x: M, y: y + 1.42, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
    y += 1.68;
  });
  s.addText("Источники: поведенческие паттерны активных пользователей; устройства рынка PFM-сервисов (иллюстративно).", {
    x: M, y: H - 0.52, w: 9, h: 0.3, fontSize: 12, fontFace: F, color: FAINT, margin: 0 });
  pageNum(s, 2);
}

/* ================= 3. РЕШЕНИЕ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Решение");
  s.addText([
    { text: "Все деньги — в одном окне.", options: { color: TEXT, breakLine: true } },
    { text: "Данные — только у вас.", options: { color: GOLD } },
  ], { x: M, y: 1.15, w: 6.6, h: 2.6, fontSize: 40, fontFace: F, bold: true, margin: 0, lineSpacing: 48 });
  s.addText("Finora — локальное приложение для macOS: операции приходят из банка, раскладываются по категориям и превращаются в понятную статистику и цели. Обработка и хранение — только на компьютере пользователя.", {
    x: M, y: 4.1, w: 6.2, h: 1.7, fontSize: 16, fontFace: F, color: MUTED, margin: 0, lineSpacing: 24 });

  const items = [
    ["Все операции в одном месте", "история из банка, поиск, фильтры, любой период"],
    ["Статистика без усилий", "категории, динамика, крупные траты, наблюдения"],
    ["Цели вместо тревоги", "копить на ноутбук или поездку с видимым прогрессом"],
    ["Готовность к локальному AI", "слой классификации заменяется без правок интерфейса"],
  ];
  let y = 1.05;
  items.forEach(([t, d]) => {
    card(s, 7.35, y, 5.42, 1.28);
    s.addShape("rect", { x: 7.65, y: y + 0.28, w: 0.14, h: 0.14, fill: { color: GOLD }, line: { type: "none" } });
    s.addText([
      { text: t, options: { bold: true, fontSize: 15.5, color: TEXT, breakLine: true } },
      { text: d, options: { fontSize: 13, color: MUTED } },
    ], { x: 7.98, y: y + 0.17, w: 4.6, h: 1.0, fontFace: F, margin: 0, paraSpaceAfter: 3 });
    y += 1.48;
  });
  pageNum(s, 3);
}

/* ================= 4. ПРОДУКТ — ДАШБОРД ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Продукт");
  slideTitle(s, "Дашборд: вся картина за любой период");
  const rows = [
    ["Баланс, доходы, расходы", "главные цифры периода и свободные деньги — то, что можно отложить"],
    ["Наблюдения о привычках", "подписки, норма сбережений, траты выходных — на правилах, без отправки данных"],
    ["Гибкие периоды", "месяц, квартал, год или произвольный диапазон — статистика пересчитывается мгновенно"],
  ];
  let y = 2.15;
  rows.forEach(([t, d]) => {
    s.addShape("rect", { x: M, y: y + 0.07, w: 0.14, h: 0.14, fill: { color: GOLD }, line: { type: "none" } });
    s.addText([
      { text: t, options: { bold: true, fontSize: 16, color: TEXT, breakLine: true } },
      { text: d, options: { fontSize: 13.5, color: MUTED } },
    ], { x: M + 0.33, y, w: 4.6, h: 1.35, fontFace: F, margin: 0, paraSpaceAfter: 4 });
    y += 1.52;
  });
  s.addText("Экран «Главная» прототипа · демонстрационные данные, 12 месяцев истории", {
    x: M, y: 6.75, w: 6, h: 0.3, fontSize: 12, fontFace: F, color: FAINT, margin: 0 });
  // скриншот в рамке
  const iw = 7.1, ih = iw * 900 / 1512;
  s.addShape("roundRect", { x: 5.75 - 0.06, y: 1.95 - 0.06, w: iw + 0.12, h: ih + 0.12, rectRadius: 0.08, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });
  s.addImage({ path: `${ASSETS}/app-dashboard.png`, x: 5.75, y: 1.95, w: iw, h: ih, rounding: false });
  pageNum(s, 4);
}

/* ================= 5. ПРОДУКТ — РАЗОБРАТЬ И АНАЛИТИКА ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Продукт");
  slideTitle(s, "Честность вместо догадок");
  const iw = 6.0, ih = iw * 900 / 1512;
  // левый скрин — Разобрать
  s.addShape("roundRect", { x: M - 0.05, y: 1.98, w: iw + 0.1, h: ih + 0.1, rectRadius: 0.08, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });
  s.addImage({ path: `${ASSETS}/app-review.png`, x: M, y: 2.03, w: iw, h: ih });
  s.addText([
    { text: "Разобрать", options: { bold: true, fontSize: 15, color: GOLD, breakLine: true } },
    { text: "неопределённые операции попадают в очередь: «перевод 25 000 ₽ — на что потрачены?» — один клик, и статистика точна", options: { fontSize: 13, color: MUTED } },
  ], { x: M, y: 2.03 + ih + 0.18, w: iw, h: 1.1, fontFace: F, margin: 0, paraSpaceAfter: 3 });
  // правый скрин — Аналитика
  const x2 = M + iw + 0.33;
  s.addShape("roundRect", { x: x2 - 0.05, y: 1.98, w: iw + 0.1, h: ih + 0.1, rectRadius: 0.08, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });
  s.addImage({ path: `${ASSETS}/app-analytics.png`, x: x2, y: 2.03, w: iw, h: ih });
  s.addText([
    { text: "Аналитика", options: { bold: true, fontSize: 15, color: GOLD, breakLine: true } },
    { text: "структура расходов, динамика за 12 месяцев, крупные траты и сравнение периодов", options: { fontSize: 13, color: MUTED } },
  ], { x: x2, y: 2.03 + ih + 0.18, w: iw, h: 1.1, fontFace: F, margin: 0, paraSpaceAfter: 3 });
  pageNum(s, 5);
}

/* ================= 6. КАК РАБОТАЕТ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Как работает");
  slideTitle(s, "Конвейер данных — целиком на вашем Mac");
  const steps = [
    ["Банк", "история операций:\nсейчас — демо-источник,\nэтап 2 — Т-Банк"],
    ["Нормализация", "единый формат,\nтипы операций,\nпереводы между счетами"],
    ["Классификатор", "категории по правилам;\nэтап 3 — локальная\nAI-модель"],
    ["Аналитика и цели", "сводки, динамика,\nкрупные траты,\nнаблюдения"],
  ];
  const bw = 2.78, gap = 0.34;
  let x = M;
  steps.forEach(([t, d], i) => {
    card(s, x, 2.3, bw, 2.3);
    s.addText(String(i + 1), { x: x + 0.22, y: 2.5, w: 0.8, h: 0.55, fontSize: 30, fontFace: F, bold: true, color: GOLD, margin: 0 });
    s.addText(t, { x: x + 0.22, y: 3.12, w: bw - 0.44, h: 0.4, fontSize: 16.5, fontFace: F, bold: true, color: TEXT, margin: 0 });
    s.addText(d, { x: x + 0.22, y: 3.56, w: bw - 0.44, h: 0.95, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0, lineSpacing: 16 });
    if (i < 3) s.addText("→", { x: x + bw + 0.02, y: 3.15, w: gap, h: 0.5, fontSize: 22, fontFace: F, color: GOLD, align: "center", margin: 0 });
    x += bw + gap;
  });
  s.addShape("line", { x: M, y: 5.35, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
  s.addText([
    { text: "Замена слоёв — без переделки: ", options: { bold: true, color: TEXT } },
    { text: "демо-источник меняется на настоящий банк, правила — на локальную AI-модель. Интерфейс, хранилище и аналитика остаются как есть.", options: { color: MUTED } },
  ], { x: M, y: 5.6, w: 12.2, h: 0.9, fontSize: 15, fontFace: F, margin: 0, lineSpacing: 22 });
  pageNum(s, 6);
}

/* ================= 7. ПРИВАТНОСТЬ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Приватность");
  slideTitle(s, "Privacy-first — это архитектура, а не настройка", 0.86);
  const stats = [["0", "серверов"], ["0", "аккаунтов"], ["1", "владелец данных"]];
  let x = M;
  stats.forEach(([v, l]) => {
    s.addText(v, { x, y: 2.0, w: 3.9, h: 1.3, fontSize: 88, fontFace: F, bold: true, color: GOLD, margin: 0 });
    s.addText(l, { x: x + 0.06, y: 3.45, w: 3.9, h: 0.4, fontSize: 16, fontFace: F, color: MUTED, margin: 0 });
    x += 4.15;
  });
  s.addShape("line", { x: M, y: 4.35, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
  const rows = [
    ["Данные не покидают компьютер", "хранение и аналитика — локально, экспорт — в любой момент"],
    ["Доступ к банку — только чтение", "без права платежей и без пароля от банка"],
    ["Облачный AI исключён", "будущий анализ — только локальной моделью на Mac, или никак"],
  ];
  let y = 4.65;
  rows.forEach(([t, d]) => {
    s.addShape("rect", { x: M, y: y + 0.07, w: 0.14, h: 0.14, fill: { color: GOLD }, line: { type: "none" } });
    s.addText([
      { text: t + "  ", options: { bold: true, fontSize: 15.5, color: TEXT } },
      { text: "— " + d, options: { fontSize: 14, color: MUTED } },
    ], { x: M + 0.33, y, w: 11.8, h: 0.5, fontFace: F, margin: 0 });
    y += 0.62;
  });
  pageNum(s, 7);
}

/* ================= 8. ТЕХНОЛОГИИ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Технологии");
  slideTitle(s, "Слои вместо монолита");
  // левая колонка — стек
  card(s, M, 2.0, 5.9, 4.5);
  s.addText("Стек", { x: M + 0.3, y: 2.25, w: 3, h: 0.4, fontSize: 16, fontFace: F, bold: true, color: GOLD, margin: 0 });
  const stack = [
    ["Tauri 2 + Rust (Cargo)", "нативная оболочка macOS, лёгкая и быстрая"],
    ["TypeScript без фреймворков", "интерфейс, роутер и компоненты — свои"],
    ["Собственные SVG-графики", "донаты, столбцы, спарклайны — без библиотек"],
    ["Локальное хранение", "данные и настройки — на компьютере пользователя"],
  ];
  let y = 2.8;
  stack.forEach(([t, d]) => {
    s.addText([
      { text: t, options: { bold: true, fontSize: 14.5, color: TEXT, breakLine: true } },
      { text: d, options: { fontSize: 12.5, color: MUTED } },
    ], { x: M + 0.3, y, w: 5.3, h: 0.9, fontFace: F, margin: 0, paraSpaceAfter: 3 });
    y += 0.92;
  });
  // правая колонка — подключаемые модули
  card(s, M + 6.2, 2.0, 6.05, 4.5);
  s.addText("Подключаемые модули", { x: M + 6.5, y: 2.25, w: 4.5, h: 0.4, fontSize: 16, fontFace: F, bold: true, color: GOLD, margin: 0 });
  const mods = [
    ["BankProvider", "MockBankProvider — сейчас", "TBankProvider — этап 2"],
    ["Classifier", "правила — сейчас", "LocalAI (Ollama) — этап 3"],
  ];
  let my = 2.85;
  mods.forEach(([name, now, plan]) => {
    s.addText(name, { x: M + 6.5, y: my, w: 5.5, h: 0.35, fontSize: 15, fontFace: F, bold: true, color: TEXT, margin: 0 });
    s.addShape("roundRect", { x: M + 6.5, y: my + 0.42, w: 2.62, h: 0.78, rectRadius: 0.07, fill: { color: "241F16" }, line: { color: BORDER, width: 1 } });
    s.addText(now, { x: M + 6.6, y: my + 0.42, w: 2.44, h: 0.78, fontSize: 11.5, fontFace: F, color: MUTED, align: "center", valign: "middle", margin: 0 });
    s.addText("→", { x: M + 9.14, y: my + 0.52, w: 0.4, h: 0.5, fontSize: 18, fontFace: F, color: GOLD, align: "center", margin: 0 });
    s.addShape("roundRect", { x: M + 9.56, y: my + 0.42, w: 2.62, h: 0.78, rectRadius: 0.07, fill: { color: "241F16" }, line: { color: GOLD_SOFT, width: 1, dashType: "dash" } });
    s.addText(plan, { x: M + 9.66, y: my + 0.42, w: 2.44, h: 0.78, fontSize: 11.5, fontFace: F, color: MUTED, align: "center", valign: "middle", margin: 0 });
    my += 1.62;
  });
  s.addText("Контракты слоёв зафиксированы: новый банк или модель = один класс, без правок интерфейса и данных.", {
    x: M + 6.5, y: my + 0.1, w: 5.4, h: 0.9, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0, lineSpacing: 17 });
  pageNum(s, 8);
}

/* ================= 9. ДОРОЖНАЯ КАРТА ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  kicker(s, "Дорожная карта");
  slideTitle(s, "От прототипа — к локальному AI");
  const steps = [
    ["Этап 1", "Прототип", "готово", "9 экранов, 12 месяцев демо-истории, правила классификации, цели, темы", true],
    ["Этап 2", "Реальный банк", "в работе", "TBankProvider на Rust-ядре, авто-синхронизация, локальная БД", false],
    ["Этап 3", "Локальный AI", "план", "разбор сложных операций и советы «где сэкономить» на Ollama", false],
    ["Этап 4", "Другие банки", "план", "новый банк = один класс-провайдер за стабильным контрактом", false],
  ];
  // линия времени
  s.addShape("line", { x: M + 0.3, y: 2.85, w: 11.6, h: 0, line: { color: BORDER, width: 2 } });
  const cw = 2.95;
  let x = M;
  steps.forEach(([when, t, st, d, done], i) => {
    s.addShape("oval", { x: x + 0.14, y: 2.68, w: 0.36, h: 0.36, fill: { color: done ? GOLD : "241F16" }, line: { color: GOLD, width: 1.5 } });
    s.addText(when.toUpperCase(), { x, y: 2.15, w: cw, h: 0.3, fontSize: 12, fontFace: F, bold: true, color: GOLD, charSpacing: 2, margin: 0 });
    s.addText(t, { x, y: 3.25, w: cw, h: 0.45, fontSize: 18, fontFace: F, bold: true, color: TEXT, margin: 0 });
    s.addText(st.toUpperCase(), { x, y: 3.72, w: cw, h: 0.3, fontSize: 11.5, fontFace: F, bold: true, color: done ? INCOME : FAINT, charSpacing: 2, margin: 0 });
    s.addText(d, { x, y: 4.1, w: cw - 0.25, h: 1.5, fontSize: 13, fontFace: F, color: MUTED, margin: 0, lineSpacing: 18 });
    x += cw + 0.13;
  });
  s.addShape("line", { x: M, y: 6.1, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
  s.addText([
    { text: "Принцип приватности неизменен на всех этапах: ", options: { bold: true, color: TEXT } },
    { text: "никаких облаков, никаких облачных моделей, обработка — только на устройстве пользователя.", options: { color: MUTED } },
  ], { x: M, y: 6.32, w: 12.2, h: 0.7, fontSize: 14.5, fontFace: F, margin: 0, lineSpacing: 21 });
  pageNum(s, 9);
}

/* ================= 10. ФИНАЛ ================= */
{
  const s = pres.addSlide();
  s.background = { color: BG };
  ingots(s, M, 0.55, 1.2);
  s.addText([
    { text: "Финансы — самое личное.", options: { color: TEXT, breakLine: true } },
    { text: "И оно остаётся у вас.", options: { color: GOLD } },
  ], { x: M, y: 1.9, w: 12, h: 2.2, fontSize: 44, fontFace: F, bold: true, margin: 0, lineSpacing: 52 });
  s.addText("Посмотрите живую демонстрацию: сайт и интерактивный прототип", {
    x: M, y: 4.25, w: 10, h: 0.45, fontSize: 17, fontFace: F, color: MUTED, margin: 0 });
  s.addShape("roundRect", { x: M, y: 4.85, w: 6.1, h: 0.78, rectRadius: 0.1, fill: { color: GOLD }, line: { type: "none" } });
  s.addText("finora-app-ai.netlify.app", { x: M, y: 4.85, w: 6.1, h: 0.78, fontSize: 19, fontFace: F, bold: true, color: "241A04", align: "center", valign: "middle", margin: 0 });
  s.addShape("line", { x: M, y: 6.15, w: W - 2 * M, h: 0, line: { color: BORDER, width: 1 } });
  s.addText([
    { text: "Рахматуллин Динар   ", options: { bold: true, color: TEXT } },
    { text: "dinar.rahmatulin2001@gmail.com   ·   @zxcghoulkaneki   ·   МГТУ им. Н.Э. Баумана, ИУ5", options: { color: MUTED } },
  ], { x: M, y: 6.35, w: 12.2, h: 0.4, fontSize: 13.5, fontFace: F, margin: 0 });
  pageNum(s, 10);
}

await pres.writeFile({ fileName: "/Users/fash/.zcode/workspace/default/finora/presentation/Finora-презентация.pptx" });
console.log("pptx written");
