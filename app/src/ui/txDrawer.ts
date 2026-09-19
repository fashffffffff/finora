/* ============================================================
   Finora — детали операции (шторка справа).
   Смена категории и комментарий реально сохраняются.
   ============================================================ */

import { state, updateTransaction } from '../state/app';
import { catById } from '../data/categories';
import { icon } from '../core/icons';
import { dateFull, esc, money, timeLabel } from '../core/utils';
import { toast } from './common';

const TYPE_LABEL: Record<string, string> = {
  income: 'Поступление',
  expense: 'Покупка',
  transfer: 'Перевод',
};

export function openTxDrawer(id: string, onDone?: () => void): void {
  const tx = state.txs.find((t) => t.id === id);
  if (!tx) return;
  const cat = catById(state.categories, tx.category);

  const scrim = document.createElement('div');
  scrim.className = 'drawer-scrim';
  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Детали операции');

  drawer.innerHTML = `
    <div class="drawer-head">
      <span class="card-title">Детали операции</span>
      <button class="btn btn-ghost btn-icon" data-close-drawer title="Закрыть">${icon('x', 16)}</button>
    </div>
    <div class="drawer-body">

      <div style="text-align:center;padding:6px 0 2px">
        <span class="cat-tile cat-tile-lg" style="--cat:${cat.color};margin:0 auto">${icon(cat.icon as never, 22)}</span>
        <div class="num" style="font-size:30px;font-weight:600;margin-top:12px;letter-spacing:-0.02em"
          class="${tx.direction === 'in' ? 'pos' : 'neg'}">
          <span class="${tx.direction === 'in' ? 'pos' : 'neg'}">${tx.direction === 'in' ? '+' : '−'}${money(tx.amount)} ₽</span>
        </div>
        ${tx.cashback ? `<div style="font-size:12.5px;color:var(--income);margin-top:4px">кэшбэк +${money(tx.cashback)} ₽</div>` : ''}
      </div>

      ${tx.needsReview
        ? `<div class="note accent">
            <span class="note-icon">${icon('question', 15)}</span>
            <span>Категория не определена. Укажите её — и статистика станет точной.</span>
          </div>`
        : ''}

      <div class="field">
        <span class="field-label">Категория</span>
        <button class="input" id="cat-open" style="display:flex;align-items:center;gap:9px;text-align:left">
          <span class="cat-tile" style="--cat:${cat.color};width:26px;height:26px;border-radius:8px">${icon(cat.icon as never, 14)}</span>
          <span class="grow">${esc(cat.name)}</span>
          ${icon('chevronDown', 15)}
        </button>
        <div class="popover" id="cat-pop" hidden style="left:0;right:0;max-height:280px">
          ${state.categories
            .map(
              (c) => `<button class="pop-item ${c.id === tx.category ? 'active' : ''}" data-v="${c.id}">
                <span class="cat-tile" style="--cat:${c.color};width:24px;height:24px;border-radius:7px">${icon(c.icon as never, 13)}</span>
                <span>${esc(c.name)}</span>
                ${c.id === tx.category ? `<span class="pop-check">${icon('check', 14)}</span>` : ''}`,
            )
            .join('')}
        </div>
      </div>

      <dl class="kv">
        <dt>Тип</dt><dd>${TYPE_LABEL[tx.type] ?? tx.type}${tx.internal ? ' · между счетами' : ''}</dd>
        <dt>Дата</dt><dd>${esc(dateFull(tx.date))}</dd>
        <dt>Время</dt><dd>${timeLabel(tx.date)}</dd>
        <dt>Описание</dt><dd style="text-align:right;max-width:220px">${esc(tx.description)}</dd>
        <dt>Счёт</dt><dd>${esc(tx.account)}</dd>
        <dt>Статус</dt><dd>${tx.status === 'ok' ? 'Выполнено' : '<span class="status-dot pending" style="display:inline-block;margin-right:5px"></span>В обработке'}</dd>
        ${tx.mcc ? `<dt>MCC</dt><dd class="num">${esc(tx.mcc)}</dd>` : ''}
        <dt>Источник</dt><dd>Т-Банк · демо-данные</dd>
      </dl>

      <div class="field">
        <label class="field-label" for="tx-comment">Комментарий</label>
        <textarea class="input" id="tx-comment" placeholder="Например: «на двоих с Артёмом»">${esc(tx.comment ?? '')}</textarea>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn btn-soft" id="tx-save">Сохранить</button>
      </div>
    </div>`;

  const close = () => {
    scrim.remove();
    drawer.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  scrim.addEventListener('click', close);
  drawer.querySelector('[data-close-drawer]')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  // выбор категории
  const catOpen = drawer.querySelector('#cat-open') as HTMLElement;
  const catPop = drawer.querySelector('#cat-pop') as HTMLElement;
  catOpen.addEventListener('click', (e) => {
    e.stopPropagation();
    catPop.hidden = !catPop.hidden;
  });
  catPop.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.pop-item[data-v]') as HTMLElement | null;
    if (!b) return;
    const newCat = catById(state.categories, b.dataset.v!);
    updateTransaction(tx.id, { category: newCat.id, needsReview: false });
    toast('ok', `Категория изменена: ${newCat.name}`);
    close();
    onDone?.();
  });

  // комментарий
  (drawer.querySelector('#tx-save') as HTMLElement).addEventListener('click', () => {
    const val = (drawer.querySelector('#tx-comment') as HTMLTextAreaElement).value.trim();
    updateTransaction(tx.id, { comment: val || undefined });
    toast('ok', 'Комментарий сохранён');
    close();
    onDone?.();
  });

  document.body.appendChild(scrim);
  document.body.appendChild(drawer);
}
