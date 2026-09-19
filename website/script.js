/* ============================================================
   Finora — сайт: поведение (анимации, навигация, живой дашборд)
   ============================================================ */

/* появление при скролле */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('vis');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* шапка при прокрутке */
const header = document.querySelector('.header');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 12);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* мобильное меню */
const burger = document.querySelector('.burger');
const navLinks = document.querySelector('.nav-links');
burger?.addEventListener('click', () => {
  const open = navLinks?.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(!!open));
});
navLinks?.addEventListener('click', (e) => {
  if (e.target.closest('a')) navLinks.classList.remove('open');
});

/* лёгкий 3D-наклон карточек интерфейса */
document.querySelectorAll('.shot-img').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-6px) rotate3d(${-y}, ${x}, 0, 2.2deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* живой мини-дашборд: ротация последних операций */
const TX_FEED = [
  { m: 'Пятёрочка', s: 'Продукты · 19:06', a: '−1 287,4 ₽', in: false, ico: 'cart' },
  { m: 'Интех Групп', s: 'Зарплата · 09:41', a: '+148 500 ₽', in: true, ico: 'brief' },
  { m: 'Яндекс Go', s: 'Транспорт · 18:22', a: '−568,9 ₽', in: false, ico: 'car' },
  { m: 'Кофе Хауз', s: 'Кафе · 08:15', a: '−342 ₽', in: false, ico: 'cup' },
  { m: 'Кэшбэк', s: 'Начисление · 05:00', a: '+1 483 ₽', in: true, ico: 'percent' },
  { m: 'Ozon', s: 'Покупка · 21:34', a: '−3 940 ₽', in: false, ico: 'box' },
  { m: 'Подработка', s: 'Дизайн · 14:02', a: '+24 000 ₽', in: true, ico: 'laptop' },
];
const ICONS = {
  cart: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6.2" cy="19.6" r="1.5"/><circle cx="17.3" cy="19.6" r="1.5"/><path d="M3 4.5h2.2l2.4 10.6h9.9l2.4-7.6H6.1"/></svg>',
  brief: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.2h6v2.3"/></svg>',
  car: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5.5" y="3.5" width="13" height="13.5" rx="3"/><path d="M5.5 11.5h13M7.5 20.5 9 17h6l1.5 3.5"/></svg>',
  cup: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 8.5h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.8a2.4 2.4 0 0 1 0 4.8H16"/></svg>',
  percent: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.2 14.8l5.6-5.6"/></svg>',
  box: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3.5 20 7.7v8.6L12 20.5 4 16.3V7.7z"/><path d="M4 7.7l8 4.2 8-4.2"/></svg>',
  laptop: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4.5" y="5" width="15" height="10" rx="1.8"/><path d="M2.8 18.5h18.4"/></svg>',
};

const feed = document.getElementById('tx-feed');
if (feed) {
  let idx = 0;
  const pushTx = () => {
    const t = TX_FEED[idx % TX_FEED.length];
    idx++;
    const row = document.createElement('div');
    row.className = `mini-tx-row ${t.in ? 'in' : ''} new`;
    row.innerHTML = `
      <span class="mini-tx-ico">${ICONS[t.ico]}</span>
      <span><span class="m">${t.m}</span><br/><span class="s">${t.s}</span></span>
      <span class="a num">${t.a}</span>`;
    feed.prepend(row);
    while (feed.children.length > 3) feed.lastElementChild.remove();
  };
  // стартовые три
  for (let i = 0; i < 3; i++) pushTx();
  feed.querySelectorAll('.mini-tx-row').forEach((r) => r.classList.remove('new'));
  setInterval(pushTx, 3400);
}

/* счётчик баланса в hero */
const balEl = document.getElementById('mini-balance');
if (balEl) {
  const target = 188838.39;
  const t0 = performance.now();
  const dur = 1600;
  const fmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    balEl.textContent = fmt.format(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
