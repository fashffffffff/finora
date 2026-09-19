/* ============================================================
   Finora — плавающий чат с AI-советником.

   Живёт поверх всех экранов (монтируется в body, а не в роутер),
   поэтому открыт при переходах по вкладкам. Окно можно таскать
   за шапку, тянуть за уголок в левом нижнем краю, сворачивать
   и закрывать. Ответы — локальная модель (этап 3), а без неё —
   правила (domain/advisor.ts) с честной пометкой перед ответом.
   ============================================================ */

import { state } from '../state/app';
import { advisorAnswer, AI_MODEL_LABEL, type AdvisorHistory } from '../domain/advisor';
import { aiStatus, aiAvailable } from '../domain/aiEngine';
import { icon } from '../core/icons';
import { esc, timeLabel } from '../core/utils';

interface ChatMessage { role: 'user' | 'ai'; text: string; at: string; note?: string }

const W_DEFAULT = 384;
const H_DEFAULT = 500;
const W_MIN = 300;
const W_MAX = 640;
const H_MIN = 320;
const EDGE = 8; // отступ от краёв окна при перетаскивании

let msgs: ChatMessage[] = [];
let busy = false;
let chatOpen = false;
let pos: { x: number; y: number } | null = null;
let size = { w: W_DEFAULT, h: H_DEFAULT };

/** Стриминг: текущий частичный ответ и статус («Прогреваю модель…») */
let streamText: string | null = null;
let streamStatus: string | null = null;

/** Статус движка для шапки: null — ещё проверяем, false — модели нет */
let modelReady: boolean | null = null;

let fab: HTMLElement | null = null;
let win: HTMLElement | null = null;
let msgsEl: HTMLElement | null = null;
let inputEl: HTMLTextAreaElement | null = null;
let sendBtn: HTMLButtonElement | null = null;

const nowTime = (): string => timeLabel(new Date().toISOString());

/* ---------- Мини-markdown ---------- */

/** Разметка ответов модели: жирный, курсив, `код`, списки, переносы строк.
 *  Сначала экранируем HTML, потом размечаем — опасный ввод не пролезет. */
function mdLite(src: string): string {
  const inline = (s: string): string => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«"])_([^_\n]+)_(?=[\s).,!?;:»"]|$)/g, '$1<em>$2</em>');

  const out: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const flushList = (): void => {
    if (!list) return;
    out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-•]\s+(.*)$/);
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ul) {
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(inline(ul[1]));
    } else if (ol) {
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(inline(ol[2]));
    } else {
      flushList();
      if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  }
  flushList();
  return out.join('');
}

/* ---------- Рендер сообщений ---------- */

function statusLabel(loraReady = false): string {
  if (modelReady === null) return aiAvailable() ? 'локальный · проверяю модель…' : 'локальный · правила';
  return modelReady
    ? `локальная модель · ${AI_MODEL_LABEL}${loraReady ? ' · Finora' : ''}`
    : 'локальный · правила';
}

function renderMessages(): void {
  if (!msgsEl) return;
  const parts: string[] = [];

  if (msgs.length === 0) {
    const intro = modelReady
      ? 'Привет! Я локальная модель Finora — работаю прямо на этом Mac, без интернета. Спросите о чём угодно: от баланса до «сколько я трачу на доставку еды».'
      : 'Привет! Я локальный помощник Finora. Отвечаю по вашим данным простыми правилами — ничего не уходит в облако. Свободный разговор появится после скачивания модели (Настройки → «AI-модель»).';
    parts.push(`
      <div class="chat-welcome">
        <span class="chat-ava chat-ava-lg">${icon('sparkle', 22)}</span>
        <p>${intro}</p>
        <div class="chat-chips">
          <button class="chip" data-say="Куда уходят деньги?">Куда уходят деньги?</button>
          <button class="chip" data-say="Как дела с целями?">Как дела с целями?</button>
          <button class="chip" data-say="Совет: как сэкономить">Совет: как сэкономить</button>
          <button class="chip" data-say="Трачу 10 тысяч в неделю на подарки девушке, это нормально?">Трачу на подарки 10 тысяч в неделю…</button>
        </div>
      </div>`);
  }

  for (const m of msgs) {
    if (m.role === 'user') {
      parts.push(`<div class="msg msg-user" title="${esc(m.at)}">${esc(m.text)}</div>`);
    } else {
      if (m.note) {
        parts.push(`<div class="msg-note">${icon('info', 12)}<span>${esc(m.note)}</span></div>`);
      }
      parts.push(`
        <div class="msg-row">
          <span class="chat-ava chat-ava-sm">${icon('sparkle', 12)}</span>
          <div class="msg msg-ai msg-md" title="${esc(m.at)}">${mdLite(m.text)}</div>
        </div>`);
    }
  }

  msgsEl.innerHTML = parts.join('');
  msgsEl.scrollTop = msgsEl.scrollHeight;
  // строка стрима не входит в innerHTML-перерисовку — восстанавливаем её
  if (busy) renderStream();
}

/* ---------- Стриминг ответа ---------- */

let streamRow: HTMLElement | null = null;
let streamBubble: HTMLElement | null = null;

function removeStreamRow(): void {
  streamRow?.remove();
  streamRow = null;
  streamBubble = null;
}

/** Пользователь у нижнего края — прилипаем к скроллу; листает историю — не мешаем */
function nearBottom(): boolean {
  if (!msgsEl) return true;
  return msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
}

/** Дом-узел ответа создаётся один раз и дальше дополняется текстом.
 *  Полная перерисовка списка на каждом токене — это пересборка всего
 *  DOM окна, из-за неё чат «мигал» при стриминге. */
function ensureStreamRow(typing: boolean): HTMLElement {
  if (streamRow && streamBubble && streamRow.isConnected) return streamBubble;
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `<span class="chat-ava chat-ava-sm">${icon('sparkle', 12)}</span>`;
  const bubble = document.createElement('div');
  bubble.className = typing ? 'msg msg-ai msg-typing' : 'msg msg-ai msg-md';
  bubble.setAttribute('aria-label', 'Отвечает');
  if (typing) bubble.innerHTML = '<i></i><i></i><i></i><span class="chat-status-line"></span>';
  row.append(bubble);
  msgsEl!.append(row);
  streamRow = row;
  streamBubble = bubble;
  return bubble;
}

/** Обновляет только строку текущего ответа; вызывается раз в 60 мс */
function renderStream(): void {
  if (!msgsEl || !busy) return;
  const stick = nearBottom();
  if (streamText === null) {
    const bubble = ensureStreamRow(true);
    const line = bubble.querySelector<HTMLElement>('.chat-status-line');
    if (line && streamStatus) line.textContent = streamStatus;
  } else {
    const bubble = ensureStreamRow(false);
    const html = mdLite(streamText);
    if (bubble.innerHTML !== html) bubble.innerHTML = html;
  }
  if (stick) msgsEl.scrollTop = msgsEl.scrollHeight;
}

/** Перерисовка стрима не чаще, чем раз в 60 мс */
let renderTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRender(): void {
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    renderStream();
  }, 60);
}

/* ---------- Отправка ---------- */

function send(textRaw: string): void {
  const text = textRaw.trim();
  if (!text || busy || !inputEl) return;
  msgs.push({ role: 'user', text, at: nowTime() });
  inputEl.value = '';
  autogrow();
  busy = true;
  streamText = null;
  streamStatus = null;
  updateSend();
  renderMessages();
  renderStream(); // typing-индикатор поверх списка

  const history: AdvisorHistory[] = msgs
    .slice(0, -1)
    .filter((m) => m.text)
    .map((m) => ({ role: m.role, text: m.text }));

  void advisorAnswer(text, state, history, (acc) => {
    streamText = acc;
    scheduleRender();
  }, (message) => {
    streamStatus = message;
    scheduleRender();
  })
    .then((answer) => {
      msgs.push({ role: 'ai', text: answer.text, at: nowTime(), note: answer.note });
    })
    .catch(() => {
      msgs.push({
        role: 'ai',
        text: 'Что-то пошло не так при разборе данных. Попробуйте спросить иначе.',
        at: nowTime(),
      });
    })
    .finally(() => {
      busy = false;
      streamText = null;
      streamStatus = null;
      removeStreamRow();
      updateSend();
      renderMessages();
    });
}

function updateSend(): void {
  if (sendBtn) sendBtn.disabled = busy || inputEl?.value.trim() === '';
}

function autogrow(): void {
  if (!inputEl) return;
  inputEl.style.height = 'auto';
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 110)}px`;
}

/* ---------- Статус модели ---------- */

/** Обновить статус в шапке и welcome-текст (после проверки движка) */
async function refreshStatus(): Promise<void> {
  const st = await aiStatus();
  modelReady = st?.modelReady ?? false;
  const loraReady = st?.loraReady ?? false;
  const el = win?.querySelector<HTMLElement>('.chat-status');
  if (el) {
    const dotClass = modelReady ? 'ok' : 'pending';
    el.innerHTML = `<i class="status-dot ${dotClass}"></i>${esc(statusLabel(loraReady))}`;
  }
  if (msgs.length === 0) renderMessages();
}

/* ---------- Позиция и размер ---------- */

function applyFrame(): void {
  if (!win) return;
  if (!pos) {
    pos = {
      x: Math.max(EDGE, window.innerWidth - size.w - 24),
      y: Math.max(EDGE, window.innerHeight - size.h - 24),
    };
  }
  win.style.left = `${pos.x}px`;
  win.style.top = `${pos.y}px`;
  win.style.width = `${size.w}px`;
  win.style.height = `${size.h}px`;
}

function clampFrame(): void {
  if (!pos) return;
  const maxX = Math.max(EDGE, window.innerWidth - size.w - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - size.h - EDGE);
  pos = {
    x: Math.min(Math.max(pos.x, EDGE), window.innerWidth - size.w <= EDGE ? EDGE : maxX),
    y: Math.min(Math.max(pos.y, EDGE), window.innerHeight - size.h <= EDGE ? EDGE : maxY),
  };
  applyFrame();
}

/* ---------- Перетаскивание и ресайз ---------- */

function startDrag(e: PointerEvent): void {
  if (!win || (e.target as HTMLElement).closest('button')) return;
  e.preventDefault();
  const rect = win.getBoundingClientRect();
  pos = { x: rect.left, y: rect.top };
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;
  const head = e.currentTarget as HTMLElement;
  head.setPointerCapture(e.pointerId);
  win.classList.add('is-dragging');

  const onMove = (ev: PointerEvent): void => {
    pos = { x: ev.clientX - offX, y: ev.clientY - offY };
    applyFrame();
    clampFrame();
  };
  const onUp = (): void => {
    win?.classList.remove('is-dragging');
    head.removeEventListener('pointermove', onMove);
    head.removeEventListener('pointerup', onUp);
  };
  head.addEventListener('pointermove', onMove);
  head.addEventListener('pointerup', onUp);
}

function startResize(e: PointerEvent): void {
  if (!win) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = win.getBoundingClientRect();
  pos = { x: rect.left, y: rect.top };
  const right = rect.right;
  const grip = e.currentTarget as HTMLElement;
  grip.setPointerCapture(e.pointerId);

  const onMove = (ev: PointerEvent): void => {
    size = {
      w: Math.min(Math.max(right - ev.clientX, W_MIN), Math.min(W_MAX, window.innerWidth - 2 * EDGE)),
      h: Math.min(Math.max(ev.clientY - rect.top, H_MIN), window.innerHeight - 2 * EDGE),
    };
    // правый и верхний края закреплены — растём влево и вниз
    pos = { x: right - size.w, y: rect.top };
    applyFrame();
    clampFrame();
  };
  const onUp = (): void => {
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
  };
  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onUp);
}

/* ---------- Открыть / закрыть / свернуть ---------- */

/** Открыть чат извне (кнопка в сайдбаре, FAB) */
export function openChat(): void {
  setOpen(true);
  setMinimized(false);
}

function setOpen(v: boolean): void {
  chatOpen = v;
  if (!win || !fab) return;
  win.hidden = !v;
  fab.hidden = v;
  if (v) {
    applyFrame();
    renderMessages();
    refreshStatus();
    inputEl?.focus();
  }
}

function setMinimized(v: boolean): void {
  win?.classList.toggle('is-min', v);
}

/* ---------- Монтаж ---------- */

export function mountChat(): void {
  fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.title = 'Открыть чат с Finora AI';
  fab.innerHTML = `<span class="chat-fab-ico">${icon('sparkle', 17)}</span><span>AI-советник</span>`;
  fab.addEventListener('click', () => setOpen(true));

  win = document.createElement('section');
  win.className = 'chat-win';
  win.hidden = true;
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Чат с Finora AI');
  win.innerHTML = `
    <header class="chat-head" title="Перетащите, чтобы переместить">
      <span class="chat-ava">${icon('sparkle', 16)}</span>
      <div class="grow" style="min-width:0">
        <div class="chat-title">Finora AI</div>
        <div class="chat-status"><i class="status-dot ok"></i>${esc(statusLabel())}</div>
      </div>
      <button class="chat-btn" data-chat="min" title="Свернуть">${icon('chevronDown', 17)}</button>
      <button class="chat-btn" data-chat="close" title="Закрыть">${icon('x', 17)}</button>
    </header>
    <div class="chat-body" aria-live="polite"></div>
    <footer class="chat-foot">
      <textarea class="chat-input" rows="1" placeholder="Спросите о чём угодно…"></textarea>
      <button class="chat-send" title="Отправить (Enter)" disabled>${icon('send', 16)}</button>
    </footer>
    <i class="chat-grip" title="Потяните, чтобы изменить размер"></i>`;

  document.body.append(fab, win);

  const body = win.querySelector<HTMLElement>('.chat-body');
  const input = win.querySelector<HTMLTextAreaElement>('.chat-input');
  const sendB = win.querySelector<HTMLButtonElement>('.chat-send');
  if (!body || !input || !sendB) return;
  msgsEl = body;
  inputEl = input;
  sendBtn = sendB;

  win.querySelector<HTMLElement>('.chat-head')?.addEventListener('pointerdown', startDrag as EventListener);
  win.querySelector<HTMLElement>('.chat-grip')?.addEventListener('pointerdown', startResize as EventListener);
  win.querySelector<HTMLElement>('.chat-head')?.addEventListener('dblclick', () =>
    setMinimized(!win?.classList.contains('is-min')),
  );

  win.querySelectorAll('[data-chat]').forEach((b) =>
    b.addEventListener('click', () => {
      const act = (b as HTMLElement).dataset.chat;
      if (act === 'close') setOpen(false);
      if (act === 'min') setMinimized(!win?.classList.contains('is-min'));
    }),
  );

  msgsEl.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('[data-say]') as HTMLElement | null;
    if (chip) send(chip.dataset.say ?? '');
  });

  inputEl.addEventListener('input', () => { autogrow(); updateSend(); });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(inputEl?.value ?? '');
    }
  });
  sendBtn.addEventListener('click', () => send(inputEl?.value ?? ''));

  window.addEventListener('resize', () => { if (chatOpen) clampFrame(); });
}
