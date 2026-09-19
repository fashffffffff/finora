/* ============================================================
   Finora — набор иконок. Единый стиль: штрих 1.6, круглые
   окончания, сетка 24×24. Все иконки нарисованы вручную.
   ============================================================ */

const P: Record<string, string> = {
  // Навигация
  dashboard: '<path d="M5.5 11 12 5l6.5 6"/><path d="M7 9.7V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.7"/><path d="M10 20v-5.5h4V20"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.4"/>',
  review: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.2a2.4 2.4 0 1 1 3.3 2.2c-.66.28-.95.77-.95 1.5v.4"/><path d="M12 16.6h.01" stroke-width="2.4"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9V3z"/><path d="M14.6 3.6A9 9 0 0 1 20.4 9.4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/><path d="M12 12h.01" stroke-width="2.6"/>',
  bank: '<path d="M4 10 12 4l8 6"/><path d="M5.2 10v8M9.7 10v8M14.3 10v8M18.8 10v8"/><path d="M3.5 20.5h17"/>',
  sync: '<path d="M20.5 7A8.6 8.6 0 0 0 5 6.5L3.5 8"/><path d="M3.5 3.5V8H8"/><path d="M3.5 17a8.6 8.6 0 0 0 15.5.5L20.5 16"/><path d="M20.5 20.5V16H16"/>',
  settings: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="1.9"/><circle cx="15.5" cy="12" r="1.9"/><circle cx="7.5" cy="17" r="1.9"/>',
  // Действия
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.4-3.4"/>',
  filter: '<path d="M4 5h16l-6.3 7.4V19l-3.4-1.9v-4.7z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15.5" rx="2.5"/><path d="M4 10.2h16M8.2 3v4M15.8 3v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronDown: '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
  chevronLeft: '<path d="M14 6.5 8.5 12l5.5 5.5"/>',
  chevronRight: '<path d="M10 6.5 15.5 12 10 17.5"/>',
  arrowUpRight: '<path d="M7 17 17 7"/><path d="M8.5 7H17v8.5"/>',
  arrowDownLeft: '<path d="M17 7 7 17"/><path d="M15.5 17H7V8.5"/>',
  arrowRight: '<path d="M4 12h15"/><path d="M13.5 6 19.5 12l-6 6"/>',
  download: '<path d="M12 4v10.5"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  upload: '<path d="M12 15V4.5"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M5 19.5h14"/>',
  edit: '<path d="M4.5 19.5l.9-3.8L16.4 4.7a2 2 0 0 1 2.9 2.9L8.3 18.6l-3.8.9z"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.6 7l.9 12.6a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3L17.4 7"/><path d="M10 11v5.5M14 11v5.5"/>',
  // Объекты
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H6a2 2 0 0 0 0 4h14v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V6"/><path d="M17 13.5h4v3h-4a1.5 1.5 0 0 1 0-3z"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15.2h4.5"/>',
  shield: '<path d="M12 3.2 19 6v5.3c0 4.5-2.9 7.9-7 9.5-4.1-1.6-7-5-7-9.5V6z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.4" y="10.4" width="3.2" height="3.2"/><path d="M9.5 2.5V5M14.5 2.5V5M9.5 19v2.5M14.5 19v2.5M2.5 9.5H5M2.5 14.5H5M19 9.5h2.5M19 14.5h2.5"/>',
  moon: '<path d="M20 13.6A8.2 8.2 0 1 1 10.4 4a6.4 6.4 0 0 0 9.6 9.6z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  user: '<circle cx="12" cy="8" r="3.7"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  tagIcon: '<path d="M4.5 4.5H11l8.5 8.5-6.5 6.5-8.5-8.5z"/><path d="M8.3 8.3h.01" stroke-width="2.4"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.8h.01" stroke-width="2.2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2V16M12 8.2h.01" stroke-width="2.2"/>',
  file: '<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4.5"/>',
  link: '<path d="M10 14.2a4.2 4.2 0 0 1 0-6l2.3-2.3a4.2 4.2 0 0 1 6 6L17 13.2"/><path d="M14 9.8a4.2 4.2 0 0 1 0 6l-2.3 2.3a4.2 4.2 0 0 1-6-6L7 10.8"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M19 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5"/>',
  plusCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  // Категории
  cart: '<circle cx="6.2" cy="19.6" r="1.5"/><circle cx="17.3" cy="19.6" r="1.5"/><path d="M3 4.5h2.2l2.4 10.6h9.9l2.4-7.6H6.1"/>',
  cup: '<path d="M5 8.5h11v5.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.8a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.3 3.5c0 1-1 1.1-1 2.1s1 1.1 1 2.1M12.3 3.5c0 1-1 1.1-1 2.1s1 1.1 1 2.1"/>',
  transport: '<rect x="5.5" y="3.5" width="13" height="13.5" rx="3"/><path d="M5.5 11.5h13"/><path d="M8.8 7.2h2.2M13 7.2h2.2"/><path d="M7.5 20.5 9 17h6l1.5 3.5"/>',
  home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6.2 9.3V20h11.6V9.3"/><path d="M10.2 20v-5h3.6v5"/>',
  heart: '<path d="M12 20s-7.4-4.6-9.2-8.9A5.2 5.2 0 0 1 12 6.7a5.2 5.2 0 0 1 9.2 4.4C19.4 15.4 12 20 12 20z"/>',
  tv: '<rect x="3.5" y="5" width="17" height="11.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>',
  repeat: '<path d="m17 2.5 4 4-4 4"/><path d="M3.5 11.5v-1a4 4 0 0 1 4-4H21"/><path d="m7 21.5-4-4 4-4"/><path d="M20.5 12.5v1a4 4 0 0 1-4 4H3"/>',
  shirt: '<path d="M9 4.5 12 6l3-1.5 4.5 2.7-2 3.2-1.7-1V20H8.2V9.4l-1.7 1-2-3.2z"/>',
  laptop: '<rect x="4.5" y="5" width="15" height="10" rx="1.8"/><path d="M2.8 18.5h18.4"/>',
  education: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 12v4c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4"/><path d="M21.5 9.5v5.2"/>',
  travel: '<rect x="5" y="7.5" width="14" height="12.5" rx="2.5"/><path d="M9 7.5V4.8h6v2.7"/><path d="M9.5 11.5v4.5M14.5 11.5v4.5"/>',
  gift: '<path d="M4.5 8h15v3h-15z"/><path d="M5.5 11v9h13v-9"/><path d="M12 8v12"/><path d="M12 8c-4.2 0-5.6-1.3-5.6-3.1C6.4 3.4 8 3 8.9 3.9 9.9 4.9 12 8 12 8zm0 0c4.2 0 5.6-1.3 5.6-3.1 0-1.5-1.6-1.9-2.5-1C13.1 4.9 12 8 12 8z"/>',
  swap: '<path d="M7 4 3.5 7.5 7 11"/><path d="M3.5 7.5h13"/><path d="M17 13l3.5 3.5L17 20"/><path d="M20.5 16.5h-13"/>',
  box: '<path d="M12 3.5 20 7.7v8.6L12 20.5 4 16.3V7.7z"/><path d="M4 7.7l8 4.2 8-4.2M12 11.9v8.6"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.2h6v2.3"/><path d="M3.5 13h17"/>',
  percent: '<circle cx="12" cy="12" r="8.5"/><path d="M9.2 14.8l5.6-5.6"/><path d="M9.4 9.4h.01M14.6 14.6h.01" stroke-width="2.4"/>',
  refund: '<path d="M3.5 12a8.5 8.5 0 1 0 8.5-8.5c-2.5 0-4.8 1-6.5 2.7L3.5 8"/><path d="M3.5 3.5V8H8"/>',
  ingots: '<path d="M7.2 4.5h9.6l-1.3 3.6H8.5z"/><path d="M5.4 10.1h13.2l-1.3 3.6H6.7z"/><path d="M3.6 15.7h7.6l-1 3.6H4.6z"/><path d="M12.8 15.7h7.6l-.9 3.6h-7.7z"/>',
  trending: '<path d="M3.5 17 10 10.5l3.5 3.5 7-7"/><path d="M15.5 7H20v4.5"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.2a2.4 2.4 0 1 1 3.3 2.2c-.66.28-.95.77-.95 1.5v.4"/><path d="M12 16.6h.01" stroke-width="2.4"/>',
  // Чат
  chat: '<path d="M4.5 12.1c0-4 3.4-6.9 7.5-6.9s7.5 2.9 7.5 6.9-3.4 6.9-7.5 6.9c-1 0-2-.2-2.8-.5L5.4 20l.8-2.9c-1.1-1.2-1.7-3.1-1.7-5z"/>',
  sparkle: '<path d="M11 4c.5 4 2.6 6.1 6.5 6.5-3.9.4-6 2.5-6.5 6.5-.5-4-2.6-6.1-6.5-6.5C8.4 10.1 10.5 8 11 4z"/><path d="M18.6 14.3c.3 2.3 1.5 3.5 3.7 3.7-2.2.3-3.4 1.5-3.7 3.7-.3-2.2-1.5-3.4-3.7-3.7 2.2-.2 3.4-1.4 3.7-3.7z"/>',
  send: '<path d="M19.5 4.5 11 13.2"/><path d="M19.5 4.5 13.7 19.7l-2.7-5.8-5.8-2.7z"/>',
};

export type IconName = keyof typeof P;

export function icon(name: IconName, size = 18): string {
  const d = P[name] ?? P.box;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

/** Логотип Finora: три залитых золотых слитка в тёмном сквиркле */
export function logoMark(size = 26): string {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--surface-2, #1f1a12)" stroke="currentColor" stroke-width="1.8"/>
    <g fill="currentColor">
      <path d="M8 17.2h6.4l1.3 3.8H6.7z"/>
      <path d="M17.6 17.2h6.4l1.3 3.8H16.3z"/>
      <path d="M12.8 10.4h6.4l1.3 3.8H11.5z"/>
    </g>
  </svg>`;
}

/** Знак Т-Банка: настоящий логотип из public/tbank-logo.png (лежит рядом
 *  с index.html, работает и на file://); пока файла нет — жёлтый квадрат с «Т» */
export function tbankMark(size = 38): string {
  return `<span class="tbank-logo" style="width:${size}px;height:${size}px">
    <img src="./tbank-logo.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"/>
    <span class="tbank-mark" style="display:none;width:${size}px;height:${size}px;font-size:${Math.round(size * 0.52)}px">Т</span>
  </span>`;
}
