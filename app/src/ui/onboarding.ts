/* ============================================================
   Finora — онбординг: 4 шага при первом запуске
   ============================================================ */

import { mutate, state } from '../state/app';
import { icon, logoMark, tbankMark } from '../core/icons';
import { esc } from '../core/utils';
import { toast } from './common';

let step = 0;

const STEPS: { title: string; text: string; visual: string }[] = [
  {
    title: 'Привет, это Finora',
    text: 'Все ваши деньги в одном месте: операции, статистика и цели. Приложение живёт на вашем Mac, данные никуда не отправляются.',
    visual: '',
  },
  {
    title: 'Подключите Т-Банк',
    text: 'Finora прочитает историю операций и будет поддерживать её актуальной. Пароль от банка не запрашивается и не хранится.',
    visual: 'bank',
  },
  {
    title: 'Finora раскладывает всё по полочкам',
    text: 'Каждая операция получает категорию. Непонятные попадают в очередь «Разобрать» — вы решаете, что это было, одним касанием.',
    visual: 'review',
  },
  {
    title: 'Смотрите, куда уходят деньги',
    text: 'Дашборд и аналитика показывают динамику, крупные траты и привычки. А цели помогают копить на большие планы.',
    visual: 'chart',
  },
];

export function renderOnboarding(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'onboard';
  el.id = 'onboarding';
  el.innerHTML = `
    <div class="onboard-card">
      <div class="row" style="justify-content:center;gap:10px">${logoMark(34)}<span class="brand-name" style="font-size:19px">Finora</span></div>
      <div id="ob-body"></div>
      <div class="onboard-dots" id="ob-dots">${STEPS.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row" style="justify-content:center;gap:10px;margin-top:var(--sp-4)">
        <button class="btn btn-ghost" id="ob-skip">Пропустить</button>
        <button class="btn btn-primary btn-lg" id="ob-next">Дальше</button>
      </div>
    </div>`;
  paintStep(el);
  bind(el);
  return el;
}

function paintStep(el: HTMLElement): void {
  const s = STEPS[step];
  const body = el.querySelector('#ob-body') as HTMLElement;
  body.style.animation = 'none';
  void body.offsetWidth; // перезапуск анимации
  body.style.animation = '';
  body.innerHTML = `
    <div class="ob-visual" style="margin:var(--sp-5) auto 0;max-width:420px">${visual(s.visual)}</div>
    <h2 class="onboard-title">${esc(s.title)}</h2>
    <p class="onboard-text">${esc(s.text)}</p>`;
  const dots = el.querySelectorAll('#ob-dots i');
  dots.forEach((d, i) => d.classList.toggle('on', i === step));
  (el.querySelector('#ob-next') as HTMLElement).textContent = step === STEPS.length - 1 ? 'Начать' : 'Дальше';
}

function visual(kind: string): string {
  if (kind === 'bank') {
    return `<div class="card" style="display:flex;align-items:center;gap:14px;text-align:left;padding:16px 18px">
      ${tbankMark(44)}
      <div class="grow"><b>Т-Банк</b><div class="faint" style="font-size:12px">история операций · автоматически</div></div>
      <span class="chip" style="color:var(--income)"><i class="status-dot ok"></i>подключён</span>
    </div>`;
  }
  if (kind === 'review') {
    return `<div class="card" style="text-align:left;padding:16px 18px">
      <div class="row" style="gap:10px">
        <span class="cat-tile" style="--cat:var(--warn)">${icon('question', 16)}</span>
        <div class="grow"><b>Перевод 25 000 ₽</b><div class="faint" style="font-size:12px">на что были потрачены деньги?</div></div>
      </div>
      <div class="row wrap" style="gap:6px;margin-top:12px">
        ${['Продукты', 'Техника', 'Подарки', 'Мои счета'].map((t, i) => `<span class="chip ${i === 3 ? 'active' : ''}">${t}</span>`).join('')}
      </div>
    </div>`;
  }
  if (kind === 'chart') {
    return `<div class="card" style="text-align:left;padding:16px 18px">
      <div class="row-between"><span class="card-title">Расходы, сентябрь</span><span class="stat-delta down">−12,4%</span></div>
      <div class="row" style="gap:14px;margin-top:10px">
        ${[
          { l: 'Продукты', w: 82, c: 'var(--income)' },
          { l: 'Кафе', w: 56, c: 'var(--expense)' },
          { l: 'Транспорт', w: 34, c: 'var(--info)' },
        ].map((r) => `
          <div style="flex:1">
            <div class="progress" style="height:10px"><i style="width:${r.w}%;background:${r.c}"></i></div>
            <div class="faint" style="font-size:11px;margin-top:5px">${r.l}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }
  return '';
}

function bind(el: HTMLElement): void {
  const finish = () => {
    mutate((s) => ({ settings: { ...s.settings, onboarded: true } }));
    el.remove();
    toast('ok', 'Готово! Начните с подключения банка');
  };
  (el.querySelector('#ob-skip') as HTMLElement).addEventListener('click', finish);
  (el.querySelector('#ob-next') as HTMLElement).addEventListener('click', () => {
    if (step === STEPS.length - 1) {
      finish();
    } else {
      step++;
      paintStep(el);
    }
  });
}

/** Показать онбординг, если это первый запуск */
export function maybeOnboard(host: HTMLElement): void {
  if (!state.settings.onboarded && !host.querySelector('#onboarding')) {
    host.appendChild(renderOnboarding());
  }
}
