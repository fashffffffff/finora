/* ============================================================
   Finora — экран «Банк»: подключение Т-Банка (демо-сценарий).
   Реальный провайдер подключается заменой activeProvider,
   экран останется тем же.
   ============================================================ */

import { mutate, state } from '../state/app';
import { CONNECT_STEPS, connectBank } from '../data/syncService';
import { icon, tbankMark } from '../core/icons';
import { dateTimeAgo, esc, pluralOps } from '../core/utils';
import { topbar, toast } from './common';
import type { SyncPhase } from '../data/syncService';

let phase: SyncPhase = 'idle';

export function renderBank(container: HTMLElement): void {
  const bank = state.bank;

  const statusChip = bank.connected
    ? `<span class="chip" style="color:var(--income)"><i class="status-dot ok"></i>Подключён</span>`
    : `<span class="chip"><i class="status-dot off"></i>Не подключён</span>`;

  const stepIndex = CONNECT_STEPS.findIndex((s) => s.phase === phase);
  const busy = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  container.innerHTML = `
  ${topbar('Банк', 'Источник операций Finora')}

  <div class="view"><div class="view-inner stagger" style="display:flex;flex-direction:column;gap:var(--sp-4);max-width:860px">

    <div class="card">
      <div class="row" style="gap:14px;align-items:flex-start">
        ${tbankMark(46)}
        <div class="grow">
          <div class="row" style="gap:10px">
            <h2>Т-Банк</h2>
            ${statusChip}
          </div>
          <div class="muted" style="font-size:13px;margin-top:4px">
            ${bank.connected
              ? `Счёт ${esc(bank.maskedNumber ?? '')} · подключено ${bank.connectedAt ? dateTimeAgo(bank.connectedAt) : ''} · всего ${pluralOps(state.txs.length)}`
              : 'Finora прочитает историю операций и будет поддерживать их актуальными. Пароль от банка не хранится в приложении.'}
          </div>
        </div>
        ${!bank.connected
          ? `<button class="btn btn-primary" id="bank-connect" ${busy ? 'disabled' : ''}>${busy ? 'Подключение…' : 'Подключить'}</button>`
          : `<span class="row" style="gap:8px">
              <button class="btn btn-ghost" id="bank-disconnect" ${busy ? 'disabled' : ''}>Отключить</button>
              <button class="btn btn-danger" id="bank-purge" ${busy ? 'disabled' : ''} title="Отключить банк и удалить загруженные операции">Удалить данные</button>
            </span>`}
      </div>

      <div class="steps" id="bank-steps" style="margin-top:14px;${bank.connected && phase !== 'idle' ? '' : 'display:none'}">
        ${CONNECT_STEPS.map((s, i) => `
          <div class="step ${stepCls(s.phase, phase, i)}" data-step="${s.phase}">
            <span class="step-ico">${stepIcon(s.phase, phase, i)}</span>
            <span>${esc(s.title)}</span>
            <span class="grow"></span>
            <span class="faint" style="font-size:12px">${stepHint(s.phase, phase)}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="note">
      <span class="note-icon">${icon('shield', 15)}</span>
      <span><b style="color:var(--text)">Как это работает.</b> Данные проходят через конвейер: банк → нормализация → классификатор → аналитика. Сейчас используется демонстрационный источник данных; настоящий Т-Банк подключается без изменения интерфейса. Детали синхронизации — в разделе «Синхронизация».</span>
    </div>

    <div class="grid g3">
      <div class="card">
        <span class="stat-label">Доступ Finora</span>
        <div class="row" style="gap:8px;margin-top:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Только чтение операций</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><i class="status-dot ok"></i><span style="font-size:13.5px">Без права платежей</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><i class="status-dot ok"></i><span style="font-size:13.5px">Без доступа к паролю</span></div>
      </div>
      <div class="card">
        <span class="stat-label">Хранение</span>
        <div class="row" style="gap:8px;margin-top:10px"><i class="status-dot ok"></i><span style="font-size:13.5px">Локально на компьютере</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><i class="status-dot ok"></i><span style="font-size:13.5px">Без облачной синхронизации</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><i class="status-dot ok"></i><span style="font-size:13.5px">Экспорт в любой момент</span></div>
      </div>
      <div class="card">
        <span class="stat-label">Дальше</span>
        <div style="font-size:13.5px;margin-top:10px;line-height:1.6" class="muted">
          Этап 2 — реальное подключение Т-Банка и авто-синхронизация.<br/>
          Этап 3 — локальная AI-модель для анализа.
        </div>
      </div>
    </div>

  </div></div>`;

  (container.querySelector('#bank-connect') as HTMLElement)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Подключение…';
    const steps = container.querySelector('#bank-steps') as HTMLElement;
    steps.style.display = '';

    try {
      await connectBank((p) => {
        phase = p;
        // перерисовать шаги
        steps.innerHTML = CONNECT_STEPS.map((s, i) => `
          <div class="step ${stepCls(s.phase, phase, i)}" data-step="${s.phase}">
            <span class="step-ico">${stepIcon(s.phase, phase, i)}</span>
            <span>${esc(s.title)}</span>
            <span class="grow"></span>
            <span class="faint" style="font-size:12px">${stepHint(s.phase, phase)}</span>
          </div>`).join('');
      });
      toast('ok', `Т-Банк подключён · ${pluralOps(state.txs.length)}`);
      phase = 'done';
      setTimeout(() => import('../shell').then((m) => m.navigate('dashboard')), 900);
    } catch (err) {
      phase = 'error';
      toast('error', 'Не удалось подключить банк. Попробуйте ещё раз.');
      btn.disabled = false;
      btn.textContent = 'Подключить';
    }
  });

  (container.querySelector('#bank-disconnect') as HTMLElement)?.addEventListener('click', () => {
    mutate((s) => ({ bank: { connected: false, totalImported: 0 }, syncLogs: [] }));
    toast('warn', 'Банк отключён. Операции сохранены локально.');
    renderBank(container);
  });

  (container.querySelector('#bank-purge') as HTMLElement)?.addEventListener('click', () => {
    import('./common').then(({ openModal }) => {
      const scrim = openModal(`
        <h2>Отключить банк и удалить операции?</h2>
        <p class="muted" style="margin-top:8px;font-size:13.5px">Из локальной базы пропадут все загруженные операции и журнал синхронизаций. Цели и настройки останутся. Действие необратимо — при необходимости сначала сделайте экспорт в CSV.</p>
        <div class="row" style="gap:8px;justify-content:flex-end;margin-top:18px">
          <button class="btn btn-ghost" data-close>Оставить как есть</button>
          <button class="btn btn-danger" id="purge-go">Отключить и удалить</button>
        </div>`);
      (scrim.querySelector('#purge-go') as HTMLElement).addEventListener('click', () => {
        mutate((s) => ({
          txs: [],
          syncLogs: [],
          bank: { connected: false, totalImported: 0 },
        }));
        scrim.remove();
        toast('warn', 'Банк отключён, операции удалены');
        renderBank(container);
      });
    });
  });
}

function stepCls(stepPhase: SyncPhase, cur: SyncPhase, i: number): string {
  const curIdx = CONNECT_STEPS.findIndex((s) => s.phase === cur);
  if (curIdx > i) return 'done';
  if (curIdx === i) return cur === 'done' ? 'done' : 'doing';
  return '';
}

function stepIcon(stepPhase: SyncPhase, cur: SyncPhase, i: number): string {
  const curIdx = CONNECT_STEPS.findIndex((s) => s.phase === cur);
  if (curIdx > i || (curIdx === i && cur === 'done')) return icon('check', 13);
  return '';
}

function stepHint(stepPhase: SyncPhase, cur: SyncPhase): string {
  if (cur === stepPhase) {
    switch (cur) {
      case 'connecting': return 'соединение…';
      case 'auth': return 'ожидание…';
      case 'fetching': return 'загрузка истории…';
      case 'classifying': return 'категории…';
      case 'done': return '';
      default: return '';
    }
  }
  return '';
}
