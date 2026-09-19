/* ============================================================
   Finora — экран «Разобрать»: неопределённые операции.
   Пользователь выбирает категорию или помечает переводом
   между своими счетами.
   ============================================================ */

import { mutate, pendingReview, state, updateTransaction } from '../state/app';
import { REVIEW_SUGGESTIONS, catById } from '../data/categories';
import { icon } from '../core/icons';
import { dateLabel, esc, money, timeLabel } from '../core/utils';
import { emptyState, topbar, toast } from './common';
import { bindActs } from './dashboard';

export function renderReview(container: HTMLElement): void {
  const queue = pendingReview();

  container.innerHTML = `
  ${topbar(
    'Разобрать',
    queue.length
      ? `${queue.length} ${plural(queue.length)} без категории — разберите, чтобы статистика была точной`
      : 'Всё разобрано',
  )}
  <div class="view"><div class="view-inner">

    ${queue.length === 0
      ? `<div class="card">${emptyState({
          icon: 'check',
          title: 'Очередь пуста',
          text: 'Все операции получили категории. Новые непонятные операции появятся здесь после следующей синхронизации.',
        })}</div>`
      : `<div class="review-queue stagger" style="display:flex;flex-direction:column;gap:var(--sp-3);max-width:720px">
          ${queue.map((t) => reviewCard(t)).join('')}
        </div>`}

  </div></div>`;

  bindCards(container);
  bindActs(container);
}

function plural(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'операция';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'операции';
  return 'операций';
}

function reviewCard(t: (typeof state.txs)[number]): string {
  return `
  <div class="card review-card" data-review="${esc(t.id)}">
    <div class="row" style="gap:12px;align-items:flex-start">
      <span class="cat-tile cat-tile-lg" style="--cat:var(--warn)">${icon('question', 20)}</span>
      <div class="grow">
        <div class="row" style="gap:8px">
          <b style="font-size:15px">${esc(t.merchant)}</b>
          <span class="num ${t.direction === 'in' ? 'pos' : 'neg'}" style="font-weight:600">${t.direction === 'in' ? '+' : '−'}${money(t.amount)} ₽</span>
        </div>
        <div class="faint" style="font-size:12.5px;margin-top:2px">${esc(dateLabel(t.date))}, ${timeLabel(t.date)} · ${esc(t.description)}</div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:13px;color:var(--text-2)">На что были потрачены деньги?</div>
    <div class="row wrap" style="gap:7px;margin-top:8px">
      ${REVIEW_SUGGESTIONS.map((cid) => {
        const c = catById(state.categories, cid);
        return `<button class="chip" data-pick="${c.id}">
          <span class="cat-tile" style="--cat:${c.color};width:20px;height:20px;border-radius:6px">${icon(c.icon as never, 12)}</span>
          ${esc(c.name)}</button>`;
      }).join('')}
      <button class="chip" data-pick="__internal">${icon('swap', 13)} Это перевод между моими счетами</button>
    </div>
  </div>`;
}

function bindCards(container: HTMLElement): void {
  container.querySelectorAll('.review-card[data-review]').forEach((card) => {
    card.querySelectorAll('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = card.getAttribute('data-review')!;
        const pick = (btn as HTMLElement).dataset.pick!;
        const tx = state.txs.find((t) => t.id === id);
        if (!tx) return;

        if (pick === '__internal') {
          mutate((s) => ({
            txs: s.txs.map((t) =>
              t.id === id ? { ...t, type: 'transfer' as const, internal: true, category: 'transfers', needsReview: false } : t,
            ),
          }));
          toast('ok', 'Помечено как перевод между счетами');
        } else {
          const c = catById(state.categories, pick);
          updateTransaction(id, { category: c.id, needsReview: false });
          toast('ok', `Категория: ${c.name}`);
        }
        renderReview(container);
      });
    });
  });
}
