/* ============================================================
   Finora — экран Dashboard (главная)
   ============================================================ */

import { state, currentBalance, pendingReview } from '../state/app';
import { catById } from '../data/categories';
import { balanceSeries, deltaPct, inRangeTxs, monthlySeries, summarize } from '../domain/analytics';
import { barChart, donut, sparkline, categoryBars } from '../core/charts';
import { icon } from '../core/icons';
import { dateLabel, esc, money, moneyShort, monthKeyLabel, pct, pluralOps, rangeAll, rangeLast, rangeLastMonth, rangeThisMonth, rangeYear, type DateRange } from '../core/utils';
import { emptyState, seg, statCard, topbar, txRow } from './common';

type QuickPeriod = 'month' | 'prev' | 'quarter' | 'year' | 'all';

const PERIODS: { v: QuickPeriod; t: string }[] = [
  { v: 'month', t: 'Месяц' },
  { v: 'prev', t: 'Прошлый' },
  { v: 'quarter', t: 'Квартал' },
  { v: 'year', t: 'Год' },
  { v: 'all', t: 'Всё' },
];

let quick: QuickPeriod = 'month';
let customRange: DateRange | null = null;

function rangeFor(q: QuickPeriod): DateRange {
  switch (q) {
    case 'month': return rangeThisMonth();
    case 'prev': return rangeLastMonth();
    case 'quarter': return rangeLast(3, 'Квартал');
    case 'year': return rangeYear();
    case 'all': return rangeAll(state.txs.length ? [...state.txs].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date.slice(0, 10) : '2025-10-01');
  }
}

export function periodLabel(): string {
  return customRange ? customRange.label : rangeFor(quick).label;
}

export function renderDashboard(container: HTMLElement): void {
  const range = customRange ?? rangeFor(quick);
  const txs = state.txs;

  if (!txs.length) {
    container.innerHTML = `
      ${topbar('Главная', 'Обзор ваших денег')}
      <div class="view-inner"><div class="card">
        ${emptyState({
          icon: 'dashboard',
          title: 'Операций пока нет',
          text: 'Подключите Т-Банк — Finora загрузит историю операций и сразу покажет статистику.',
          action: { label: 'Подключить банк', act: 'go-bank' },
        })}
      </div></div>`;
    return;
  }

  const scoped = inRangeTxs(txs, range);
  const s = summarize(scoped);

  // прошлый период для дельт
  const prevRange = shiftRange(range);
  const prevS = summarize(inRangeTxs(txs, prevRange));

  const bal = currentBalance();
  const reviewCount = pendingReview().length;
  const recent = [...txs].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 7);

  // донат по категориям
  const topCats = s.byCategory.slice(0, 6);
  const otherSum = s.byCategory.slice(6).reduce((a, c) => a + c.total, 0);
  const donutSlices = topCats
    .map((c) => {
      const cat = catById(state.categories, c.id);
      return { id: c.id, label: cat.name, value: c.total, color: cat.color, icon: cat.icon };
    })
    .concat(otherSum > 0 ? [{ id: '_other', label: 'Остальные', value: otherSum, color: 'var(--surface-3)', icon: 'box' }] : []);

  // месячная динамика (6 мес)
  const months = monthlySeries(txs, 6);

  // спарклайн баланса за период
  const spark = balanceSeries(txs, range);

  // привычки
  const ins = insightsView(txs);

  container.innerHTML = `
  ${topbar(
    'Главная',
    `${periodLabel()} · ${pluralOps(scoped.length)}${state.settings.demoMode ? ' · демо-данные' : ''}`,
    seg('dash-period', PERIODS, quick) + `<button class="btn btn-ghost btn-icon" id="btn-custom-period" title="Свой период">${icon('calendar', 17)}</button>`,
  )}
  <div class="view"><div class="view-inner stagger" style="display:flex;flex-direction:column;gap:var(--sp-4)">

    <div class="grid g4">
      ${statCard({
        label: 'Общий баланс',
        value: money(bal, false, true),
        hint: 'карта • 4521 + накопительный',
        icon: 'wallet',
        tone: 'accent',
        id: 'stat-balance',
      })}
      ${statCard({
        label: 'Доходы',
        value: money(s.income, false, true),
        delta: deltaOf(s.income, prevS.income),
        icon: 'arrowDownLeft',
      })}
      ${statCard({
        label: 'Расходы',
        value: money(s.expense, false, true),
        delta: deltaOf(s.expense, prevS.expense),
        icon: 'arrowUpRight',
      })}
      ${statCard({
        label: 'Свободные деньги',
        value: money(s.net, false, true),
        hint: s.net >= 0 ? `${s.income ? Math.round((s.net / s.income) * 100) : 0}% от доходов отложено` : 'траты больше доходов',
        icon: 'trending',
        id: 'stat-net',
      })}
    </div>

    ${reviewCount > 0
      ? `<button class="note accent" data-act="go-review" style="cursor:pointer;text-align:left">
          <span class="note-icon" style="color:var(--accent-final)">${icon('question', 16)}</span>
          <span><b>${reviewCount === 1 ? '1 операция требует' : pluralReview(reviewCount)}</b> — Finora не смогла определить категорию. Разберите их, чтобы статистика была точной.</span>
          <span class="grow"></span>${icon('chevronRight', 16)}
        </button>`
      : ''}

    <div class="grid" style="grid-template-columns:1.6fr 1fr">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Динамика баланса</span>
          <span class="faint" style="font-size:12px">${esc(range.label)}</span>
        </div>
        <div style="margin:6px 0 2px"><span class="stat-value num">${money(bal, false, true)}</span>
          <span class="stat-delta ${sparkDir(spark)}" style="margin-left:10px">${sparkDelta(spark)}</span></div>
        <div id="spark-host" style="margin-top:10px"></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Расходы по категориям</span></div>
        <div class="donut-wrap">
          ${donut(donutSlices, 148, 20, 'Расходы', moneyShort(s.expense))}
          <div class="legend grow" style="min-width:170px">
            ${categoryBars(topCats.map((c) => {
              const cat = catById(state.categories, c.id);
              return { id: c.id, label: cat.name, value: c.total, color: cat.color, icon: cat.icon, count: c.count };
            }), topCats[0]?.total ?? 1)}
          </div>
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Доходы и расходы по месяцам</span>
          <span class="row" style="gap:12px;font-size:11.5px;color:var(--text-3)">
            <span class="row" style="gap:5px"><i class="dot" style="background:var(--income)"></i>доходы</span>
            <span class="row" style="gap:5px"><i class="dot" style="background:var(--expense)"></i>расходы</span>
          </span>
        </div>
        <div id="bars-host"></div>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">Последние операции</span>
          <button class="btn btn-soft btn-sm" data-act="go-tx">Все операции ${icon('arrowRight', 13)}</button>
        </div>
        <div class="tx-list">
          ${recent.map((t) => {
            const c = catById(state.categories, t.category);
            return txRow({
              id: t.id, merchant: t.merchant, description: t.description, date: t.date,
              amount: t.amount, type: t.type, direction: t.direction,
              category: t.category, catName: c.name, catColor: c.color, catIcon: c.icon,
              needsReview: t.needsReview, status: t.status, internal: t.internal, comment: t.comment,
            });
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">Наблюдения за месяц</span>
        <span class="chip">правила · ${monthKeyLabel(new Date().toISOString().slice(0, 7)).toLowerCase()}</span>
      </div>
      <div class="grid g3" style="gap:var(--sp-3)">
        ${ins}
      </div>
    </div>

  </div></div>`;

  // графики после вставки (нужны размеры)
  const sparkHost = container.querySelector('#spark-host') as HTMLElement;
  if (sparkHost) sparkHost.innerHTML = sparkline(spark, sparkHost.clientWidth || 600, 92);
  const barsHost = container.querySelector('#bars-host') as HTMLElement;
  if (barsHost) barsHost.innerHTML = barChart(months.map((m) => ({ label: m.label, income: m.income, expense: m.expense })), barsHost.clientWidth || 480, 190);

  // переключатель периода
  const segEl = container.querySelector('#dash-period');
  segEl?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-v]') as HTMLElement | null;
    if (!b) return;
    quick = b.dataset.v as QuickPeriod;
    customRange = null;
    renderDashboard(container);
  });

  const btnCustom = container.querySelector('#btn-custom-period');
  btnCustom?.addEventListener('click', () => {
    import('./periodPicker').then((m) => m.pickPeriod().then((r) => {
      if (r) {
        customRange = r;
        renderDashboard(container);
      }
    }));
  });

  bindTxRows(container);
  bindActs(container);
}

function deltaOf(curr: number, prev: number): { text: string; dir: 'up' | 'down' | 'flat' } | undefined {
  const d = deltaPct(curr, prev);
  if (d === null || !isFinite(d)) return undefined;
  if (Math.abs(d) < 0.5) return { text: 'как раньше', dir: 'flat' };
  return { text: pct(d), dir: d > 0 ? 'up' : 'down' };
}

function shiftRange(r: DateRange): DateRange {
  // Полный календарный месяц сравниваем с предыдущим календарным месяцем
  const from = new Date(r.from);
  if (from.getDate() === 1) {
    const prevStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const prevEnd = new Date(from.getFullYear(), from.getMonth(), 0);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(prevStart), to: iso(prevEnd), label: `${r.label} (прошлый)` };
  }
  const to = new Date(r.to);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - days * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(prevFrom), to: iso(prevTo), label: `${r.label} (прошлый)` };
}

function sparkDir(pts: { v: number }[]): 'up' | 'down' | 'flat' {
  if (pts.length < 2) return 'flat';
  const d = pts[pts.length - 1].v - pts[0].v;
  return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
}

function sparkDelta(pts: { v: number }[]): string {
  if (pts.length < 2) return '—';
  const d = pts[pts.length - 1].v - pts[0].v;
  return `${d >= 0 ? '+' : '−'}${money(Math.abs(d))}`;
}

function pluralReview(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} операции требуют`;
  return `${n} операций требуют`;
}

function insightsView(txs: ReturnType<typeof inRangeTxs>): string {
  const s = summarize(txs);
  const cur = s;
  // 3 наблюдения: свободные деньги, подписки, самая крупная категория
  const cards: string[] = [];

  if (cur.income > 0) {
    const share = Math.round((Math.max(0, cur.net) / cur.income) * 100);
    cards.push(`
      <div class="note" style="flex-direction:column;align-items:flex-start;gap:6px;padding:14px">
        <span class="row" style="gap:8px;color:var(--accent-final)">${icon('trending', 15)}<b style="color:var(--text)">Норма сбережений — ${share}%</b></span>
        <span style="font-size:12.5px">Из ${moneyShort(cur.income)} доходов свободными остались ${moneyShort(Math.max(0, cur.net))}.</span>
      </div>`);
  }

  const subs = inRangeTxs(txs, rangeThisMonth()).filter((t) => t.category === 'subscriptions');
  if (subs.length) {
    const total = subs.reduce((a, t) => a + t.amount, 0);
    cards.push(`
      <div class="note" style="flex-direction:column;align-items:flex-start;gap:6px;padding:14px">
        <span class="row" style="gap:8px;color:var(--info)">${icon('repeat', 15)}<b style="color:var(--text)">Подписки — ${money(total, false, true)}/мес</b></span>
        <span style="font-size:12.5px">${subs.map((t) => esc(t.merchant)).slice(0, 3).join(', ')}${subs.length > 3 ? ` +${subs.length - 3}` : ''}. За год — ${moneyShort(total * 12)}.</span>
      </div>`);
  }

  const top = cur.byCategory[0];
  if (top) {
    const cat = catById(state.categories, top.id);
    cards.push(`
      <div class="note" style="flex-direction:column;align-items:flex-start;gap:6px;padding:14px">
        <span class="row" style="gap:8px;color:${cat.color}">${icon(cat.icon as never, 15)}<b style="color:var(--text)">Главная статья — ${esc(cat.name)}</b></span>
        <span style="font-size:12.5px">${moneyShort(top.total)} за период, ${top.count} ${top.count === 1 ? 'покупка' : top.count < 5 ? 'покупки' : 'покупок'}.</span>
      </div>`);
  }

  return cards.join('') || `<div class="note">Недостаточно данных за период.</div>`;
}

/* Общий биндер кликов по операциям — используется и на других экранах.
   Идемпотентен: на «Операциях» строки дорисовываются порциями, биндер
   вызывается для каждой порции — уже связанные строки пропускаются. */
export function bindTxRows(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('.tx-row[data-tx]').forEach((row) => {
    if (row.dataset.txBound) return;
    row.dataset.txBound = '1';
    row.addEventListener('click', () => {
      import('./txDrawer').then((m) => m.openTxDrawer(row.getAttribute('data-tx')!));
    });
    row.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') (row as HTMLElement).click();
    });
  });
}

/* Общий биндер data-act кнопок */
export function bindActs(scope: HTMLElement): void {
  scope.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.getAttribute('data-act');
      if (act === 'go-bank') import('../shell').then((m) => m.navigate('bank'));
      if (act === 'go-review') import('../shell').then((m) => m.navigate('review'));
      if (act === 'go-tx') import('../shell').then((m) => m.navigate('transactions'));
    });
  });
}
