/* ============================================================
   Finora — доменные типы. Ничего из UI здесь нет.
   ============================================================ */

export type TxType = 'income' | 'expense' | 'transfer';
export type TxStatus = 'ok' | 'pending';

/** Операция после нормализации — единый формат для всего приложения */
export interface Transaction {
  id: string;
  /** ISO: '2026-09-14T18:32:00' */
  date: string;
  /** Всегда положительная; направление задаёт type и direction */
  amount: number;
  type: TxType;
  /** Направление движения денег */
  direction: 'in' | 'out';
  /** id категории из CategoryCatalog */
  category: string;
  /** Короткое имя: «Пятёрочка» */
  merchant: string;
  /** Полная строка из выписки: «Покупка · ПЯТЕРОЧКА 8231 · Москва» */
  description: string;
  account: string;
  mcc?: string;
  status: TxStatus;
  comment?: string;
  /** Нужен разбор пользователем (экран «Разобрать») */
  needsReview: boolean;
  /** Перевод между своими счетами — не участвует в доходах/расходах */
  internal?: boolean;
  cashback?: number;
  source: string;
}

export type CategoryKind = 'expense' | 'income' | 'service';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  /** Пользовательская категория (создана в настройках) */
  custom?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  icon: string;
  target: number;
  saved: number;
  deadline?: string;
  note?: string;
  createdAt: string;
}

export type BankId = 'tbank';

export interface BankState {
  connected: boolean;
  connectedAt?: string;
  maskedNumber?: string;
  lastSync?: string;
  totalImported: number;
}

export interface SyncLogEntry {
  id: string;
  date: string;
  added: number;
  status: 'ok' | 'error';
  durationMs: number;
  message?: string;
}

export type PresetId = 'ingot' | 'midnight' | 'taiga' | 'paper';
export type Density = 'cozy' | 'compact';

/** Пользовательская донастройка цветов поверх пресета */
export interface CustomColors {
  bg?: string;
  surface?: string;
  surface2?: string;
  surface3?: string;
  border?: string;
  text?: string;
  text2?: string;
  accent?: string;
  income?: string;
  expense?: string;
}

export interface AppearanceSettings {
  preset: PresetId;
  /** Пользовательский акцент (hex) поверх пресета */
  accent?: string;
  /** Тонкая настройка произвольных цветов (перекрывает пресет) */
  custom?: CustomColors;
  /** 0/1/2 — глубина фона внутри пресета */
  tone: 0 | 1 | 2;
  radius: number; // множитель 0.6–1.5
  density: Density;
}

export interface CustomPreset {
  id: string;
  name: string;
  appearance: AppearanceSettings;
  createdAt: string;
}

export interface AppearanceSnapshot {
  id: string;
  at: string;
  label: string;
  appearance: AppearanceSettings;
}

export interface Settings {
  profileName: string;
  autoSync: boolean;
  demoMode: boolean;
  onboarded: boolean;
}

export interface AppState {
  version: number;
  txs: Transaction[];
  categories: Category[];
  goals: Goal[];
  bank: BankState;
  syncLogs: SyncLogEntry[];
  appearance: AppearanceSettings;
  customPresets: CustomPreset[];
  appearanceHistory: AppearanceSnapshot[];
  settings: Settings;
}

/** Сырая операция, как её отдаёт банк (формат провайдера) */
export interface RawOperation {
  id: string;
  date: string;
  /** Со знаком: минус — списание */
  amount: number;
  merchant: string;
  description: string;
  mcc?: string;
  status: TxStatus;
  cashback?: number;
}

export interface BankProvider {
  readonly bankId: BankId;
  readonly title: string;
  /** Первая выгрузка за всю историю */
  fetchHistory(): Promise<RawOperation[]>;
  /** Инкрементальная выгрузка после указанной даты */
  fetchUpdates(after: string): Promise<RawOperation[]>;
}

export interface ClassifiedTransaction extends Transaction {
  /** Уверенность классификатора 0..1 — для будущих AI-классификаторов */
  confidence: number;
  classifiedBy: string;
}
