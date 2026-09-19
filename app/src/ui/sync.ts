/* ============================================================
   Finora — экран «Синхронизация»
   ============================================================ */

import { mutate, state } from '../state/app';
import { runSync } from '../data/syncService';
import { icon } from '../core/icons';
import { dateTimeAgo, esc, timeLabel } from '../core/utils';
import { emptyState, topbar, toast } from './common';

let busy = false;

export function renderSync(container: HTMLElement): void {
  const bank = state.bank;

  const lastLog = state.syncLogs[0];
  const errors = state.syncLogs.filter((l) => l.status === 'error');

  container.innerHTML = `
  ${topbar(
    'Синхронизация',
    bank.connected ? 'Обмен операциями с банком' : 'Банк ещё не подключён',
    `<button class="btn btn-primary btn-sm" id="sync-run" ${!bank.connected ? 'disabled' : ''}>
      ${icon('sync', 15)} Синхронизировать
    </button>
    <button class="btn btn-soft btn-sm" id="sync-fail" ${!bank.connected ? 'disabled' : ''} title="Показать обработку ошибки">Тест ошибки</button>`,
  )}
  <div class="view"><div class="view-inner stagger" style="display:flex;flex-direction:column;gap:var(--sp-4)">

    ${!bank.connected
      ? `<div class="card">${emptyState({
          icon: 'sync',
          title: 'Синхронизация недоступна',
          text: 'Сначала подключите банк — после этого Finora сможет автоматически подтягивать новые операции.',
          action: { label: 'Перейти к подключению', act: 'go-bank' },
        })}</div>`
      : `
    <div class="grid g4">
      <div class="card">
        <span class="stat-label">Последняя синхронизация</span>
        <div style="margin-top:8px;font-weight:600;font-size:14px">${bank.lastSync ? dateTimeAgo(bank.lastSync) : '—'}</div>
        ${bank.lastSync ? `<div class="faint" style="font-size:12px;margin-top:3px">${timeLabel(bank.lastSync)}</div>` : ''}
      </div>
      <div class="card">
        <span class="stat-label">Операций в базе</span>
        <div class="num" style="margin-top:8px;font-weight:600;font-size:14px">${state.txs.length}</div>
        <div class="faint" style="font-size:12px;margin-top:3px">загружено всего: ${bank.totalImported}</div>
      </div>
      <div class="card">
        <span class="stat-label">Статус</span>
        <div class="row" style="gap:8px;margin-top:9px">
          <i class="status-dot ${errors.length && lastLog?.status === 'error' ? 'error' : 'ok'}"></i>
          <span style="font-weight:600;font-size:14px">${lastLog?.status === 'error' ? 'Ошибка последнего запуска' : 'Всё хорошо'}</span>
        </div>
        <div class="faint" style="font-size:12px;margin-top:5px">Т-Банк · демо-источник</div>
      </div>
      <div class="card">
        <span class="stat-label">Авто-синхронизация</span>
        <div class="row-between" style="margin-top:9px">
          <span style="font-size:13.5px">Каждый час</span>
          <button class="switch ${state.settings.autoSync ? 'on' : ''}" id="auto-sync" role="switch" aria-checked="${state.settings.autoSync}"></button>
        </div>
        <div class="faint" style="font-size:12px;margin-top:5px">Этап 2: реальный авто-режим</div>
      </div>
    </div>

    ${busy
      ? `<div class="card">
          <div class="row" style="gap:10px">
            <span class="btn-loading" style="width:18px;height:18px;display:inline-block"></span>
            <b>Синхронизация…</b>
          </div>
          <div class="progress" style="margin-top:12px"><i style="width:64%"></i></div>
        </div>`
      : ''}

    ${errors.length
      ? `<div class="card error-card">
          <div class="error-title">${icon('alert', 16)} Последняя ошибка</div>
          <p style="font-size:13.5px;margin-top:8px">${esc(errors[0].message ?? 'Неизвестная ошибка')}</p>
          <button class="btn btn-soft btn-sm" id="retry-sync" style="margin-top:12px">${icon('sync', 14)} Повторить синхронизацию</button>
        </div>`
      : ''}

    <div class="card">
      <div class="card-head">
        <span class="card-title">Журнал синхронизаций</span>
        ${state.syncLogs.length ? `<span class="faint" style="font-size:12px">${state.syncLogs.length} последних</span>` : ''}
      </div>
      ${state.syncLogs.length
        ? `<div style="overflow-x:auto"><table class="table">
            <thead><tr><th>Дата</th><th>Время</th><th>Новых операций</th><th>Длительность</th><th>Статус</th></tr></thead>
            <tbody>
              ${state.syncLogs.slice(0, 12).map((l) => `
                <tr>
                  <td>${esc(dateTimeAgo(l.date))}</td>
                  <td class="num">${timeLabel(l.date)}</td>
                  <td class="num">${l.added ? `+${l.added}` : '0'}</td>
                  <td class="num">${(l.durationMs / 1000).toFixed(1)} с</td>
                  <td>${l.status === 'ok'
                    ? '<span class="row" style="gap:6px;color:var(--income)"><i class="status-dot ok"></i>успех</span>'
                    : '<span class="row" style="gap:6px;color:var(--expense)"><i class="status-dot error"></i>ошибка</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table></div>`
        : emptyState({
            icon: 'clock',
            title: 'Синхронизаций ещё не было',
            text: 'Нажмите «Синхронизировать» — Finora получит новые операции и запишет результат в журнал.',
          })}
    </div>`}

  </div></div>`;

  const runBtn = container.querySelector('#sync-run') as HTMLButtonElement | null;
  const failBtn = container.querySelector('#sync-fail') as HTMLButtonElement | null;

  async function doSync(simulateError: boolean): Promise<void> {
    if (!runBtn || busy) return;
    busy = true;
    runBtn.disabled = true;
    if (failBtn) failBtn.disabled = true;
    runBtn.classList.add('btn-loading');
    const res = await runSync({ simulateError });
    busy = false;
    if (res.ok) {
      toast('ok', res.added ? `Загружено новых операций: ${res.added}` : 'Операций нет — всё актуально');
    } else {
      toast('error', res.message ?? 'Ошибка синхронизации');
    }
    runBtn.classList.remove('btn-loading');
    renderSync(container);
  }

  runBtn?.addEventListener('click', () => doSync(false));
  failBtn?.addEventListener('click', () => doSync(true));
  container.querySelector('#retry-sync')?.addEventListener('click', () => doSync(false));

  (container.querySelector('#auto-sync') as HTMLElement)?.addEventListener('click', (e) => {
    const sw = e.currentTarget as HTMLElement;
    const on = !sw.classList.contains('on');
    sw.classList.toggle('on', on);
    mutate((s) => ({ settings: { ...s.settings, autoSync: on } }));
  });

  container.querySelectorAll('[data-act="go-bank"]').forEach((el) =>
    el.addEventListener('click', () => import('../shell').then((m) => m.navigate('bank'))),
  );
}
