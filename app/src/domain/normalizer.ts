/* ============================================================
   Finora — нормализатор.
   Сырая операция банка → единая Transaction приложения.
   Здесь же считаются типы (доход/расход/перевод) и флаг
   «перевод между своими счетами».
   ============================================================ */

import type { RawOperation, Transaction, TxType } from './types';

const INTERNAL_MARKERS = ['накопительн', 'снятие наличных', 'пополнение наличными', 'банкомат т'];
const TRANSFER_MARKERS = ['сбп', 'card2card', 'комиссия'];

function detectInternal(description: string): boolean {
  const d = description.toLowerCase();
  return INTERNAL_MARKERS.some((m) => d.includes(m)) && !d.includes('аренда');
}

function detectTransfer(description: string, merchant: string): boolean {
  const d = `${description} ${merchant}`.toLowerCase();
  return TRANSFER_MARKERS.some((m) => d.includes(m));
}

export function normalize(op: RawOperation): Transaction {
  const amount = Math.abs(op.amount);
  const direction: 'in' | 'out' = op.amount >= 0 ? 'in' : 'out';

  let type: TxType;
  let internal = false;

  if (detectInternal(op.description)) {
    type = 'transfer';
    internal = true;
  } else if (detectTransfer(op.description, op.merchant)) {
    type = 'transfer';
  } else {
    type = direction === 'in' ? 'income' : 'expense';
  }

  return {
    id: op.id,
    date: op.date,
    amount,
    type,
    direction,
    category: 'uncategorized', // назначит классификатор
    merchant: op.merchant,
    description: op.description,
    account: 'Дебетовая карта • 4521',
    mcc: op.mcc,
    status: op.status,
    needsReview: false, // решит классификатор
    internal,
    cashback: op.cashback,
    source: 'tbank',
  };
}

export function normalizeAll(ops: RawOperation[]): Transaction[] {
  return ops.map(normalize);
}
