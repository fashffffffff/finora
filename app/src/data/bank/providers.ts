/* ============================================================
   Finora — банковские провайдеры.

   BankProvider — контракт, одинаковый для всех банков:
     fetchHistory()  — первая полная выгрузка,
     fetchUpdates()  — докачка после последней синхронизации.

   Сейчас активен MockBankProvider (демонстрационные данные).
   TBankProvider — заготовка под реальную интеграцию: контракт
   уже совпадает, экраны менять не придётся (см. RESEARCH_TBANK.md).
   ============================================================ */

import type { BankProvider, RawOperation } from '../../domain/types';
import { sleep } from '../../core/utils';
import { generateHistory, generateUpdates } from '../generator';

/** Демонстрационный провайдер: данные генерируются локально */
export class MockBankProvider implements BankProvider {
  readonly bankId = 'tbank' as const;
  readonly title = 'Т-Банк (демо)';

  async fetchHistory(): Promise<RawOperation[]> {
    await sleep(900); // имитация сетевой задержки
    return generateHistory();
  }

  async fetchUpdates(after: string): Promise<RawOperation[]> {
    await sleep(1100);
    return generateUpdates(after, Date.now() % 100000);
  }
}

/**
 * Реальный Т-Банк. Способы получения операций исследованы
 * в RESEARCH_TBANK.md; выбранное решение будет реализовано
 * на стороне Rust-ядра (src-tauri) и вызвано отсюда.
 */
export class TBankProvider implements BankProvider {
  readonly bankId = 'tbank' as const;
  readonly title = 'Т-Банк';

  async fetchHistory(): Promise<RawOperation[]> {
    // Этап 2: вызов в Rust-ядро (tauri::command) за реальной выпиской.
    throw new Error('TBankProvider: реальная интеграция на этапе 2 (см. RESEARCH_TBANK.md)');
  }

  async fetchUpdates(_after: string): Promise<RawOperation[]> {
    throw new Error('TBankProvider: реальная интеграция на этапе 2 (см. RESEARCH_TBANK.md)');
  }
}

/** Активный провайдер данных. Переключение — в одном месте. */
export const activeProvider: BankProvider = new MockBankProvider();
