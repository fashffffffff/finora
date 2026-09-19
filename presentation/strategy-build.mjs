/* Finora — стратегия для инвесторов. Тёмно-золотой бренд, 12 слайдов. */
import pptxgen from "pptxgenjs";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Рахматуллин Динар";
pres.title = "Finora — личный финансовый агент (стратегия)";

const BG = "14110C", SURFACE = "1C1812", BORDER = "352C1D";
const GOLD = "D4A542", GOLD_SOFT = "8A6D2F";
const TEXT = "EFE9DD", MUTED = "A99F8C", FAINT = "6E6552";
const INCOME = "8FBA72", EXPENSE = "E0705E";
const F = "Segoe UI";
const W = 13.33, H = 7.5, M = 0.55;
const ASSETS = "/Users/fash/Desktop/Finora-dev/website/assets";

const ingot = (s, x, y, w, h, color, opacity = 1) =>
  s.addShape("trapezoid", { x, y, w, h, fill: { color, transparency: Math.round((1 - opacity) * 100) }, line: { type: "none" } });
const ingots = (s, x, y, scale = 1) => {
  const w = 0.34 * scale, h = 0.2 * scale, g = 0.1 * scale;
  ingot(s, x, y + h + 0.06 * scale, w, h, GOLD_SOFT);
  ingot(s, x + w + g, y + h + 0.06 * scale, w, h, GOLD_SOFT);
  ingot(s, x + (w + g) / 2, y, w, h, GOLD);
};
const pageNum = (s, n) =>
  s.addText(String(n).padStart(2, "0"), { x: W - 1.0, y: H - 0.52, w: 0.5, h: 0.3, fontSize: 12, fontFace: F, color: FAINT, align: "right", margin: 0 });
const kicker = (s, text) =>
  s.addText(text.toUpperCase(), { x: M, y: 0.42, w: 9, h: 0.3, fontSize: 12.5, fontFace: F, bold: true, color: GOLD, charSpacing: 3, margin: 0 });
const bg = (s) => {
  s.background = { color: BG };
  s.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: BG }, line: { type: "none" } });
};
const h1 = (s, text, y = 0.78) =>
  s.addText(text, { x: M, y, w: W - 2 * M, h: 0.75, fontSize: 30, fontFace: F, bold: true, color: TEXT, margin: 0 });
const card = (s, x, y, w, h) =>
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.09, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });

function bullets(s, x, y, w, items, opts = {}) {
  const size = opts.size ?? 14, gap = opts.gap ?? 0.52;
  items.forEach((it, i) => {
    s.addShape("ellipse", { x, y: y + i * gap + 0.09, w: 0.09, h: 0.09, fill: { color: it.c || GOLD }, line: { type: "none" } });
    s.addText(it.b ? [
      { text: it.t + "  ", options: { bold: true, color: TEXT } },
      { text: it.d, options: { color: MUTED } },
    ] : [{ text: it.t, options: { color: it.c2 || TEXT } }],
      { x: x + 0.22, y: y + i * gap - 0.05, w: w - 0.3, h: gap + 0.1, fontSize: size, fontFace: F, margin: 0, valign: "top" });
  });
}

/* 01 — титул */
let s = pres.addSlide(); bg(s);
s.addText("FINORA", { x: M, y: 2.0, w: 8, h: 1.1, fontSize: 60, fontFace: F, bold: true, color: GOLD, charSpacing: 6, margin: 0 });
s.addText("Личный финансовый агент, который живёт у тебя,\nа не в облаке", { x: M, y: 3.15, w: 9.5, h: 1.0, fontSize: 22, fontFace: F, color: TEXT, margin: 0 });
s.addText("Стратегия продукта и рынка · сентябрь 2026", { x: M, y: 4.25, w: 8, h: 0.4, fontSize: 14, fontFace: F, color: MUTED, margin: 0 });
ingots(s, M, 1.45, 1.2);
s.addShape("roundRect", { x: 9.6, y: 2.1, w: 3.15, h: 2.9, rectRadius: 0.09, fill: { color: SURFACE }, line: { color: BORDER, width: 1 } });
s.addImage({ path: `${ASSETS}/app-dashboard.png`, x: 9.75, y: 2.25, w: 2.85, h: 2.6, sizing: { type: "contain", w: 2.85, h: 2.6 } });
pageNum(s, 1);

/* 02 — проблема */
s = pres.addSlide(); bg(s); kicker(s, "Проблема"); h1(s, "Деньги считают все — понимать их не помогает никто");
const prob = [
  ["Банки показывают прошлое", "Статистика «что было» есть в каждом приложении. Никто не объясняет, что делать и почему это происходит."],
  ["AI банков — облако и один банк", "Ассистенты (Тая, GigaChat) видят только свой банк, отправляют данные в облако и не разбирают траты проактивно."],
  ["Финтрекеры — ручной труд", "Десятки приложений учёта без агента: сам вноси, сам разбирай. И оплата из РФ затруднена."],
];
prob.forEach(([t, d], i) => {
  const x = M + i * 4.18;
  card(s, x, 1.85, 3.95, 3.4);
  s.addText(t, { x: x + 0.25, y: 2.1, w: 3.45, h: 0.9, fontSize: 17, fontFace: F, bold: true, color: GOLD, margin: 0 });
  s.addText(d, { x: x + 0.25, y: 3.0, w: 3.45, h: 2.1, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
});
s.addText("Результат: у человека есть графики, но нет того, кто помогает с деньгами — и это при том, что данные лежат где угодно, только не у него.",
  { x: M, y: 5.6, w: W - 2 * M, h: 0.9, fontSize: 15, fontFace: F, italic: true, color: TEXT, margin: 0 });
pageNum(s, 2);

/* 03 — решение */
s = pres.addSlide(); bg(s); kicker(s, "Решение"); h1(s, "Finora — агент, а не трекер");
bullets(s, M, 1.95, 7.2, [
  { b: true, t: "Сам разбирает операции", d: "непонятные траты — вопрос от агента с кнопками «Ответить» / «Не важно»" },
  { b: true, t: "Отвечает с твоими цифрами", d: "баланс, категории и цели считает приложение — модель не может наврать в числах" },
  { b: true, t: "Работает локально", d: "модель запускается на устройстве: данные не покидают его архитектурно, а не обещанием" },
  { b: true, t: "Кросс-банковый", d: "все счета в одном месте — банковские ассистенты видят только свой банк" },
  { b: true, t: "Дообучена своя модель", d: "QLoRA поверх открытой Qwen3.5-4B: адаптер 20 МБ, обучение 13 минут на Mac" },
], { size: 15, gap: 0.82 });
card(s, 8.3, 1.75, 4.45, 4.6);
s.addImage({ path: `${ASSETS}/app-review.png`, x: 8.5, y: 1.95, w: 4.05, h: 4.2, sizing: { type: "contain", w: 4.05, h: 4.2 } });
pageNum(s, 3);

/* 04 — три этажа */
s = pres.addSlide(); bg(s); kicker(s, "Продукт"); h1(s, "Три этажа одного движка");
const tiers = [
  ["LOCAL", "Сейчас · Mac", "Локальная модель на устройстве, приватность архитектурно, нулевые переменные затраты. Разовая покупка 1 490–2 990 ₽.", GOLD],
  ["CLOUD", "6–18 месяцев", "Веб-версия и Android, облачные модели в RU-юрисдикции (GigaChat / YandexGPT / Qwen). Подписка 199–299 ₽/мес.", GOLD_SOFT],
  ["B2B", "Параллельно", "Белый лейбл движка банкам: AI-советник в приложении банка без отправки данных клиентов в облако. Лицензия.", INCOME],
];
tiers.forEach(([t, when, d, c], i) => {
  const x = M + i * 4.18;
  card(s, x, 1.85, 3.95, 3.6);
  s.addText(t, { x: x + 0.25, y: 2.1, w: 3.4, h: 0.5, fontSize: 22, fontFace: F, bold: true, color: c, charSpacing: 2, margin: 0 });
  s.addText(when, { x: x + 0.25, y: 2.62, w: 3.4, h: 0.35, fontSize: 12, fontFace: F, bold: true, color: FAINT, charSpacing: 2, margin: 0 });
  s.addText(d, { x: x + 0.25, y: 3.05, w: 3.45, h: 2.2, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
});
s.addText("Один движок, три источника выручки. Локальность — не ограничение, а аргумент и для розницы, и для банков.",
  { x: M, y: 5.75, w: W - 2 * M, h: 0.8, fontSize: 15, fontFace: F, italic: true, color: TEXT, margin: 0 });
pageNum(s, 4);

/* 05 — рынок */
s = pres.addSlide(); bg(s); kicker(s, "Рынок"); h1(s, "Рынок платит, но болеет — и это окно входа");
bullets(s, M, 1.95, 12.2, [
  { b: true, t: "Подписки есть и они платные:", d: "Дзен-мани — 1 490 ₽/год, CoinKeeper — 999–1 790 ₽/год. Люди уже привыкли платить за фин-сервисы." },
  { b: true, t: "Оплата из РФ затруднена:", d: "зарубежные сторы не принимают российские карты (обход с комиссией 450–550 ₽). У нас — прямые рублёвые платежи с первого дня." },
  { b: true, t: "AI-ассистенты банков — облачные:", d: "«Тая» и «Вселенная ассистентов» Т-Банка, GigaChat Сбера — внутри одного банка, без агента по тратам. Локального аналога нет." },
  { b: true, t: "Облачные LLM дешевеют:", d: "GigaChat Lite подешевел на 67,5% с октября 2025 (до 0,065 ₽/1000 токенов) — облачная версия становится маржинальной." },
  { b: true, t: "Регуляторный ветер:", d: "тренд на локализацию данных в РФ играет за локальную архитектуру." },
], { size: 15, gap: 0.86 });
pageNum(s, 5);

/* 06 — экономика */
s = pres.addSlide(); bg(s); kicker(s, "Юнит-экономика"); h1(s, "Экономика сходится с запасом");
const econ = [
  ["70–220 ₽", "переменные затраты на самого активного облачного пользователя в месяц (GigaChat Lite, ~1,1 млн токенов)"],
  ["249 ₽/мес", "подписка Cloud: маржа положительная даже на тяжёлом пользователе; тариф «по использованию» снимает риск"],
  ["0 ₽", "переменные затраты в Local: модель на устройстве. Разовая покупка = почти 100% маржи"],
  ["1 контракт", "B2B-лицензия движка банку потенциально сопоставима с годовой розничной выручкой"],
];
econ.forEach(([big, d], i) => {
  const x = M + (i % 2) * 6.25, y = 1.9 + Math.floor(i / 2) * 2.25;
  card(s, x, y, 6.0, 2.0);
  s.addText(big, { x: x + 0.3, y: y + 0.2, w: 5.4, h: 0.7, fontSize: 30, fontFace: F, bold: true, color: GOLD, margin: 0 });
  s.addText(d, { x: x + 0.3, y: y + 0.95, w: 5.4, h: 1.0, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
});
pageNum(s, 6);

/* 07 — технология */
s = pres.addSlide(); bg(s); kicker(s, "Технология"); h1(s, "Свой движок — уже работающий прототип");
bullets(s, M, 1.95, 7.3, [
  { b: true, t: "QLoRA-дообучение на Mac:", d: "фреймворк Apple MLX, 4-битная база Qwen3.5-4B, 213 диалогов, цикл 13 минут" },
  { b: true, t: "Адаптер 20 МБ вместо 2,7 ГБ:", d: "обновление советника — секунды, без перекачки модели" },
  { b: true, t: "Metal-ускорение:", d: "модель на видеокарте Mac; единая память — без копий модели" },
  { b: true, t: "Числа не может наврать:", d: "баланс и категории считает приложение, модель формулирует ответ" },
  { b: true, t: "Прототип — нативное приложение:", d: "Tauri 2 + Rust, установщик ~6 МБ, 20 000 операций за ~11 мс" },
], { size: 15, gap: 0.82 });
card(s, 8.3, 1.75, 4.45, 4.6);
s.addImage({ path: `${ASSETS}/app-analytics.png`, x: 8.5, y: 1.95, w: 4.05, h: 4.2, sizing: { type: "contain", w: 4.05, h: 4.2 } });
pageNum(s, 7);

/* 08 — данные */
s = pres.addSlide(); bg(s); kicker(s, "Данные"); h1(s, "Как операции попадают в Finora");
bullets(s, M, 1.95, 12.2, [
  { b: true, t: "Шаг 1 — импорт выписки:", d: "любой банк РФ отдаёт CSV/PDF за минуту. Легально, универсально, готово к MVP. «Перетащи файл — всё разложено»." },
  { b: true, t: "Шаг 2 — пуш-уведомления и SMS:", d: "полуавтоматизация без доступа к интернет-банку." },
  { b: true, t: "Шаг 3 — партнёрство с банком:", d: "та же продажа Этажа B2B: у партнёра данные текут напрямую." },
  { b: true, t: "Наличка — ручное добавление:", d: "два касания (+ скан чека позже). Гигиена, не дифференциатор." },
], { size: 15, gap: 0.86 });
s.addText("Открытого банковского API в РФ нет (нет аналога PSD2) — поэтому стратегия данных построена на выписках и партнёрствах, а не на хрупких обходах.",
  { x: M, y: 5.9, w: W - 2 * M, h: 0.9, fontSize: 14, fontFace: F, italic: true, color: MUTED, margin: 0 });
pageNum(s, 8);

/* 09 — go-to-market */
s = pres.addSlide(); bg(s); kicker(s, "Go-to-market"); h1(s, "Кому продаём и через какой контент");
card(s, M, 1.8, 6.0, 4.5);
s.addText("Первая аудитория", { x: M + 0.3, y: 2.05, w: 5.4, h: 0.4, fontSize: 17, fontFace: F, bold: true, color: GOLD, margin: 0 });
bullets(s, M + 0.3, 2.65, 5.5, [
  { t: "Фрилансеры и самозанятые — не хотят отдавать счета облакам" },
  { t: "Техно-аудитория Mac — ранние последователи, дают фидбек" },
  { t: "Люди с болью утечек данных — их в России десятки миллионов" },
], { size: 13.5, gap: 0.9 });
card(s, 6.8, 1.8, 6.0, 4.5);
s.addText("Каналы", { x: 7.1, y: 2.05, w: 5.4, h: 0.4, fontSize: 17, fontFace: F, bold: true, color: GOLD, margin: 0 });
bullets(s, 7.1, 2.65, 5.5, [
  { t: "VK Клипы + Telegram — основа продвижения в РФ" },
  { t: "YouTube Shorts — работает, несмотря на замедление" },
  { t: "TikTok — для глобальной версии (из РФ загрузки закрыты с 2022)" },
  { t: "Формат: «агент нашёл утечку 8 000 ₽/мес» — скрин диалога с цифрами" },
], { size: 13.5, gap: 0.8 });
pageNum(s, 9);

/* 10 — объем рынка */
s = pres.addSlide(); bg(s); kicker(s, "Объём рынка"); h1(s, "Оценка TAM / SAM / SOM");
const tam = [
  ["TAM ~100 млн", "пользователи онлайн-банкинга в РФ — рынок персональных финансов как таковой"],
  ["SAM 0,5–1 млрд ₽/год", "платящие подписчики финтрекеров (~300–700 тыс. человек × ~1 500 ₽/год) — те, кто готов платить за сервис"],
  ["SOM 3–8 млн ₽ (год 1)", "3–10 тыс. платящих в B2C + один B2B-пилот, сопоставимый с годовой розницей"],
];
tam.forEach(([big, d], i) => {
  const x = M + i * 4.18;
  card(s, x, 1.9, 3.95, 3.3);
  s.addText(big, { x: x + 0.25, y: 2.15, w: 3.45, h: 0.9, fontSize: 19, fontFace: F, bold: true, color: GOLD, margin: 0 });
  s.addText(d, { x: x + 0.25, y: 3.1, w: 3.45, h: 1.9, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
});
s.addText("Оценки консервативные; детальный пересчёт — после исследования цен и числа платящих у конкурентов.",
  { x: M, y: 5.55, w: W - 2 * M, h: 0.7, fontSize: 13, fontFace: F, italic: true, color: FAINT, margin: 0 });
pageNum(s, 10);

/* 11 — риски */
s = pres.addSlide(); bg(s); kicker(s, "Риски"); h1(s, "Видим риски — знаем, как закрываем");
const rows = [
  ["Банки скопируют", "Мы и есть поставщик для банков (B2B); кросс-банковость банк себе не сделает"],
  ["У банков уже есть AI", "Тая и GigaChat — облако и один банк; наш агент — локальный, кросс-банковый, проактивный"],
  ["Приватность — ниша", "Cloud-этаж для мейнстрима; локальность — дифференциатор и главный B2B-аргумент"],
  ["Mac-аудитория мала", "Cloud-этаж: веб + Android, модель на сервере в RU-юрисдикции"],
  ["API-расходы съедят подписку", "GigaChat Lite ~70–220 ₽/мес на самого активного; тариф «по использованию»"],
];
rows.forEach(([r, a], i) => {
  const y = 1.8 + i * 0.95;
  s.addText(r, { x: M, y, w: 3.6, h: 0.9, fontSize: 13.5, fontFace: F, bold: true, color: EXPENSE, margin: 0, valign: "top" });
  s.addText(a, { x: 4.4, y, w: 8.3, h: 0.9, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0, valign: "top" });
});
pageNum(s, 11);

/* 12 — роадмап + питч */
s = pres.addSlide(); bg(s); kicker(s, "Дорожная карта"); h1(s, "Что дальше");
bullets(s, M, 1.9, 12.2, [
  { b: true, t: "0–3 мес:", d: "парсер выписок CSV/PDF, лендинг с предзаказом, 10–15 интервью с аудиторией" },
  { b: true, t: "3–6 мес:", d: "релиз Local-версии (разовая покупка), агентные вопросы по тратам, история чата" },
  { b: true, t: "6–18 мес:", d: "Cloud-этаж: веб + Android, подписка, RU-облачные модели; питч B2B-пилота банкам" },
  { b: true, t: "Глобал:", d: "международная версия + TikTok/Shorts-продвижение за пределами РФ" },
], { size: 15, gap: 0.8 });
card(s, M, 5.1, W - 2 * M, 1.75);
s.addText([
  { text: "Питч:  ", options: { bold: true, color: GOLD } },
  { text: "«Финансовый агент, который живёт у тебя, а не в облаке: сам разбирает траты, сам спрашивает, работает офлайн — и уже работает. Прототип с дообученной моделью на Mac — сегодня; веб, Android и лицензия банкам — завтра».", options: { color: TEXT } },
], { x: M + 0.35, y: 5.35, w: W - 2 * M - 0.7, h: 1.3, fontSize: 15.5, fontFace: F, margin: 0 });
pageNum(s, 12);

await pres.writeFile({ fileName: "/Users/fash/Desktop/Finora-dev/strategy/Finora-стратегия.pptx" });
console.log("OK: strategy pptx written");
