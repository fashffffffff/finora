/* ============================================================
   Finora — экран «Цели»: накопления на машину, квартиру и т.д.
   ============================================================ */

import { deleteGoal, saveGoal, state } from '../state/app';
import type { Goal } from '../domain/types';
import { icon } from '../core/icons';
import { dateLabel, esc, money, moneyShort, uid } from '../core/utils';
import { emptyState, openModal, topbar, toast } from './common';

const GOAL_ICONS: { v: string; t: string }[] = [
  { v: 'laptop', t: 'Техника' }, { v: 'travel', t: 'Путешествие' }, { v: 'home', t: 'Жильё' },
  { v: 'transport', t: 'Автомобиль' }, { v: 'education', t: 'Образование' }, { v: 'gift', t: 'Подарок' },
  { v: 'shield', t: 'Резерв' }, { v: 'box', t: 'Другое' },
];

export function renderGoals(container: HTMLElement): void {
  const goals = state.goals;

  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = goals.reduce((a, g) => a + g.target, 0);
  const totalPct = totalTarget ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  container.innerHTML = `
  ${topbar(
    'Цели',
    goals.length ? `${goals.length} ${goals.length === 1 ? 'цель' : 'цели'} · накопления под конкретные планы` : 'Копите на то, что важно',
    `<button class="btn btn-primary btn-sm" id="goal-add">${icon('plus', 15)} Новая цель</button>`,
  )}
  <div class="view"><div class="view-inner">

    ${goals.length === 0
      ? `<div class="card">${emptyState({
          icon: 'ingots',
          title: 'Целей пока нет',
          text: 'Создайте первую цель — например, «ноутбук» или «отпуск». Finora будет показывать прогресс и, в будущем, посоветует где сэкономить с помощью локального ИИ.',
          action: { label: 'Создать цель', act: 'goal-add-2' },
        })}</div>`
      : `<div class="col stagger" style="gap:var(--sp-4)">
          <div class="card goal-treasury">
            <span class="cat-tile cat-tile-lg" style="--cat:var(--accent-final)">${icon('ingots', 22)}</span>
            <div class="grow">
              <div class="stat-label">Накоплено по всем целям</div>
              <div class="num" style="font-size:23px;font-weight:600;margin-top:3px">${money(totalSaved)}
                <span class="faint" style="font-size:13px">из ${money(totalTarget)} · ${totalPct}%</span>
              </div>
              <div class="progress" style="max-width:340px;margin-top:9px"><i style="width:${totalPct}%;background:var(--accent-final)"></i></div>
            </div>
            <img src="gold-bars.png" onerror="this.remove()" alt="" class="treasury-img"/>
          </div>
          <div class="grid g3">
            ${goals.map(goalCard).join('')}
          </div>
        </div>`}

  </div></div>`;

  (container.querySelector('#goal-add') as HTMLElement)?.addEventListener('click', () => goalModal(container));
  container.querySelector('[data-act="goal-add-2"]')?.addEventListener('click', () => goalModal(container));
  bindGoalCards(container);
}

function goalCard(g: Goal): string {
  const pctDone = Math.min(100, Math.round((g.saved / g.target) * 100));
  const left = Math.max(0, g.target - g.saved);
  const done = left === 0;
  const monthsLeft = g.deadline ? Math.max(1, Math.round((new Date(g.deadline).getTime() - Date.now()) / 2629800000)) : null;
  const perMonth = monthsLeft ? left / monthsLeft : null;

  return `
  <div class="card card-hover goal-card" data-goal="${esc(g.id)}">
    <div class="row-between">
      <span class="cat-tile cat-tile-lg" style="--cat:var(--accent-final)">${icon(g.icon as never, 20)}</span>
      <span class="row" style="gap:4px">
        <button class="btn btn-ghost btn-icon" data-topup title="Пополнить" style="width:30px;height:30px">${icon('plus', 15)}</button>
        <button class="btn btn-ghost btn-icon" data-edit title="Изменить" style="width:30px;height:30px">${icon('edit', 14)}</button>
        <button class="btn btn-ghost btn-icon" data-del title="Удалить" style="width:30px;height:30px;color:var(--expense)">${icon('trash', 14)}</button>
      </span>
    </div>
    <h3 style="margin-top:12px">${esc(g.title)}</h3>
    <div class="row" style="gap:8px;margin-top:10px">
      <span class="num" style="font-weight:650">${money(g.saved)}</span>
      <span class="faint" style="font-size:12.5px">из ${money(g.target)}</span>
      <span class="grow"></span>
      <span class="stat-delta ${done ? 'up' : 'flat'}">${done ? 'Цель достигнута' : `${pctDone}%`}</span>
    </div>
    <div class="progress" style="margin-top:10px"><i style="width:${pctDone}%"></i></div>
    <div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">
      ${done
        ? `<span class="faint" style="font-size:12.5px">${icon('check', 13)} Накоплено — можно тратить</span>`
        : `<span class="faint" style="font-size:12.5px">${icon('target', 13)} Осталось ${moneyShort(left)}</span>`}
      ${g.deadline ? `<span class="faint" style="font-size:12.5px">· срок ${esc(dateLabel(g.deadline + 'T12:00:00'))}</span>` : ''}
      ${!done && perMonth ? `<span class="faint" style="font-size:12.5px">· ${moneyShort(perMonth)}/мес</span>` : ''}
    </div>
    ${g.note ? `<div class="note" style="margin-top:12px;font-size:12.5px">${esc(g.note)}</div>` : ''}
  </div>`;
}

function bindGoalCards(container: HTMLElement): void {
  container.querySelectorAll('.goal-card[data-goal]').forEach((card) => {
    const id = card.getAttribute('data-goal')!;
    const g = () => state.goals.find((x) => x.id === id)!;

    card.querySelector('[data-topup]')?.addEventListener('click', () => {
      const scrim = openModal(`
        <h2>Пополнить «${esc(g().title)}»</h2>
        <div class="field" style="margin-top:14px">
          <label class="field-label" for="topup-sum">Сумма пополнения, ₽</label>
          <input class="input num" id="topup-sum" type="number" min="100" step="100" placeholder="5000" />
        </div>
        <div class="row" style="gap:6px;margin-top:10px">
          ${[1000, 5000, 10000].map((v) => `<button class="chip" data-q="${v}">+${money(v)}</button>`).join('')}
        </div>
        <div class="row" style="gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost" data-close>Отмена</button>
          <button class="btn btn-primary" id="topup-go">Пополнить</button>
        </div>`);
      scrim.querySelectorAll('[data-q]').forEach((b) =>
        b.addEventListener('click', () => {
          (scrim.querySelector('#topup-sum') as HTMLInputElement).value = String((b as HTMLElement).dataset.q);
        }),
      );
      (scrim.querySelector('#topup-go') as HTMLElement).addEventListener('click', () => {
        const v = Number((scrim.querySelector('#topup-sum') as HTMLInputElement).value);
        if (!v || v <= 0) return;
        saveGoal({ ...g(), saved: g().saved + v });
        toast('ok', `Цель пополнена на ${money(v, false, true)}`);
        scrim.remove();
        renderGoals(container);
      });
    });

    card.querySelector('[data-edit]')?.addEventListener('click', () => goalModal(container, g()));

    card.querySelector('[data-del]')?.addEventListener('click', () => {
      const scrim = openModal(`
        <h2>Удалить «${esc(g().title)}»?</h2>
        <p class="muted" style="margin-top:8px;font-size:13.5px">Цель исчезнет из списка. Накопленные деньги остаются на счетах.</p>
        <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
          <button class="btn btn-ghost" data-close>Оставить</button>
          <button class="btn btn-danger" id="del-go">Удалить цель</button>
        </div>`);
      (scrim.querySelector('#del-go') as HTMLElement).addEventListener('click', () => {
        deleteGoal(id);
        toast('ok', 'Цель удалена');
        scrim.remove();
        renderGoals(container);
      });
    });
  });
}

function goalModal(container: HTMLElement, existing?: Goal): void {
  const g: Goal = existing ?? {
    id: uid('g'),
    title: '',
    icon: 'target',
    target: 50000,
    saved: 0,
    createdAt: new Date().toISOString(),
  };
  const scrim = openModal(`
    <h2>${existing ? 'Изменить цель' : 'Новая цель'}</h2>
    <div class="field" style="margin-top:14px">
      <label class="field-label" for="g-title">На что копим</label>
      <input class="input" id="g-title" placeholder="Например: ноутбук для учёбы" value="${esc(g.title)}" maxlength="60"/>
    </div>
    <div class="field" style="margin-top:12px">
      <label class="field-label">Иконка</label>
      <div class="swatch-row" id="g-icons">
        ${GOAL_ICONS.map(
          (i) => `<button class="cat-tile ${g.icon === i.v ? 'sw-act' : ''}" data-ico="${i.v}" title="${i.t}"
            style="--cat:${g.icon === i.v ? 'var(--accent-final)' : 'var(--text-3)'};cursor:pointer;border:${g.icon === i.v ? '2px solid var(--accent-final)' : '1px solid var(--border)'}">${icon(i.v as never, 16)}</button>`,
        ).join('')}
      </div>
    </div>
    <div class="grid g2" style="margin-top:12px;gap:12px">
      <div class="field">
        <label class="field-label" for="g-target">Сумма цели, ₽</label>
        <input class="input num" id="g-target" type="number" min="1000" step="1000" value="${g.target}"/>
      </div>
      <div class="field">
        <label class="field-label" for="g-saved">Уже накоплено, ₽</label>
        <input class="input num" id="g-saved" type="number" min="0" step="100" value="${g.saved}"/>
      </div>
    </div>
    <div class="field" style="margin-top:12px">
      <label class="field-label" for="g-deadline">Срок (необязательно)</label>
      <input class="input" id="g-deadline" type="date" value="${g.deadline ?? ''}"/>
    </div>
    <div class="field" style="margin-top:12px">
      <label class="field-label" for="g-note">Заметка</label>
      <input class="input" id="g-note" placeholder="Например: «к третьему курсу»" value="${esc(g.note ?? '')}" maxlength="120"/>
    </div>
    <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
      <button class="btn btn-ghost" data-close>Отмена</button>
      <button class="btn btn-primary" id="g-save">${existing ? 'Сохранить' : 'Создать цель'}</button>
    </div>`);

  let chosenIcon = g.icon;
  scrim.querySelectorAll('#g-icons [data-ico]').forEach((b) =>
    b.addEventListener('click', () => {
      chosenIcon = (b as HTMLElement).dataset.ico!;
      scrim.querySelectorAll('#g-icons [data-ico]').forEach((x) => {
        (x as HTMLElement).style.setProperty('--cat', 'var(--text-3)');
        (x as HTMLElement).style.border = '1px solid var(--border)';
      });
      (b as HTMLElement).style.setProperty('--cat', 'var(--accent-final)');
      (b as HTMLElement).style.border = '2px solid var(--accent-final)';
    }),
  );

  (scrim.querySelector('#g-save') as HTMLElement).addEventListener('click', () => {
    const title = (scrim.querySelector('#g-title') as HTMLInputElement).value.trim();
    const target = Number((scrim.querySelector('#g-target') as HTMLInputElement).value);
    const saved = Number((scrim.querySelector('#g-saved') as HTMLInputElement).value);
    const deadline = (scrim.querySelector('#g-deadline') as HTMLInputElement).value || undefined;
    const note = (scrim.querySelector('#g-note') as HTMLInputElement).value.trim() || undefined;
    if (!title || !target || target <= 0) {
      toast('warn', 'Укажите название и сумму цели');
      return;
    }
    saveGoal({ ...g, title, icon: chosenIcon, target, saved: Math.max(0, saved), deadline, note });
    toast('ok', existing ? 'Цель обновлена' : 'Цель создана');
    scrim.remove();
    renderGoals(container);
  });
}
