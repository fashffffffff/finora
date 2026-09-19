/* ============================================================
   Finora — оболочка приложения: сайдбар, роутер, тема.
   ============================================================ */

import { pendingReview, state } from './state/app';
import { applyAppearance } from './state/appearance';
import { icon, logoMark } from './core/icons';
import { money } from './core/utils';
import { currentBalance } from './state/app';
import { maybeOnboard } from './ui/onboarding';
import { renderDashboard } from './ui/dashboard';
import { renderTransactions } from './ui/transactions';
import { renderReview } from './ui/review';
import { renderAnalytics } from './ui/analytics';
import { renderGoals } from './ui/goals';
import { renderBank } from './ui/bank';
import { renderSync } from './ui/sync';
import { renderSettings } from './ui/settings';
import { mountChat } from './ui/aiChat';

export type Route =
  | 'dashboard' | 'transactions' | 'review' | 'analytics'
  | 'goals' | 'bank' | 'sync' | 'settings';

let route: Route = 'dashboard';

const NAV_MAIN: { r: Route; t: string; ico: string }[] = [
  { r: 'dashboard', t: 'Главная', ico: 'dashboard' },
  { r: 'transactions', t: 'Операции', ico: 'list' },
  { r: 'review', t: 'Разобрать', ico: 'review' },
  { r: 'analytics', t: 'Аналитика', ico: 'pie' },
  { r: 'goals', t: 'Цели', ico: 'target' },
];

export function renderSidebar(): void {
  const sidebar = document.querySelector('.sidebar') as HTMLElement;
  if (!sidebar) return;
  const review = pendingReview().length;
  const bank = state.bank;

  sidebar.innerHTML = `
    <div class="brand">
      ${logoMark(27)}
      <span class="brand-name">Finora</span>
    </div>
    ${state.settings.demoMode ? `<div class="demo-note" title="Данные в приложении — синтетические, для демонстрации">демо-данные</div>` : ''}

    <button class="nav-item nav-ai" data-chat-open title="Локальный помощник: спросите о своих финансах">
      ${icon('sparkle', 18)}<span>AI-советник</span>
    </button>

    <div class="nav-section">Обзор</div>
    ${NAV_MAIN.map((n) => `
      <button class="nav-item ${route === n.r ? 'active' : ''}" data-r="${n.r}">
        ${icon(n.ico as never, 18)}<span>${n.t}</span>
        ${n.r === 'review' && review ? `<span class="badge ${n.r === route ? '' : 'warn'}">${review}</span>` : ''}
      </button>`).join('')}

    <div class="nav-section">Данные</div>
    <button class="nav-item ${route === 'bank' ? 'active' : ''}" data-r="bank">
      ${icon('bank', 18)}<span>Банк</span>
      <span class="row" style="gap:6px;margin-left:auto">
        <i class="status-dot ${bank.connected ? 'ok' : 'off'}"></i>
      </span>
    </button>
    <button class="nav-item ${route === 'sync' ? 'active' : ''}" data-r="sync">
      ${icon('sync', 18)}<span>Синхронизация</span>
    </button>

    <div class="sidebar-footer">
      <button class="nav-item ${route === 'settings' ? 'active' : ''}" data-r="settings">
        ${icon('settings', 18)}<span>Настройки</span>
      </button>
      <button class="profile-chip" data-r="settings" title="Профиль">
        <span class="avatar">${escInitials(state.settings.profileName)}</span>
        <span class="grow" style="min-width:0">
          <span class="ellipsis" style="display:block;font-weight:600;font-size:13px">${esc(state.settings.profileName)}</span>
          <span class="num faint" style="font-size:11.5px">${money(currentBalance(), false, true)}</span>
        </span>
      </button>
    </div>`;

  sidebar.querySelectorAll('[data-r]').forEach((b) =>
    b.addEventListener('click', () => navigate((b as HTMLElement).dataset.r as Route)),
  );
  sidebar.querySelector('[data-chat-open]')?.addEventListener('click', () => {
    import('./ui/aiChat').then((m) => m.openChat());
  });
}

function escInitials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'F';
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function renderView(): void {
  const main = document.querySelector('#view-host') as HTMLElement;
  if (!main) return;
  const inner = document.createElement('div');
  inner.className = 'screen-enter';
  inner.style.display = 'flex';
  inner.style.flexDirection = 'column';
  inner.style.minHeight = '100%';

  switch (route) {
    case 'dashboard': renderDashboard(inner); break;
    case 'transactions': renderTransactions(inner); break;
    case 'review': renderReview(inner); break;
    case 'analytics': renderAnalytics(inner); break;
    case 'goals': renderGoals(inner); break;
    case 'bank': renderBank(inner); break;
    case 'sync': renderSync(inner); break;
    case 'settings': renderSettings(inner); break;
  }

  main.replaceChildren(inner);
}

export function navigate(r: Route): void {
  route = r;
  renderSidebar();
  renderView();
}

/** Перерисовать текущий экран (после изменения данных) */
export function refresh(): void {
  renderSidebar();
  renderView();
}

function boot(): void {
  const root = document.getElementById('app') as HTMLElement;
  applyAppearance(state.appearance);

  root.innerHTML = `
    <div class="app grain">
      <aside class="sidebar"></aside>
      <main class="main"><div id="view-host" style="flex:1;display:flex;flex-direction:column;min-height:0"></div></main>
    </div>
    <div class="toasts"></div>`;

  renderSidebar();
  renderView();
  mountChat(); // плавающий чат AI — живёт в body, переживает переходы по вкладкам
  maybeOnboard(document.body);

  // данные изменились (смена категории, комментарий) — обновляем бейджи
  import('./state/app').then(({ subscribe }) => {
    let first = true;
    subscribe(() => {
      if (first) { first = false; return; } // первичный emit при старте
      renderSidebar();
    });
  });
}

boot();
