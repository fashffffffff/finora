/* ============================================================
   Finora — экран «Аналитика»
   ============================================================ */

import { state } from '../state/app';
import { catById } from '../data/categories';
import { insights, inRangeTxs, monthlySeries, summarize, deltaPct } from '../domain/analytics';
import { barChart, categoryBars, compareBars, donut } from '../core/charts';
import { icon } from '../core/icons';
import { dateLabel, esc, money, moneyShort, pct, plural, rangeLast, rangeThisMonth, sumBy, type DateRange } from '../core/utils';
import { emptyState, seg, statCard, topbar } from './common';
import { bindTxRows } from './dashboard';

type Scope = 'month' | 'quarter' | 'half' | 'year';
const SCOPES: { v: Scope; t: string }[] = [
  { v: 'month', t: 'Месяц' },
  { v: 'quarter', t: 'Квартал' },
  { v: 'half', t: 'Полгода' },
  { v: 'year', t: 'Год' },
];

let scope: Scope = 'month';

function rangeFor(s: Scope): DateRange {
  switch (s) {
    case 'month': return rangeThisMonth();
    case 'quarter': return rangeLast(3, 'Квартал');
    case 'half': return rangeLast(6, 'Полгода');
    case 'year': return rangeLast(12, 'Год');
  }
}

export function renderAnalytics(container: HTMLElement): void {
  const txs = state.txs;
  if (!txs.length) {
    container.innerHTML = `
      ${topbar('Аналитика', 'Куда уходят деньги')}
      <div class="view"><div class="view-inner"><div class="card">
        ${emptyState({ icon: 'pie', title: 'Пока нечего анализировать', text: 'Подключите банк или загрузите демо-историю, чтобы увидеть структуру расходов.', action: { label: 'Подключить банк', act: 'go-bank' } })}
      </div></div></div>`;
    bindGoBank(container);
    return;
  }

  const range = rangeFor(scope);
  const prev = shift(range);
  const scoped = inRangeTxs(txs, range);
  const prevScoped = inRangeTxs(txs, prev);
  const s = summarize(scoped);
  const sPrev = summarize(prevScoped);

  // категории
  const catRows = s.byCategory.slice(0, 8).map((c) => {
    const cat = catById(state.categories, c.id);
    return { id: c.id, label: cat.name, value: c.total, color: cat.color, icon: cat.icon, count: c.count };
  });
  const donutSlices = s.byCategory.slice(0, 7).map((c) => {
    const cat = catById(state.categories, c.id);
    return { id: c.id, label: cat.name, value: c.total, color: cat.color };
  });

  // месячная динамика
  const months = monthlySeries(txs, 12).filter((m) => m.income > 0 || m.expense > 0);

  // сравнение категорий с прошлым периодом
  const cmpRows = catRows.map((r) => {
    const p = sPrev.byCategory.find((x) => x.id === r.id)?.total ?? 0;
    return { label: r.label, a: r.value, b: p, color: r.color };
  });

  // крупные траты: без регулярных (аренда, ЖКУ, подписки) и внутренних
  const big = [...scoped]
    .filter((t) => t.type === 'expense' && t.category !== 'housing' && t.category !== 'subscriptions')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // источники дохода
  const incomeRows = [...new Set(scoped.filter((t) => t.type === 'income').map((t) => t.merchant))]
    .map((m) => {
      const total = sumBy(scoped.filter((t) => t.merchant === m && t.type === 'income'), (t) => t.amount);
      return { label: m, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  container.innerHTML = `
  ${topbar('Аналитика', `${esc(range.label)} · ${scoped.length} ${plural(scoped.length, 'операция', 'операции', 'операций')}`, seg('an-scope', SCOPES, scope))}
  <div class="view"><div class="view-inner stagger" style="display:flex;flex-direction:column;gap:var(--sp-4)">

    <div class="grid g3">
      ${statCard({
        label: 'Расходы за период',
        value: money(s.expense, false, true),
        delta: deltaPct(s.expense, sPrev.expense) !== null ? { text: pct(deltaPct(s.expense, sPrev.expense)!), dir: deltaPct(s.expense, sPrev.expense)! > 0 ? 'up' : 'down' } : undefined,
        hint: `в среднем ${moneyShort(s.expense / Math.max(1, daysIn(range)))} в день`,
        icon: 'arrowUpRight',
      })}
      ${statCard({
        label: 'Доходы за период',
        value: money(s.income, false, true),
        delta: deltaPct(s.income, sPrev.income) !== null ? { text: pct(deltaPct(s.income, sPrev.income)!), dir: deltaPct(s.income, sPrev.income)! > 0 ? 'up' : 'down' } : undefined,
        hint: `${incomeRows.length} ${plural(incomeRows.length, 'источник', 'источника', 'источников')}`,
        icon: 'arrowDownLeft',
      })}
      ${statCard({
        label: 'Средний чек покупки',
        value: money(s.byCategory.reduce((a, c) => a + c.count, 0) ? s.expense / sumBy(scoped.filter((t) => t.type === 'expense'), (t) => 1) : 0, false, true),
        hint: `${sumBy(scoped.filter((t) => t.type === 'expense'), (t) => 1)} покупок за период`,
        icon: 'cart',
      })}
    </div>

    <div class="grid" style="grid-template-columns:1fr 1.35fr">
      <div class="card">
        <div class="card-head"><span class="card-title">Структура расходов</span></div>
        <div class="donut-wrap">
          ${donut(donutSlices, 150, 20, 'Всего', moneyShort(s.expense))}
          <div class="legend grow" style="min-width:180px">
            ${categoryBars(catRows, catRows[0]?.value ?? 1)}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">Динамика по месяцам</span>
          <span class="row" style="gap:12px;font-size:11.5px;color:var(--text-3)">
            <span class="row" style="gap:5px"><i class="dot" style="background:var(--income)"></i>доходы</span>
            <span class="row" style="gap:5px"><i class="dot" style="background:var(--expense)"></i>расходы</span>
          </span>
        </div>
        <div id="an-bars"></div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1.35fr 1fr">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Крупные траты</span>
          <span class="faint" style="font-size:12px">без регулярных платежей</span>
        </div>
        ${big.length
          ? `<div class="tx-list">${big.map((t) => {
              const c = catById(state.categories, t.category);
              return `<div class="tx-row" data-tx="${esc(t.id)}">
                <span class="cat-tile" style="--cat:${c.color}">${icon(c.icon as never, 17)}</span>
                <span class="grow" style="min-width:0">
                  <span class="tx-merchant ellipsis">${esc(t.merchant)}</span>
                  <span class="tx-meta"><span>${esc(dateLabel(t.date))}</span><span>·</span><span class="ellipsis">${esc(c.name)}</span></span>
                </span>
                <span class="tx-amount num neg">−${money(t.amount)}<span class="cur">₽</span></span>
              </div>`;
            }).join('')}</div>`
          : emptyState({ icon: 'check', title: 'Крупных трат нет', text: 'В выбранном периоде всё скромно — покупки выше 10 000 ₽ не найдены.' })}
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Источники дохода</span></div>
        ${incomeRows.length
          ? `<div class="legend">${incomeRows.map((r) => `
              <div class="legend-row">
                <span class="cat-tile" style="--cat:var(--income);width:28px;height:28px;border-radius:9px">${icon('arrowDownLeft', 14)}</span>
                <span class="grow ellipsis">${esc(r.label)}</span>
                <span class="num legend-val">${money(r.total, false, true)}</span>
              </div>`).join('')}</div>`
          : emptyState({ icon: 'arrowDownLeft', title: 'Поступлений нет', text: 'За выбранный период доходы не зафиксированы.' })}
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Сравнение с прошлым периодом</span>
          <span class="faint" style="font-size:12px">${esc(prevLabel(range))}</span>
        </div>
        ${compareBars(cmpRows, Math.max(...cmpRows.map((r) => Math.max(r.a, r.b)), 1), esc(range.label), 'прошлый')}
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Что заметил Finora</span><span class="chip">правила</span></div>
        <div class="col" style="gap:10px" id="an-insights">
          ${insights(txs).map((i) => `
            <div class="note ${i.tone === 'good' ? 'accent' : ''}" style="align-items:flex-start">
              <span class="note-icon" style="color:${i.tone === 'good' ? 'var(--accent-final)' : i.tone === 'warn' ? 'var(--warn)' : 'var(--text-3)'}">${icon(i.icon as never, 15)}</span>
              <span><b style="color:var(--text)">${esc(i.title)}</b><br/>${esc(i.text)}</span>
            </div>`).join('') || '<div class="note">Данных пока мало для наблюдений.</div>'}
        </div>
      </div>
    </div>

  </div></div>`;

  const barsHost = container.querySelector('#an-bars') as HTMLElement;
  if (barsHost) barsHost.innerHTML = barChart(months.map((m) => ({ label: m.label, income: m.income, expense: m.expense })), barsHost.clientWidth || 520, 200);

  container.querySelector('#an-scope')?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-v]') as HTMLElement | null;
    if (!b) return;
    scope = b.dataset.v as Scope;
    renderAnalytics(container);
  });

  bindTxRows(container);
  bindGoBank(container);
}

function bindGoBank(scope: HTMLElement): void {
  scope.querySelectorAll('[data-act="go-bank"]').forEach((el) =>
    el.addEventListener('click', () => import('../shell').then((m) => m.navigate('bank'))),
  );
}

function shift(r: DateRange): DateRange {
  // Полный календарный месяц сравниваем с предыдущим календарным месяцем
  const from = new Date(r.from);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (from.getDate() === 1) {
    const prevStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const prevEnd = new Date(from.getFullYear(), from.getMonth(), 0);
    return { from: iso(prevStart), to: iso(prevEnd), label: 'прошлый месяц' };
  }
  const to = new Date(r.to);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - days * 86400000);
  return { from: iso(prevFrom), to: iso(prevTo), label: 'прошлый период' };
}

function prevLabel(r: DateRange): string {
  return shift(r).label;
}

function daysIn(r: DateRange): number {
  return Math.max(1, Math.round((new Date(r.to).getTime() - new Date(r.from).getTime()) / 86400000) + 1);
}
