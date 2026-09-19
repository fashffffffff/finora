/* ============================================================
   Finora — выбор произвольного периода (поповер в топбаре)
   ============================================================ */

import { openModal } from './common';
import { icon } from '../core/icons';
import type { DateRange } from '../core/utils';

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function pickPeriod(): Promise<DateRange | null> {
  return new Promise((resolve) => {
    const now = new Date();
    const scrim = openModal(`
      <div class="col" style="gap:var(--sp-4)">
        <div class="row-between">
          <h2>Выбрать период</h2>
          <button class="btn btn-ghost btn-icon" data-close>${icon('x', 16)}</button>
        </div>
        <div class="field">
          <label class="field-label" for="pp-from">Начало</label>
          <input class="input" type="date" id="pp-from" value="${iso(new Date(now.getFullYear(), now.getMonth(), 1))}" max="${iso(now)}"/>
        </div>
        <div class="field">
          <label class="field-label" for="pp-to">Конец</label>
          <input class="input" type="date" id="pp-to" value="${iso(now)}" max="${iso(now)}"/>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${[
            { d: 7, t: '7 дней' },
            { d: 30, t: '30 дней' },
            { d: 90, t: '90 дней' },
            { d: 365, t: 'Год' },
          ]
            .map(
              (q) => `<button class="chip" data-quick="${q.d}">${q.t}</button>`,
            )
            .join('')}
        </div>
        <div class="row" style="gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" data-close>Отмена</button>
          <button class="btn btn-primary" id="pp-apply">Показать период</button>
        </div>
      </div>
    `);

    const fromEl = scrim.querySelector('#pp-from') as HTMLInputElement;
    const toEl = scrim.querySelector('#pp-to') as HTMLInputElement;

    scrim.querySelectorAll('[data-quick]').forEach((b) =>
      b.addEventListener('click', () => {
        const days = Number((b as HTMLElement).dataset.quick);
        toEl.value = iso(now);
        fromEl.value = iso(new Date(now.getTime() - (days - 1) * 86400000));
      }),
    );

    (scrim.querySelector('#pp-apply') as HTMLElement).addEventListener('click', () => {
      if (!fromEl.value || !toEl.value || fromEl.value > toEl.value) return;
      const f = new Date(fromEl.value);
      const t = new Date(toEl.value);
      const fmt = (d: Date) => `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}`;
      scrim.remove();
      resolve({
        from: fromEl.value,
        to: toEl.value,
        label: fromEl.value === toEl.value ? fmt(f) : `${fmt(f)} — ${fmt(t)}`,
      });
    });

    // закрытие без выбора
    const obs = new MutationObserver(() => {
      if (!document.body.contains(scrim)) {
        obs.disconnect();
        resolve(null);
      }
    });
    obs.observe(document.body, { childList: true });
  });
}
