/* ============================================================
   Finora — экспорт данных (CSV для таблиц, JSON — бэкап)

   Два режима:
   • нативное приложение (Tauri) — файл пишется в «Загрузки»
     и Finder сразу показывает его;
   • браузер — обычное скачивание, файл в «Загрузках».
   ============================================================ */

import type { Transaction } from '../domain/types';
import { state } from '../state/app';
import { catById } from '../data/categories';
import { download, toCSV } from './utils';
import { toast } from '../ui/common';

/** Запущено ли как нативное приложение Tauri */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Нативный путь: сохранить в Downloads и открыть Finder. Возвращает true при успехе */
async function nativeExport(name: string, data: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await invoke<string>('export_file', { name, data });
    await invoke('reveal_in_finder', { path });
    return true;
  } catch (e) {
    console.error('нативный экспорт не удался', e);
    return false;
  }
}

export function exportCSV(txs: Transaction[]): void {
  if (!txs.length) {
    toast('warn', 'Нет операций для экспорта');
    return;
  }
  const rows: (string | number)[][] = [
    ['Дата', 'Время', 'Название', 'Описание', 'Категория', 'Тип', 'Направление', 'Сумма ₽', 'Счёт', 'Статус', 'Комментарий'],
    ...txs.map((t) => {
      const c = catById(state.categories, t.category);
      return [
        t.date.slice(0, 10),
        t.date.slice(11, 16),
        t.merchant,
        t.description,
        c.name,
        t.type === 'income' ? 'доход' : t.type === 'expense' ? 'расход' : 'перевод',
        t.direction === 'in' ? 'приход' : 'расход',
        (t.direction === 'in' ? t.amount : -t.amount).toFixed(2),
        t.account,
        t.status === 'ok' ? 'выполнено' : 'в обработке',
        t.comment ?? '',
      ];
    }),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `finora-operacii-${stamp}.csv`;
  const csv = toCSV(rows);

  nativeExport(name, csv).then((native) => {
    if (native) {
      toast('ok', 'CSV сохранён в «Загрузках» — Finder открыт');
    } else {
      download(name, csv, 'text/csv;charset=utf-8');
      toast('ok', `CSV сохранён: ${txs.length} операций (в «Загрузках»)`);
    }
  });
}

export function exportJSON(): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `finora-backup-${stamp}.json`;
  const json = JSON.stringify({ app: 'Finora', version: state.version, exportedAt: new Date().toISOString(), data: state }, null, 2);

  nativeExport(name, json).then((native) => {
    if (native) {
      toast('ok', 'JSON-копия в «Загрузках» — Finder открыт');
    } else {
      download(name, json, 'application/json');
      toast('ok', 'Резервная копия JSON сохранена (в «Загрузках»)');
    }
  });
}
