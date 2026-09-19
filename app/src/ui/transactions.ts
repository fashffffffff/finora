/* ============================================================
   Finora — экран «Операции»: поиск, фильтры, группировка
   ============================================================ */

import { state } from '../state/app';
import { catById } from '../data/categories';
import { icon } from '../core/icons';
import { dateFull, esc, money, rangeAll, rangeLast, rangeLastMonth, rangeThisMonth, rangeYear, sumBy, timeLabel, type DateRange } from '../core/utils';
import { emptyState, popover, seg, topbar } from './common';
import { bindTxRows } from './dashboard';

type PeriodV = 'month' | 'prev' | 'q3' | 'year' | 'all';
type TypeV = 'all' | 'income' | 'expense' | 'transfer' | 'review';

/** Строк в одной порции ленивой подгрузки */
const BATCH = 60;
/** Наблюдатель прокрутки текущего экрана (пересоздаётся при перерендере) */
let txObserver: IntersectionObserver | null = null;

const PERIODS: { v: PeriodV; t: string }[] = [
  { v: 'month', t: 'Месяц' },
  { v: 'prev', t: 'Прошлый' },
  { v: 'q3', t: 'Квартал' },
  { v: 'year', t: 'Год' },
  { v: 'all', t: 'Всё' },
];

let fPeriod: PeriodV = 'all';
let fType: TypeV = 'all';
let fCat: string | null = null;
let fQuery = '';
let sort: 'date' | 'amount' = 'date';
let customRange: DateRange | null = null;

function rangeFor(p: PeriodV): DateRange {
  switch (p) {
    case 'month': return rangeThisMonth();
    case 'prev': return rangeLastMonth();
    case 'q3': return rangeLast(3, 'Квартал');
    case 'year': return rangeYear();
    case 'all': return rangeAll('2025-10-01');
  }
}

export function renderTransactions(container: HTMLElement): void {
  const txs = state.txs;

  if (!txs.length) {
    container.innerHTML = `
      ${topbar('Операции', 'Все поступления и траты')}
      <div class="view"><div class="view-inner">
        <div class="card">${emptyState({
          icon: 'list',
          title: 'Список пуст',
          text: 'Здесь появятся все операции после подключения банка или демо-загрузки.',
          action: { label: 'Подключить банк', act: 'go-bank' },
        })}</div>
      </div></div>`;
    bindActs(container);
    return;
  }

  // --- фильтрация ---
  const range = customRange ?? rangeFor(fPeriod);
  let list = txs.filter((t) => {
    const d = t.date.slice(0, 10);
    if (d < range.from || d > range.to) return false;
    if (fType === 'income' && (t.type !== 'income' || t.direction !== 'in')) return false;
    if (fType === 'expense' && t.type !== 'expense') return false;
    if (fType === 'transfer' && t.type !== 'transfer') return false;
    if (fType === 'review' && !t.needsReview) return false;
    if (fCat && t.category !== fCat) return false;
    if (fQuery) {
      const q = fQuery.toLowerCase();
      if (!`${t.merchant} ${t.description} ${t.comment ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  list.sort((a, b) =>
    sort === 'amount'
      ? b.amount - a.amount
      : a.date > b.date ? -1 : a.date < b.date ? 1 : 0,
  );

  // --- группировка по дням ---
  const groups: { day: string; items: typeof list; daySum: number }[] = [];
  for (const t of list) {
    if (sort === 'amount') break;
    const day = t.date.slice(0, 10);
    let g = groups.find((x) => x.day === day);
    if (!g) {
      g = { day, items: [], daySum: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.daySum += t.direction === 'in' ? t.amount : -t.amount;
  }

  const catItems = state.categories.map((c) => ({ v: c.id, t: c.name, icon: c.icon as never }));
  const activeCat = fCat ? catById(state.categories, fCat) : null;
  const income = sumBy(list.filter((t) => t.type === 'income'), (t) => t.amount);
  const expense = sumBy(list.filter((t) => t.type === 'expense'), (t) => t.amount);

  container.innerHTML = `
  ${topbar(
    'Операции',
    `${list.length} из ${txs.length} · доходы ${money(income, false, true)} · расходы ${money(expense, false, true)}`,
    `<button class="btn btn-soft btn-sm" id="btn-export-csv">${icon('download', 15)} CSV</button>`,
  )}
  <div class="view"><div class="view-inner" style="display:flex;flex-direction:column;gap:var(--sp-3)">

    <div class="card" style="padding:var(--sp-3)">
      <div class="row wrap" style="gap:10px">
        <div class="input-icon grow" style="min-width:220px">
          ${icon('search', 16)}
          <input class="input" id="tx-search" placeholder="Поиск по названию, описанию, комментарию…" value="${esc(fQuery)}"/>
        </div>
        ${seg('tx-type', [
          { v: 'all', t: 'Все' },
          { v: 'expense', t: 'Расходы' },
          { v: 'income', t: 'Доходы' },
          { v: 'transfer', t: 'Переводы' },
          { v: 'review', t: 'Разобрать' },
        ], fType)}
      </div>
      <div class="row wrap" style="gap:8px;margin-top:10px">
        ${popover('pop-period', `<button class="chip ${customRange ? 'active' : ''}" id="trigger-pop-period">${icon('calendar', 13)} ${esc(customRange ? customRange.label : PERIODS.find((p) => p.v === fPeriod)!.t)}</button>`,
          PERIODS.map((p) => ({ v: p.v, t: p.t })), customRange ? undefined : fPeriod)}
        ${popover('pop-cat', `<button class="chip ${fCat ? 'active' : ''}" id="trigger-pop-cat">${icon('tagIcon', 13)} ${activeCat ? esc(activeCat.name) : 'Все категории'}</button>`,
          [{ v: '__all', t: 'Все категории' }, ...catItems], fCat ?? '__all')}
        ${popover('pop-sort', `<button class="chip" id="trigger-pop-sort">${icon('filter', 13)} ${sort === 'date' ? 'Сначала новые' : 'По сумме'}</button>`,
          [{ v: 'date', t: 'Сначала новые' }, { v: 'amount', t: 'По сумме' }], sort)}
        ${(fCat || fType !== 'all' || fQuery || customRange) ? `<button class="chip" id="tx-reset" style="color:var(--expense)">${icon('x', 13)} Сбросить</button>` : ''}
      </div>
    </div>

    ${list.length === 0
      ? `<div class="card">${emptyState({
          icon: 'search',
          title: 'Ничего не найдено',
          text: 'Попробуйте изменить фильтры или очистить поиск — например, выберите период побольше.',
        })}</div>`
      // список заполняется порциями при прокрутке (см. renderListChunks):
      // фильтрация, сортировка и группировка выше выполнены по ВСЕМ операциям
      : sort === 'amount'
        ? `<div class="card" style="padding:var(--sp-2)"><div class="tx-list" id="tx-list-host"></div></div><div id="tx-sentinel" style="height:1px"></div>`
        : `<div id="tx-list-host" style="display:flex;flex-direction:column;gap:var(--sp-3)"></div><div id="tx-sentinel" style="height:1px"></div>`}

  </div></div>`;

  // --- события ---
  const search = container.querySelector('#tx-search') as HTMLInputElement;
  let deb: ReturnType<typeof setTimeout>;
  search.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      fQuery = search.value;
      refreshList(container);
    }, 180);
  });

  container.querySelector('#tx-type')?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-v]') as HTMLElement | null;
    if (!b) return;
    fType = b.dataset.v as TypeV;
    refreshList(container);
  });

  wirePopover(container, 'pop-period', 'trigger-pop-period', (v) => {
    customRange = null;
    fPeriod = v as PeriodV;
    refreshList(container);
  });

  wirePopover(container, 'pop-cat', 'trigger-pop-cat', (v) => {
    fCat = v === '__all' ? null : v;
    refreshList(container);
  });

  wirePopover(container, 'pop-sort', 'trigger-pop-sort', (v) => {
    sort = v as 'date' | 'amount';
    refreshList(container);
  });

  container.querySelector('#tx-reset')?.addEventListener('click', () => {
    fCat = null; fType = 'all'; fQuery = ''; customRange = null;
    refreshList(container);
  });

  container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
    import('../core/export').then((m) => m.exportCSV(list));
  });

  bindTxRows(container);
  bindActs(container);

  // --- порционная отрисовка списка ---
  // Данные (list, groups) уже посчитаны по всем операциям — в DOM они
  // попадают порциями по мере прокрутки, иначе 20 000 строк убьют рендер.
  const host = container.querySelector('#tx-list-host') as HTMLElement | null;
  const sentinel = container.querySelector('#tx-sentinel') as HTMLElement | null;
  if (host && sentinel) {
    const view = container.querySelector('.view') as HTMLElement;
    let cursor = 0;

    const dayGroupHtml = (g: { day: string; items: typeof list; daySum: number }): string => `
      <div class="day-group">
        <div class="day-head"><span>${esc(dateFull(g.day + 'T12:00:00'))}</span>
        <span class="num ${g.daySum >= 0 ? 'pos' : 'neg'}">${g.daySum >= 0 ? '+' : '−'}${money(Math.abs(g.daySum))}</span></div>
        <div class="card" style="padding:6px"><div class="tx-list">${g.items.map(rowHtml).join('')}</div></div>
      </div>`;

    /** Дописать порцию; false — список исчерпан */
    const appendChunk = (): boolean => {
      if (sort === 'amount') {
        if (cursor >= list.length) return false;
        const slice = list.slice(cursor, cursor + BATCH);
        cursor += slice.length;
        host.insertAdjacentHTML('beforeend', slice.map(rowHtml).join(''));
      } else {
        // целыми днями, чтобы шапка дня и суммы оставались корректными
        if (cursor >= groups.length) return false;
        let html = '';
        let rows = 0;
        while (cursor < groups.length && rows < BATCH) {
          const g = groups[cursor++];
          rows += g.items.length;
          html += dayGroupHtml(g);
        }
        host.insertAdjacentHTML('beforeend', html);
      }
      bindTxRows(host);
      return true;
    };

    const fill = (): void => {
      for (let i = 0; i < 40; i++) {
        if (!appendChunk()) {
          txObserver?.disconnect();
          sentinel.remove();
          return;
        }
        // пока сентинел в зоне догрузки — дополняем, чтобы экран не был полупустым
        const s = sentinel.getBoundingClientRect();
        const v = view.getBoundingClientRect();
        if (s.top > v.bottom + 600) return;
      }
    };

    txObserver?.disconnect();
    txObserver = new IntersectionObserver(fill, { root: view, rootMargin: '600px 0px' });
    txObserver.observe(sentinel);
    // Только первая порция: экран к этому моменту ещё не в DOM и любая
    // геометрия даёт нули — дальше догружает наблюдатель после монтирования.
    appendChunk();
  }
}

function rowHtml(t: (typeof state.txs)[number]): string {
  const c = catById(state.categories, t.category);
  const time = timeLabel(t.date);
  return `
  <div class="tx-row" data-tx="${esc(t.id)}" role="button" tabindex="0">
    <span class="cat-tile" style="--cat:${c.color}">${icon(c.icon as never, 17)}</span>
    <span class="grow" style="min-width:0">
      <span class="row" style="gap:7px"><span class="tx-merchant ellipsis">${esc(t.merchant)}</span>
      ${t.status === 'pending' ? '<span class="status-dot pending" title="В обработке"></span>' : ''}
      ${t.comment ? `<span class="faint" title="Есть комментарий">${icon('edit', 12)}</span>` : ''}</span>
      <span class="tx-meta"><span>${time}</span><span>·</span><span class="ellipsis">${esc(c.name)}</span>
      ${t.needsReview ? `<span>·</span><span class="tx-review-flag">${icon('question', 11)} разобрать</span>` : ''}</span>
    </span>
    <span class="tx-amount num ${t.direction === 'in' ? 'pos' : 'neg'}">${t.direction === 'in' ? '+' : '−'}${money(t.amount)}<span class="cur">₽</span></span>
  </div>`;
}

function wirePopover(container: HTMLElement, popId: string, triggerId: string, onPick: (v: string) => void): void {
  const pop = container.querySelector(`#${popId}`) as HTMLElement;
  const trigger = container.querySelector(`#${triggerId}`) as HTMLElement;
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.popover').forEach((p) => {
      if (p !== pop) (p as HTMLElement).hidden = true;
    });
    pop.hidden = !pop.hidden;
  });
  pop.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.pop-item[data-v]') as HTMLElement | null;
    if (!b) return;
    pop.hidden = true;
    onPick(b.dataset.v!);
  });
}

function refreshList(container: HTMLElement): void {
  renderTransactions(container);
}

function bindActs(scope: HTMLElement): void {
  scope.querySelectorAll('[data-act="go-bank"]').forEach((el) =>
    el.addEventListener('click', () => import('../shell').then((m) => m.navigate('bank'))),
  );
}

/** Переоткрыть экран с предустановленным фильтром категории */
export function openTransactionsWithCat(catId: string): void {
  fCat = catId;
  fType = 'all';
  fQuery = '';
  import('../shell').then((m) => m.navigate('transactions'));
}
