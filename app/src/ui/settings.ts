/* ============================================================
   Finora — экран «Настройки»
   ============================================================ */

import { addCategory, mutate, resetAll, state, renameCategory } from '../state/app';
import type { CustomColors } from '../domain/types';
import { ACCENT_SWATCHES, CUSTOM_COLOR_FIELDS, PALETTES, applyCustomPreset, deleteCustomPreset, radiusLabel, restoreSnapshot, saveCustomPreset, setAppearance, useFactoryPreset } from '../state/appearance';
import { AI_MODEL_LABEL, AI_MODEL_SIZE_LABEL, aiAvailable, aiStatus, cancelDownload, deleteModel, downloadModel, resetAiStatusCache, type AiStatus } from '../domain/aiEngine';
import { icon } from '../core/icons';
import { dateTimeAgo, esc, uid } from '../core/utils';
import { openModal, topbar, toast } from './common';
import { exportJSON } from '../core/export';

const NAV = [
  { id: 'account', t: 'Профиль', ico: 'user' },
  { id: 'appearance', t: 'Внешний вид', ico: 'moon' },
  { id: 'categories', t: 'Категории', ico: 'tagIcon' },
  { id: 'data', t: 'Данные и экспорт', ico: 'file' },
  { id: 'ai', t: 'AI-модель', ico: 'sparkle' },
  { id: 'privacy', t: 'Приватность', ico: 'lock' },
  { id: 'about', t: 'О приложении', ico: 'info' },
];

let section = 'appearance';

export function renderSettings(container: HTMLElement): void {
  const a = state.appearance;
  const active = PALETTES.find((p) => p.id === a.preset)!;
  const accentHex = a.accent ?? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

  container.innerHTML = `
  ${topbar('Настройки', 'Профиль, внешний вид и данные')}
  <div class="view"><div class="view-inner" style="display:grid;grid-template-columns:200px 1fr;gap:var(--sp-5);align-items:start">

    <nav class="settings-nav">
      ${NAV.map((n) => `
        <button class="nav-item ${section === n.id ? 'active' : ''}" data-sec="${n.id}">
          ${icon(n.ico as never, 17)}<span>${n.t}</span>
        </button>`).join('')}
    </nav>

    <div class="col stagger" style="gap:var(--sp-4)">

      ${section === 'account' ? accountSection() : ''}
      ${section === 'appearance' ? appearanceSection(a, active.name, accentHex) : ''}
      ${section === 'categories' ? categoriesSection() : ''}
      ${section === 'data' ? dataSection() : ''}
      ${section === 'ai' ? aiSection() : ''}
      ${section === 'privacy' ? privacySection() : ''}
      ${section === 'about' ? aboutSection() : ''}

    </div>
  </div></div>`;

  // навигация по секциям
  container.querySelectorAll('[data-sec]').forEach((b) =>
    b.addEventListener('click', () => {
      section = (b as HTMLElement).dataset.sec!;
      renderSettings(container);
      (container.querySelector('.view') as HTMLElement)?.scrollTo({ top: 0 });
    }),
  );

  bindSection(container);
}

/* ---------- Секции ---------- */

function accountSection(): string {
  return `
  <div class="card">
    <div class="card-head"><span class="card-title">Профиль</span></div>
    <div class="row" style="gap:14px">
      <span class="avatar" style="width:52px;height:52px;font-size:19px">${esc(initials(state.settings.profileName))}</span>
      <div class="grow">
        <div class="field" style="max-width:280px">
          <label class="field-label" for="set-name">Имя в интерфейсе</label>
          <input class="input" id="set-name" value="${esc(state.settings.profileName)}" maxlength="30"/>
        </div>
      </div>
    </div>
    <div class="note" style="margin-top:14px">${icon('info', 14)}<span>Локальное приложение без аккаунта. Все данные лежат только на этом компьютере.</span></div>
  </div>`;
}

/** Карточка тонкой настройки произвольных цветов */
function customColorsCard(a: typeof state.appearance): string {
  const cs = getComputedStyle(document.documentElement);
  const hasCustom = !!a.custom && Object.values(a.custom).some(Boolean);
  const cur = (key: string, cssVar: string): string => {
    const fromCustom = (a.custom as Record<string, string | undefined> | undefined)?.[key];
    if (fromCustom) return fromCustom;
    return cs.getPropertyValue(cssVar).trim() || '#888888';
  };
  const VAR_OF: Record<string, string> = {
    bg: '--bg', surface: '--surface', surface2: '--surface-2', surface3: '--surface-3',
    border: '--border', text: '--text', text2: '--text-2', income: '--income', expense: '--expense',
  };
  return `
  <div class="card">
    <div class="card-head">
      <span class="card-title">Свой цвет — точная настройка</span>
      ${hasCustom
        ? `<button class="chip" id="custom-reset">${icon('x', 12)} Сбросить свои цвета</button>`
        : '<span class="chip">поверх пресета</span>'}
    </div>
    <div class="grid g3" style="gap:8px">
      ${CUSTOM_COLOR_FIELDS.map((f) => `
        <label class="row" style="justify-content:space-between;gap:8px;font-size:12.5px;color:var(--text-2);padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);cursor:pointer">
          <span>${f.label}</span>
          <input type="color" data-custom-color="${f.key}" value="${cur(f.key, VAR_OF[f.key])}" style="width:34px;height:26px"/>
        </label>`).join('')}
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Меняйте любой цвет интерфейса — пресет останется основой, каждое изменение попадёт в историю, и его можно откатить.</p>
  </div>`;
}

function appearanceSection(a: typeof state.appearance, activeName: string, accentHex: string): string {
  return `
  <div class="card">
    <div class="card-head">
      <span class="card-title">Готовые пресеты</span>
      <span class="chip">${activeName}</span>
    </div>
    <div class="palette-grid">
      ${PALETTES.map((p) => `
        <button class="palette-card ${a.preset === p.id && !a.accent ? 'active' : ''}" data-preset="${p.id}">
          <span class="palette-swatches">${p.swatches.map((s) => `<i style="background:${s}"></i>`).join('')}</span>
          <span class="grow" style="text-align:left">
            <b style="font-size:13.5px">${p.name}</b><br/>
            <span class="faint" style="font-size:11.5px">${p.mode === 'dark' ? 'тёмная' : 'светлая'} тема</span>
          </span>
          ${a.preset === p.id && !a.accent ? `<span style="color:var(--accent-final)">${icon('check', 15)}</span>` : ''}
        </button>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">Акцентный цвет</span></div>
    <div class="row wrap" style="gap:8px">
      ${ACCENT_SWATCHES.map((s) => `<button class="swatch ${accentHex.toLowerCase() === s.toLowerCase() ? 'active' : ''}" data-accent="${s}" style="background:${s}" title="${s}"></button>`).join('')}
      <label class="row" style="gap:8px;font-size:12.5px;color:var(--text-2);cursor:pointer">
        <input type="color" id="accent-custom" value="${accentHex}" title="Свой цвет"/>свой цвет
      </label>
      ${a.accent ? `<button class="chip" id="accent-reset">Сбросить акцент</button>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">Форма и плотность</span></div>
    <div class="field">
      <label class="field-label">Скругления — <span id="radius-val">${radiusLabel(a.radius)}</span></label>
      <input type="range" id="radius-range" min="0.6" max="1.5" step="0.05" value="${a.radius}" style="max-width:320px"/>
    </div>
    <div class="field" style="margin-top:12px">
      <label class="field-label">Плотность интерфейса</label>
      <div class="seg" id="density-seg">
        <button data-v="cozy" class="${a.density === 'cozy' ? 'active' : ''}">Просторная</button>
        <button data-v="compact" class="${a.density === 'compact' ? 'active' : ''}">Компактная</button>
      </div>
    </div>
  </div>

  ${customColorsCard(a)}

  <div class="card">
    <div class="card-head">
      <span class="card-title">Мои пресеты</span>
      <button class="btn btn-soft btn-sm" id="preset-save">${icon('plus', 14)} Сохранить текущий</button>
    </div>
    ${state.customPresets.length
      ? `<div class="row wrap" style="gap:8px">
          ${state.customPresets.map((p) => `
            <span class="chip ${a.preset === p.appearance.preset && a.accent === p.appearance.accent ? 'active' : ''}" style="gap:9px">
              <button data-use-preset="${p.id}" style="font-weight:600">${esc(p.name)}</button>
              <button data-del-preset="${p.id}" title="Удалить" style="color:var(--expense);display:grid">${icon('x', 12)}</button>
            </span>`).join('')}
        </div>`
      : `<p class="muted" style="font-size:13px">Настройте цвета и скругления, затем сохраните их как свой пресет.</p>`}
  </div>

  <div class="card">
    <div class="card-head">
      <span class="card-title">История изменений</span>
      ${state.appearanceHistory.length ? `<button class="btn btn-ghost btn-sm" id="history-clear">Очистить</button>` : ''}
    </div>
    ${state.appearanceHistory.length
      ? `<div class="col" style="gap:6px">
          ${state.appearanceHistory.slice(0, 8).map((h) => `
            <div class="row" style="gap:10px;padding:8px 10px;border-radius:10px;background:var(--surface-2)">
              <span class="faint" style="font-size:12px;min-width:120px">${esc(dateTimeAgo(h.at))}</span>
              <span style="font-size:13px" class="grow ellipsis">${esc(h.label)}</span>
              <button class="btn btn-soft btn-sm" data-restore="${h.id}">Вернуть</button>
            </div>`).join('')}
        </div>`
      : `<p class="muted" style="font-size:13px">Каждое изменение внешнего вида попадает сюда — можно откатиться на любой шаг.</p>`}
  </div>`;
}

function categoriesSection(): string {
  const cats = state.categories;
  return `
  <div class="card">
    <div class="card-head">
      <span class="card-title">Категории расходов и доходов</span>
      <button class="btn btn-soft btn-sm" id="cat-add">${icon('plus', 14)} Своя категория</button>
    </div>
    <div class="grid g3" style="gap:8px">
      ${cats.map((c) => `
        <div class="row" style="gap:10px;padding:9px 10px;border-radius:12px;background:var(--surface-2)">
          <span class="cat-tile" style="--cat:${c.color};width:30px;height:30px;border-radius:9px">${icon(c.icon as never, 15)}</span>
          <span class="grow ellipsis" style="font-size:13px" title="Нажмите, чтобы переименовать" data-rename="${c.id}">${esc(c.name)}</span>
          ${c.custom ? `<span class="chip" style="padding:2px 8px;font-size:10.5px">своя</span>` : ''}
        </div>`).join('')}
    </div>
    <div class="note" style="margin-top:14px">${icon('info', 14)}<span>Нажмите на название, чтобы переименовать. Служебные категории («Переводы», «Не определено») используются автоматически.</span></div>
  </div>`;
}

/* ---------- AI-модель (этап 3) ---------- */

const gbLabel = (bytes: number): string =>
  `${(bytes / 1e9).toFixed(1).replace('.', ',')} ГБ`;

/** Живое состояние секции (переживает переходы по вкладкам настроек) */
let aiCardStatus: AiStatus | null | 'checking' = 'checking';
let dlActive = false;
let dlProgress: { received: number; total: number } | null = null;

function aiSection(): string {
  if (!aiAvailable()) {
    return `
    <div class="card">
      <div class="card-head">
        <span class="card-title">Локальная AI-модель</span>
        <span class="chip">${AI_MODEL_LABEL}</span>
      </div>
      <p class="muted" style="font-size:13px">Модель исполняется llama.cpp и доступна только в нативном приложении Finora.app. В браузерной версии чат отвечает встроенными правилами — данные всё равно никуда не уходят.</p>
      <div class="note accent" style="margin-top:12px">${icon('shield', 15)}<span>Облачный AI в Finora выключен на уровне архитектуры: анализ всегда считается на этом устройстве.</span></div>
    </div>`;
  }
  return `
  <div class="card">
    <div class="card-head">
      <span class="card-title">Локальная AI-модель</span>
      <span class="chip" id="ai-chip">проверяю…</span>
    </div>
    <div id="ai-card-body">
      <p class="muted" style="font-size:13px">Проверяю состояние модели…</p>
    </div>
    <div class="note accent" style="margin-top:12px">${icon('shield', 15)}<span>Сеть используется один раз — чтобы скачать файл модели. После этого всё считается на этом Mac: диалоги и данные никуда не уходят.</span></div>
  </div>`;
}

/** Отрисовать актуальное состояние модели в карточку (без ререндера экрана) */
function paintAiCard(container: HTMLElement): void {
  const body = container.querySelector<HTMLElement>('#ai-card-body');
  const chip = container.querySelector<HTMLElement>('#ai-chip');
  if (!body || !chip) return;

  if (dlActive) {
    chip.textContent = 'скачивается…';
    const p = dlProgress;
    const pct = p && p.total > 0 ? Math.round((p.received / p.total) * 100) : 0;
    body.innerHTML = `
      <p class="muted" style="font-size:13px">Скачиваю ${AI_MODEL_LABEL} (${AI_MODEL_SIZE_LABEL}) — один раз, потом всё локально.</p>
      <div class="progress" style="margin-top:10px"><i id="ai-progress" style="width:${pct}%"></i></div>
      <div class="row-between" style="margin-top:8px">
        <span class="muted" style="font-size:12.5px" id="ai-progress-label">${p ? `${gbLabel(p.received)} из ${gbLabel(p.total)} · ${pct}%` : 'подключаюсь…'}</span>
        <button class="btn btn-soft btn-sm" id="ai-cancel">Отменить</button>
      </div>`;
    container.querySelector('#ai-cancel')?.addEventListener('click', () => {
      void cancelDownload();
    });
    return;
  }

  const st = aiCardStatus;
  if (st === 'checking') {
    chip.textContent = 'проверяю…';
    body.innerHTML = `<p class="muted" style="font-size:13px">Проверяю состояние модели…</p>`;
    return;
  }
  if (!st) {
    chip.textContent = 'недоступно';
    body.innerHTML = `<p class="muted" style="font-size:13px">Нативные компоненты недоступны в этой сессии.</p>`;
    return;
  }

  if (st.modelReady) {
    chip.textContent = 'установлена';
    body.innerHTML = `
      <div class="row" style="gap:10px">
        <span class="cat-tile" style="--cat:var(--accent-final);width:38px;height:38px;border-radius:11px">${icon('sparkle', 18)}</span>
        <div class="grow">
          <div style="font-weight:600;font-size:14px">${AI_MODEL_LABEL}</div>
          <div class="muted" style="font-size:12.5px;margin-top:2px">
            ${st.modelBytes ? `Файл модели — ${gbLabel(st.modelBytes)}` : 'Файл модели на диске'}${st.loaded ? ` · загружена${st.gpu ? ', работает на GPU' : ''}` : ''} · всё считается на этом Mac
          </div>
        </div>
        <button class="btn btn-soft btn-sm" id="ai-delete">${icon('trash', 14)} Удалить</button>
      </div>
      <p class="muted" style="font-size:12.5px;margin-top:10px">Чат свободно отвечает на любые финансовые вопросы, опираясь на ваши локальные данные. Удаление файла модели вернёт чат к режиму правил.</p>`;
    container.querySelector('#ai-delete')?.addEventListener('click', () => {
      const scrim = openModal(`
        <h2>Удалить модель?</h2>
        <p class="muted" style="margin-top:8px;font-size:13.5px">Файл ${AI_MODEL_LABEL} (${AI_MODEL_SIZE_LABEL}) будет удалён с диска. Чат продолжит работать по правилам, скачать модель можно будет снова в любой момент.</p>
        <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
          <button class="btn btn-ghost" data-close>Отмена</button>
          <button class="btn btn-danger" id="ai-del-go">Удалить</button>
        </div>`);
      (scrim.querySelector('#ai-del-go') as HTMLElement).addEventListener('click', async () => {
        await deleteModel();
        toast('ok', 'Модель удалена');
        scrim.remove();
        aiCardStatus = await aiStatus(true);
        paintAiCard(container);
      });
    });
    return;
  }

  chip.textContent = 'не скачана';
  body.innerHTML = `
    <p class="muted" style="font-size:13px">Без модели чат отвечает встроенными правилами. Скачайте ${AI_MODEL_LABEL} (${AI_MODEL_SIZE_LABEL}) — и чат станет свободным собеседником: анализ трат, жизненные ситуации, любые финансовые вопросы.</p>
    <button class="btn btn-primary btn-sm" id="ai-download" style="margin-top:12px">${icon('download', 15)} Скачать модель · ${AI_MODEL_SIZE_LABEL}</button>`;
  container.querySelector('#ai-download')?.addEventListener('click', () => {
    dlActive = true;
    dlProgress = null;
    paintAiCard(container);
    downloadModel((p) => {
      dlProgress = p;
      updateAiProgress(container);
    })
      .then(async () => {
        toast('ok', 'Модель скачана — чат теперь отвечает свободно');
        resetAiStatusCache();
        aiCardStatus = await aiStatus(true);
      })
      .catch((e) => {
        const msg = String(e);
        toast('warn', /отмен/i.test(msg) ? 'Скачивание отменено' : `Не удалось скачать модель: ${msg}`);
      })
      .finally(() => {
        dlActive = false;
        dlProgress = null;
        paintAiCard(container);
      });
  });
}

/** Обновить полосу прогресса без перерисовки карточки */
function updateAiProgress(container: HTMLElement): void {
  const bar = container.querySelector<HTMLElement>('#ai-progress');
  const label = container.querySelector<HTMLElement>('#ai-progress-label');
  if (!bar || !dlProgress) return;
  const pct = dlProgress.total > 0 ? Math.round((dlProgress.received / dlProgress.total) * 100) : 0;
  bar.style.width = `${pct}%`;
  if (label) label.textContent = `${gbLabel(dlProgress.received)} из ${gbLabel(dlProgress.total)} · ${pct}%`;
}

async function refreshAiCard(container: HTMLElement): Promise<void> {
  aiCardStatus = await aiStatus(true);
  paintAiCard(container);
}

function dataSection(): string {
  return `
  <div class="card">
    <div class="card-head"><span class="card-title">Экспорт и резервная копия</span></div>
    <div class="row wrap" style="gap:8px">
      <button class="btn btn-primary btn-sm" id="data-csv">${icon('download', 15)} CSV (Excel, Numbers)</button>
      <button class="btn btn-soft btn-sm" id="data-json">${icon('file', 15)} JSON-бэкап</button>
    </div>
    <p class="muted" style="font-size:12.5px;margin-top:10px">CSV — таблица операций для анализа где угодно. JSON — полная копия данных и настроек для восстановления.</p>
  </div>

  <div class="card ${state.settings.demoMode ? 'error-card' : ''}">
    <div class="card-head"><span class="card-title">Демо-режим</span></div>
    <div class="row-between">
      <div style="max-width:420px">
        <div style="font-weight:600;font-size:14px">Показные данные для презентации</div>
        <p class="muted" style="font-size:12.5px;margin-top:4px">Сбрасывает все данные к демо-истории и показывает приветствие. Перед финальной версией отключите — кнопка исчезнет.</p>
      </div>
      <button class="switch ${state.settings.demoMode ? 'on' : ''}" id="demo-switch"></button>
    </div>
    ${state.settings.demoMode ? `<button class="btn btn-danger btn-sm" id="demo-reset" style="margin-top:12px">${icon('trash', 14)} Сбросить к демо-данным</button>` : ''}
  </div>`;
}

function privacySection(): string {
  return `
  <div class="card">
    <div class="card-head"><span class="card-title">Приватность</span></div>
    <div class="col" style="gap:12px">
      <div class="row" style="gap:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Операции хранятся только на этом компьютере</span></div>
      <div class="row" style="gap:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Облачный AI выключен навсегда — только локальная модель</span></div>
      <div class="row" style="gap:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">AI-модель исполняется llama.cpp прямо на этом Mac</span></div>
      <div class="row" style="gap:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Сеть нужна один раз — чтобы скачать файл модели</span></div>
      <div class="row" style="gap:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Пароль банка не запрашивается и не хранится</span></div>
    </div>
    <div class="note accent" style="margin-top:14px">${icon('shield', 15)}<span>Локальная AI-модель работает прямо на этом Mac — данные не покидают компьютер даже для анализа.</span></div>
  </div>`;
}

function aboutSection(): string {
  return `
  <div class="card">
    <div class="row" style="gap:14px">
      <span class="cat-tile cat-tile-lg" style="--cat:var(--accent-final)">${icon('wallet', 22)}</span>
      <div>
        <h2>Finora</h2>
        <div class="muted" style="font-size:13px;margin-top:3px">Версия 0.9.0 «Prototype» · локальный анализ личных финансов</div>
      </div>
    </div>
    <div class="kv" style="margin-top:16px;grid-template-columns:170px 1fr">
      <dt class="faint">Платформа</dt><dd>macOS (Tauri + TypeScript)</dd>
      <dt class="faint">Хранение данных</dt><dd>локально, без облака</dd>
      <dt class="faint">AI-советник</dt><dd>правила + локальная модель Qwen3.5-4B (опционально)</dd>
      <dt class="faint">Автор</dt><dd>Рахматуллин Динар · ИУ5, МГТУ им. Н.Э. Баумана</dd>
      <dt class="faint">Связь</dt><dd>dinar.rahmatulin2001@gmail.com</dd>
    </div>
  </div>
  ${aiAvailable() ? fullRemoveCard() : ''}`;
}

/** Карточка полного удаления — только в нативном приложении */
function fullRemoveCard(): string {
  return `
  <div class="card error-card">
    <div class="card-head"><span class="card-title">Полное удаление</span></div>
    <p class="muted" style="font-size:12.5px">Удаляет с компьютера всё, что создала Finora: операции, цели, настройки, AI-модель (2,7 ГБ) и адаптер. Само приложение улетит в Корзину, после чего Finora закроется.</p>
    <button class="btn btn-danger btn-sm" id="full-wipe" style="margin-top:12px">${icon('trash', 14)} Удалить Finora полностью</button>
  </div>`;
}

/* ---------- Обработчики ---------- */

function bindSection(container: HTMLElement): void {
  // AI-модель: статус загружается асинхронно после рендера
  if (section === 'ai') void refreshAiCard(container);

  // пресеты
  container.querySelectorAll('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      useFactoryPreset((b as HTMLElement).dataset.preset as never);
      renderSettings(container);
    }),
  );

  // акценты
  container.querySelectorAll('[data-accent]').forEach((b) =>
    b.addEventListener('click', () => {
      setAppearance({ accent: (b as HTMLElement).dataset.accent }, 'Смена акцентного цвета');
      renderSettings(container);
    }),
  );
  (container.querySelector('#accent-custom') as HTMLInputElement)?.addEventListener('change', (e) => {
    setAppearance({ accent: (e.target as HTMLInputElement).value }, 'Свой акцентный цвет');
    renderSettings(container);
  });
  container.querySelector('#accent-reset')?.addEventListener('click', () => {
    setAppearance({ accent: undefined }, 'Сброс акцентного цвета');
    renderSettings(container);
  });

  // скругления
  let rDeb: ReturnType<typeof setTimeout>;
  (container.querySelector('#radius-range') as HTMLInputElement)?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    (container.querySelector('#radius-val') as HTMLElement).textContent = radiusLabel(v);
    clearTimeout(rDeb);
    rDeb = setTimeout(() => setAppearance({ radius: v }, `Скругления: ${radiusLabel(v)}`), 250);
  });

  // тонкая настройка цветов
  container.querySelectorAll('[data-custom-color]').forEach((inp) =>
    inp.addEventListener('change', (e) => {
      const key = (inp as HTMLElement).dataset.customColor as keyof CustomColors;
      const value = (e.target as HTMLInputElement).value;
      const label = CUSTOM_COLOR_FIELDS.find((f) => f.key === key)?.label ?? key;
      setAppearance(
        { custom: { ...(state.appearance.custom ?? {}), [key]: value } },
        `Свой цвет: ${label}`,
      );
      renderSettings(container);
    }),
  );
  (container.querySelector('#custom-reset') as HTMLElement)?.addEventListener('click', () => {
    setAppearance({ custom: undefined }, 'Сброс тонкой настройки цветов');
    renderSettings(container);
  });

  // плотность
  container.querySelector('#density-seg')?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-v]') as HTMLElement | null;
    if (!b) return;
    setAppearance({ density: b.dataset.v as 'cozy' | 'compact' }, `Плотность: ${b.textContent}`);
    renderSettings(container);
  });

  // свои пресеты
  (container.querySelector('#preset-save') as HTMLElement)?.addEventListener('click', () => {
    const scrim = openModal(`
      <h2>Сохранить пресет</h2>
      <div class="field" style="margin-top:12px">
        <label class="field-label" for="cp-name">Название</label>
        <input class="input" id="cp-name" placeholder="Например: Мой стиль" maxlength="24"/>
      </div>
      <div class="row" style="gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-primary" id="cp-save">Сохранить</button>
      </div>`);
    (scrim.querySelector('#cp-save') as HTMLElement).addEventListener('click', () => {
      const name = (scrim.querySelector('#cp-name') as HTMLInputElement).value.trim();
      if (!name) return;
      saveCustomPreset(name);
      toast('ok', `Пресет «${name}» сохранён`);
      scrim.remove();
      renderSettings(container);
    });
  });
  container.querySelectorAll('[data-use-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      applyCustomPreset((b as HTMLElement).dataset.usePreset!);
      renderSettings(container);
    }),
  );
  container.querySelectorAll('[data-del-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      deleteCustomPreset((b as HTMLElement).dataset.delPreset!);
      renderSettings(container);
    }),
  );

  // история
  container.querySelectorAll('[data-restore]').forEach((b) =>
    b.addEventListener('click', () => {
      restoreSnapshot((b as HTMLElement).dataset.restore!);
      toast('ok', 'Настройки внешнего вида возвращены');
      renderSettings(container);
    }),
  );
  (container.querySelector('#history-clear') as HTMLElement)?.addEventListener('click', () => {
    mutate({ appearanceHistory: [] });
    renderSettings(container);
  });

  // имя
  (container.querySelector('#set-name') as HTMLInputElement)?.addEventListener('change', (e) => {
    const v = (e.target as HTMLInputElement).value.trim() || 'Динар';
    mutate((s) => ({ settings: { ...s.settings, profileName: v } }));
    toast('ok', 'Имя обновлено');
    import('../shell').then((m) => m.renderSidebar());
  });

  // категории
  (container.querySelector('#cat-add') as HTMLElement)?.addEventListener('click', () => {
    const scrim = openModal(`
      <h2>Своя категория</h2>
      <div class="field" style="margin-top:12px">
        <label class="field-label" for="nc-name">Название</label>
        <input class="input" id="nc-name" placeholder="Например: Домашние животные" maxlength="30"/>
      </div>
      <div class="field" style="margin-top:12px">
        <label class="field-label">Цвет</label>
        <div class="row wrap" style="gap:8px" id="nc-colors">
          ${['#61a862', '#de7e66', '#7186d8', '#c9a25c', '#cb7a93', '#b085cb', '#4fb8a8', '#45a6c9'].map((c, i) => `
            <button class="swatch ${i === 0 ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
        </div>
      </div>
      <div class="row" style="gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-primary" id="nc-save">Добавить</button>
      </div>`);
    let color = '#61a862';
    scrim.querySelectorAll('#nc-colors [data-c]').forEach((b) =>
      b.addEventListener('click', () => {
        color = (b as HTMLElement).dataset.c!;
        scrim.querySelectorAll('#nc-colors [data-c]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      }),
    );
    (scrim.querySelector('#nc-save') as HTMLElement).addEventListener('click', () => {
      const name = (scrim.querySelector('#nc-name') as HTMLInputElement).value.trim();
      if (!name) return;
      addCategory({ id: uid('cat'), name, kind: 'expense', color, icon: 'tagIcon', custom: true });
      toast('ok', `Категория «${name}» добавлена`);
      scrim.remove();
      renderSettings(container);
    });
  });
  container.querySelectorAll('[data-rename]').forEach((el) =>
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.rename!;
      const cat = state.categories.find((c) => c.id === id)!;
      const scrim = openModal(`
        <h2>Переименовать</h2>
        <div class="field" style="margin-top:12px">
          <label class="field-label" for="rn-name">Название</label>
          <input class="input" id="rn-name" value="${esc(cat.name)}" maxlength="30"/>
        </div>
        <div class="row" style="gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost" data-close>Отмена</button>
          <button class="btn btn-primary" id="rn-save">Сохранить</button>
        </div>`);
      (scrim.querySelector('#rn-save') as HTMLElement).addEventListener('click', () => {
        const name = (scrim.querySelector('#rn-name') as HTMLInputElement).value.trim();
        if (name) {
          renameCategory(id, name);
          toast('ok', 'Категория переименована');
        }
        scrim.remove();
        renderSettings(container);
      });
    }),
  );

  // полное удаление (только нативная сборка)
  (container.querySelector('#full-wipe') as HTMLElement)?.addEventListener('click', () => {
    const scrim = openModal(`
      <h2>Удалить Finora полностью?</h2>
      <p class="muted" style="margin-top:8px;font-size:13.5px">Будут безвозвратно удалены: все операции и цели, настройки, темы, AI-модель с адаптером (~2,7 ГБ) и все служебные файлы. Само приложение улетит в Корзину, после чего Finora закроется.</p>
      <div class="note" style="margin-top:10px">${icon('alert', 14)}<span>Действие нельзя отменить. Если нужно — сначала экспортируйте данные в разделе «Данные и экспорт».</span></div>
      <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-danger" id="wipe-go">Удалить всё и выйти</button>
      </div>`);
    (scrim.querySelector('#wipe-go') as HTMLElement).addEventListener('click', async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        localStorage.clear();
        await invoke('full_wipe', { trashApp: true });
      } catch {
        /* приложение уже закрывается */
      }
    });
  });

  // данные
  (container.querySelector('#data-csv') as HTMLElement)?.addEventListener('click', () => {
    import('../core/export').then((m) => m.exportCSV(state.txs));
  });
  (container.querySelector('#data-json') as HTMLElement)?.addEventListener('click', () => exportJSON());

  // демо-режим
  (container.querySelector('#demo-switch') as HTMLElement)?.addEventListener('click', () => {
    mutate((s) => ({ settings: { ...s.settings, demoMode: !s.settings.demoMode } }));
    toast('ok', state.settings.demoMode ? 'Демо-режим включён' : 'Демо-режим выключен');
    renderSettings(container);
  });
  (container.querySelector('#demo-reset') as HTMLElement)?.addEventListener('click', () => {
    const scrim = openModal(`
      <h2>Сбросить к демо-данным?</h2>
      <p class="muted" style="margin-top:8px;font-size:13.5px">Все операции, цели и настройки вернутся к исходному демонстрационному состоянию.</p>
      <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-danger" id="reset-go">Сбросить</button>
      </div>`);
    (scrim.querySelector('#reset-go') as HTMLElement).addEventListener('click', () => {
      resetAll();
    });
  });
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'F';
}
