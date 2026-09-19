/* ============================================================
   Finora — состояние приложения и хранилище.

   Всё живёт локально (localStorage — в прототипе, локальная
   БД в Rust-ядре — на этапе 2). UI подписывается на изменения
   через subscribe() и перерисовывается.
   ============================================================ */

import type {
  AppState, AppearanceSettings, Category, Goal, Transaction,
} from '../domain/types';
import { BASE_CATEGORIES } from '../data/categories';
import { balance } from '../domain/analytics';

const KEY = 'finora.state.v1';

export function defaultAppearance(): AppearanceSettings {
  return { preset: 'ingot', tone: 0, radius: 1, density: 'cozy' };
}

/** Пресеты, существующие в текущей версии (для миграции старых сохранений) */
const KNOWN_PRESETS = ['ingot', 'midnight', 'taiga', 'paper'];

function defaultState(): AppState {
  return {
    version: 1,
    txs: [],
    categories: [...BASE_CATEGORIES],
    goals: [
      {
        id: 'g_laptop',
        title: 'Ноутбук для учёбы',
        icon: 'laptop',
        target: 180000,
        saved: 64300,
        deadline: '2026-12-31',
        note: 'Апгрейд к третьему курсу',
        createdAt: '2026-06-02T12:00:00',
      },
      {
        id: 'g_trip',
        title: 'Поездка в Грузию',
        icon: 'travel',
        target: 120000,
        saved: 21750,
        deadline: '2027-05-01',
        createdAt: '2026-08-14T10:00:00',
      },
    ],
    bank: { connected: false, totalImported: 0 },
    syncLogs: [],
    appearance: defaultAppearance(),
    customPresets: [],
    appearanceHistory: [],
    settings: { profileName: 'Динар', autoSync: true, demoMode: true, onboarded: false },
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return defaultState();
    // пресеты могли смениться между версиями (графит → слиток)
    if (!KNOWN_PRESETS.includes(parsed.appearance?.preset ?? '')) {
      parsed.appearance = { ...defaultAppearance(), preset: 'ingot' };
    }
    // базовые категории могли обновиться между версиями
    const customCats = parsed.categories?.filter((c) => c.custom) ?? [];
    return { ...defaultState(), ...parsed, categories: [...BASE_CATEGORIES, ...customCats] };
  } catch {
    return defaultState();
  }
}

export const state: AppState = load();

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  listeners.forEach((fn) => fn());
}

/** Изменить состояние, сохранить и оповестить подписчиков */
export function mutate(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Finora: не удалось сохранить состояние', e);
    }
  }, 120);
  emit();
}

export function resetAll(): void {
  localStorage.removeItem(KEY);
  location.reload();
}

/* ---------- Хелперы над данными ---------- */

export const allTxs = (): Transaction[] => state.txs;

export const currentBalance = (): number => balance(state.txs);

export const pendingReview = (): Transaction[] =>
  state.txs.filter((t) => t.needsReview).sort((a, b) => (a.date < b.date ? 1 : -1));

export function updateTransaction(id: string, patch: Partial<Transaction>): void {
  mutate((s) => ({
    txs: s.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export function addCategory(cat: Category): void {
  mutate((s) => ({ categories: [...s.categories, cat] }));
}

export function renameCategory(id: string, name: string): void {
  mutate((s) => ({
    categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    txs: s.txs.map((t) => (t.category === id ? { ...t, category: id } : t)),
  }));
}

export function saveGoal(goal: Goal): void {
  mutate((s) => ({
    goals: s.goals.some((g) => g.id === goal.id)
      ? s.goals.map((g) => (g.id === goal.id ? goal : g))
      : [...s.goals, goal],
  }));
}

export function deleteGoal(id: string): void {
  mutate((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
}
