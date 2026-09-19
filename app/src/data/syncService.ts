/* ============================================================
   Finora — сервис синхронизации с банком.

   Оркестрирует конвейер:
     BankProvider → Normalizer → Classifier → Хранилище
   UI получает только статусы и результат. Реальный банк
   подключается заменой activeProvider — экраны не меняются.
   ============================================================ */

import { mutate, state } from '../state/app';
import { classifyAll } from '../domain/classifier';
import { normalizeAll } from '../domain/normalizer';
import { activeProvider } from './bank/providers';
import { uid } from '../core/utils';
import type { SyncLogEntry } from '../domain/types';

export type SyncPhase = 'idle' | 'connecting' | 'auth' | 'fetching' | 'classifying' | 'done' | 'error';

export const CONNECT_STEPS: { phase: SyncPhase; title: string }[] = [
  { phase: 'connecting', title: 'Соединение с банком' },
  { phase: 'auth', title: 'Проверка доступа к счёту' },
  { phase: 'fetching', title: 'Загрузка истории операций' },
  { phase: 'classifying', title: 'Классификация операций' },
  { phase: 'done', title: 'Готово' },
];

/** Подключение банка: показательная последовательность + первая выгрузка */
export async function connectBank(report: (phase: SyncPhase) => void): Promise<void> {
  for (const step of CONNECT_STEPS) {
    report(step.phase);
    if (step.phase === 'fetching') {
      await importHistory();
    } else if (step.phase === 'classifying') {
      await new Promise((r) => setTimeout(r, 700));
    } else {
      await new Promise((r) => setTimeout(r, 850));
    }
  }
  mutate((s) => ({
    bank: {
      connected: true,
      connectedAt: new Date().toISOString(),
      maskedNumber: '•• 4521',
      lastSync: new Date().toISOString(),
      totalImported: s.txs.length,
    },
  }));
}

async function importHistory(): Promise<void> {
  const raw = await activeProvider.fetchHistory();
  const txs = await classifyAll(normalizeAll(raw));
  mutate((s) => ({ txs }));
}

export interface SyncResult { added: number; ok: boolean; message?: string }

/** Разовая синхронизация: подтягивает новые операции */
export async function runSync(opts: { simulateError?: boolean } = {}): Promise<SyncResult> {
  const t0 = performance.now();
  try {
    await new Promise((r) => setTimeout(r, 900));
    if (opts.simulateError) {
      throw new Error('Не удалось получить данные банка: сеанс истёк. Подключение не пострадало — повторите синхронизацию.');
    }
    const after = state.bank.lastSync ?? new Date(2025, 8, 1).toISOString();
    const raw = await activeProvider.fetchUpdates(after);
    const fresh = await classifyAll(normalizeAll(raw));
    const known = new Set(state.txs.map((t) => t.id));
    const added = fresh.filter((t) => !known.has(t.id));
    const durationMs = Math.round(performance.now() - t0);
    const log: SyncLogEntry = {
      id: uid('log'), date: new Date().toISOString(), added: added.length, status: 'ok', durationMs,
    };

    mutate((s) => ({
      txs: [...added, ...s.txs],
      bank: { ...s.bank, lastSync: new Date().toISOString(), totalImported: s.txs.length + added.length },
      syncLogs: [log, ...s.syncLogs].slice(0, 40),
    }));
    return { added: added.length, ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Неизвестная ошибка';
    const durationMs = Math.round(performance.now() - t0);
    const log: SyncLogEntry = {
      id: uid('log'), date: new Date().toISOString(), added: 0, status: 'error', durationMs, message,
    };
    mutate((s) => ({
      syncLogs: [log, ...s.syncLogs].slice(0, 40),
    }));
    return { added: 0, ok: false, message };
  }
}
