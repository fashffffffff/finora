/* ============================================================
   Finora — внешний вид: применение настроек к документу,
   история изменений и пользовательские пресеты.
   ============================================================ */

import type { AppearanceSettings, AppearanceSnapshot, CustomColors, CustomPreset, PresetId } from '../domain/types';
import { mutate, state } from '../state/app';
import { uid } from '../core/utils';

export interface PaletteInfo { id: PresetId; name: string; swatches: string[]; mode: 'dark' | 'light' }

export const PALETTES: PaletteInfo[] = [
  { id: 'ingot', name: 'Слиток', swatches: ['#12100d', '#1a1713', '#d4a542'], mode: 'dark' },
  { id: 'midnight', name: 'Полночь', swatches: ['#0e1418', '#151d23', '#45c4b0'], mode: 'dark' },
  { id: 'taiga', name: 'Тайга', swatches: ['#0e1512', '#141f1a', '#5fc793'], mode: 'dark' },
  { id: 'paper', name: 'Бумага', swatches: ['#f2f0e9', '#fbfaf6', '#14795a'], mode: 'light' },
];

export const ACCENT_SWATCHES = [
  '#d4a542', '#b98a2e', '#e2c069', '#45c4b0', '#5fc793', '#e2705e', '#c95b7e', '#7186d8', '#b085cb', '#45a6c9',
];

/** Подписи тонкой настройки цветов (акцент настраивается отдельной секцией) */
export const CUSTOM_COLOR_FIELDS: { key: keyof CustomColors; label: string }[] = [
  { key: 'bg', label: 'Фон' },
  { key: 'surface', label: 'Карточки' },
  { key: 'surface2', label: 'Карточки 2' },
  { key: 'surface3', label: 'Карточки 3' },
  { key: 'border', label: 'Границы' },
  { key: 'text', label: 'Текст' },
  { key: 'text2', label: 'Текст вторичный' },
  { key: 'income', label: 'Доходы' },
  { key: 'expense', label: 'Расходы' },
];

const CSS_VAR_OF: Partial<Record<keyof CustomColors, string>> = {
  bg: '--bg',
  surface: '--surface',
  surface2: '--surface-2',
  surface3: '--surface-3',
  border: '--border',
  text: '--text',
  text2: '--text-2',
  income: '--income',
  expense: '--expense',
};

const RADIUS_LABEL: Record<string, string> = {};

export function radiusLabel(r: number): string {
  if (r <= 0.75) return 'Минимальные';
  if (r <= 1.05) return 'Средние';
  if (r <= 1.3) return 'Крупные';
  return 'Максимальные';
}

/** Применяет настройки внешнего вида к <html> */
export function applyAppearance(a: AppearanceSettings): void {
  const root = document.documentElement;
  root.dataset.preset = a.preset;
  root.dataset.tone = String(a.tone);
  root.dataset.density = a.density;
  root.style.setProperty('--rs', String(a.radius));
  root.style.setProperty('--du', a.density === 'cozy' ? '1' : '0.82');
  if (a.accent) {
    root.style.setProperty('--accent-user', a.accent);
    // Текст на акценте: подбираем по яркости
    const lum = luminance(a.accent);
    root.style.setProperty('--accent-ink-user', lum > 0.55 ? '#241a04' : '#f6f2e8');
  } else {
    root.style.removeProperty('--accent-user');
    root.style.removeProperty('--accent-ink-user');
  }
  // тонкая настройка произвольных цветов поверх пресета
  const custom = a.custom ?? {};
  for (const [key, cssVar] of Object.entries(CSS_VAR_OF) as [keyof CustomColors, string][]) {
    const val = custom[key];
    if (val) root.style.setProperty(cssVar, val);
    else root.style.removeProperty(cssVar);
  }
}

function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Изменить настройку с записью в историю (можно откатиться) */
export function setAppearance(patch: Partial<AppearanceSettings>, label: string): void {
  mutate((s) => {
    const next: AppearanceSettings = { ...s.appearance, ...patch };
    const snap: AppearanceSnapshot = {
      id: uid('snap'),
      at: new Date().toISOString(),
      label,
      appearance: { ...s.appearance },
    };
    return {
      appearance: next,
      appearanceHistory: [snap, ...s.appearanceHistory].slice(0, 20),
    };
  });
  applyAppearance(state.appearance);
}

export function restoreSnapshot(id: string): void {
  const snap = state.appearanceHistory.find((s) => s.id === id);
  if (!snap) return;
  mutate({ appearance: { ...snap.appearance } });
  applyAppearance(state.appearance);
}

export function saveCustomPreset(name: string): void {
  const preset: CustomPreset = {
    id: uid('cp'),
    name,
    appearance: { ...state.appearance },
    createdAt: new Date().toISOString(),
  };
  mutate((s) => ({ customPresets: [...s.customPresets, preset] }));
}

export function applyCustomPreset(id: string): void {
  const p = state.customPresets.find((x) => x.id === id);
  if (!p) return;
  setAppearance({ ...p.appearance }, `Пресет «${p.name}»`);
}

export function deleteCustomPreset(id: string): void {
  mutate((s) => ({ customPresets: s.customPresets.filter((p) => p.id !== id) }));
}

/** Вернуться к заводскому пресету */
export function useFactoryPreset(id: PresetId): void {
  setAppearance(
    { preset: id, accent: undefined, custom: undefined, tone: 0, radius: 1, density: 'cozy' },
    `Заводской пресет «${PALETTES.find((p) => p.id === id)?.name ?? id}»`,
  );
}
