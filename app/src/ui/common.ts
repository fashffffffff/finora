/* ============================================================
   Finora — общие элементы UI (рендерятся в строки HTML).
   ============================================================ */

import { icon } from '../core/icons';
import { esc } from '../core/utils';
import type { IconName } from '../core/icons';

/* ---------- Заголовок экрана ---------- */

export function topbar(title: string, subtitle: string, actions = ''): string {
  return `
  <header class="topbar">
    <div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<div class="topbar-sub">${subtitle}</div>` : ''}
    </div>
    <div class="topbar-actions">${actions}</div>
  </header>`;
}

/* ---------- Карточка-показатель ---------- */

export function statCard(opts: {
  label: string;
  value: string;
  delta?: { text: string; dir: 'up' | 'down' | 'flat' };
  hint?: string;
  icon?: IconName;
  tone?: 'default' | 'accent';
  id?: string;
  skeleton?: boolean;
}): string {
  if (opts.skeleton) {
    return `<div class="card"><div class="skeleton" style="width:90px;height:12px"></div>
      <div class="skeleton" style="width:150px;height:26px;margin-top:12px"></div></div>`;
  }
  const ico = opts.icon
    ? `<span class="cat-tile" style="--cat:var(--${opts.tone === 'accent' ? 'accent-final' : 'text-3'})">${icon(opts.icon, 17)}</span>`
    : '';
  const delta = opts.delta
    ? `<span class="stat-delta ${opts.delta.dir}">${
        opts.delta.dir === 'up' ? icon('arrowUpRight', 12) : opts.delta.dir === 'down' ? icon('arrowDownLeft', 12) : ''
      }${esc(opts.delta.text)}</span>`
    : '';
  return `
  <div class="card card-hover" ${opts.id ? `id="${opts.id}"` : ''}>
    <div class="row-between">
      <span class="stat-label">${esc(opts.label)}</span>
      ${ico}
    </div>
    <div class="stat-value" style="margin-top:8px">${opts.value}</div>
    <div class="row" style="gap:8px;margin-top:7px;min-height:22px">${delta}${opts.hint ? `<span class="faint" style="font-size:12px">${esc(opts.hint)}</span>` : ''}</div>
  </div>`;
}

/* ---------- Сегментированный переключатель ---------- */

export function seg(id: string, items: { v: string; t: string }[], active: string): string {
  return `<div class="seg" id="${id}" role="tablist">
    ${items.map((i) => `<button data-v="${esc(i.v)}" class="${i.v === active ? 'active' : ''}" role="tab">${esc(i.t)}</button>`).join('')}
  </div>`;
}

/* ---------- Пустое состояние ---------- */

export function emptyState(opts: { icon: IconName; title: string; text: string; action?: { label: string; act: string } }): string {
  return `
  <div class="empty">
    <div class="empty-icon">${icon(opts.icon, 24)}</div>
    <h3>${esc(opts.title)}</h3>
    <p>${esc(opts.text)}</p>
    ${opts.action ? `<button class="btn btn-primary btn-sm" data-act="${esc(opts.action.act)}">${esc(opts.action.label)}</button>` : ''}
  </div>`;
}

/* ---------- Чип категории ---------- */

export function catChip(catId: string, name: string, color: string): string {
  return `<span class="chip chip-with-dot" style="--cat:${color}"><i class="dot"></i>${esc(name)}</span>`;
}

/* ---------- Плитка операции в списке ---------- */

export function txRow(tx: {
  id: string; merchant: string; description: string; date: string; amount: number;
  type: string; direction: 'in' | 'out'; category: string; catName: string; catColor: string; catIcon: string;
  needsReview: boolean; status: string; internal?: boolean; comment?: string;
}): string {
  const sign = tx.direction === 'in' ? '+' : '−';
  const cls = tx.direction === 'in' ? 'pos' : 'neg';
  const flag = tx.needsReview
    ? `<span class="tx-review-flag">${icon('question', 11)} разобрать</span>`
    : '';
  const pending = tx.status === 'pending' ? `<span class="status-dot pending" title="В обработке"></span>` : '';
  const note = tx.comment ? `<span title="Есть комментарий">${icon('edit', 12)}</span>` : '';
  return `
  <div class="tx-row" data-tx="${esc(tx.id)}" role="button" tabindex="0">
    <span class="cat-tile" style="--cat:${tx.catColor}">${icon(tx.catIcon as IconName, 17)}</span>
    <span class="grow" style="min-width:0">
      <span class="row" style="gap:7px">
        <span class="tx-merchant ellipsis">${esc(tx.merchant)}</span>
        ${pending}${note}
      </span>
      <span class="tx-meta">
        <span class="ellipsis">${esc(tx.catName)}</span>
        ${flag ? `<span>·</span>${flag}` : ''}
      </span>
    </span>
    <span class="tx-amount num ${cls}">${sign}${esc(tx.amount.toLocaleString('ru-RU'))}<span class="cur">₽</span></span>
  </div>`;
}

/* ---------- Поповер с выбором ---------- */

export function popover(id: string, trigger: string, items: { v: string; t: string; icon?: IconName }[], active?: string): string {
  return `
  <div class="pop-wrap">
    ${trigger}
    <div class="popover" id="${id}" hidden>
      ${items
        .map(
          (i) => `<button class="pop-item ${i.v === active ? 'active' : ''}" data-v="${esc(i.v)}">
            ${i.icon ? icon(i.icon, 15) : ''}<span>${esc(i.t)}</span>
            ${i.v === active ? `<span class="pop-check">${icon('check', 14)}</span>` : ''}
          </button>`,
        )
        .join('')}
    </div>
  </div>`;
}

/* ---------- Тост ---------- */

export function toast(kind: 'ok' | 'warn' | 'error', text: string): void {
  const host = document.querySelector('.toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const ico = kind === 'ok' ? 'check' : kind === 'warn' ? 'alert' : 'x';
  el.innerHTML = `<span class="toast-icon ${kind}">${icon(ico as IconName, 15)}</span><span style="font-size:13px">${esc(text)}</span>`;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3400);
}

/* ---------- Модальное окно ---------- */

export function openModal(html: string): HTMLElement {
  const scrim = document.createElement('div');
  scrim.className = 'modal-scrim';
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(scrim);
  const close = () => scrim.remove();
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });
  scrim.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const escFn = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escFn);
    }
  };
  document.addEventListener('keydown', escFn);
  return scrim;
}
