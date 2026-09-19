/* ============================================================
   Finora — обёртка над локальной AI-моделью (этап 3).

   Движок живёт в Rust-части нативной оболочки: llama.cpp
   исполняет GGUF прямо на этом Mac. В браузерной сборке
   нативных команд нет — все функции честно возвращают
   «модель недоступна», а чат работает на правилах.

   Сеть используется ровно один раз: чтобы скачать файл
   модели с Hugging Face. Сам диалог всегда локальный.
   ============================================================ */

/** Публичное имя модели — для интерфейса */
export const AI_MODEL_LABEL = 'Qwen3.5-4B';
/** Примерный размер файла модели — для кнопки скачивания */
export const AI_MODEL_SIZE_LABEL = '≈2,7 ГБ';

export interface AiStatus {
  engine: boolean;
  modelReady: boolean;
  modelFile: string;
  modelBytes: number | null;
  downloading: boolean;
  loaded: boolean;
  gpu: boolean;
  /** Дообученный адаптер стиля найден рядом с моделью */
  loraReady: boolean;
}

/** Сообщение для модели: system + история + вопрос */
export interface AiChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DownloadProgress {
  received: number;
  total: number;
}

type AiRustEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string };

type DownloadRustEvent =
  | { type: 'progress'; received: number; total: number }
  | { type: 'done'; path: string }
  | { type: 'error'; message: string };

export const aiAvailable = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/* ---------- Статус ---------- */

let cachedStatus: AiStatus | null = null;
let statusPromise: Promise<AiStatus | null> | null = null;

/** Статус движка. null — нативной оболочки нет (браузер). */
export function aiStatus(force = false): Promise<AiStatus | null> {
  if (!aiAvailable()) return Promise.resolve(null);
  if (!force && statusPromise) return statusPromise;
  statusPromise = (async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      cachedStatus = await invoke<AiStatus>('ai_status');
      return cachedStatus;
    } catch {
      cachedStatus = null;
      return null;
    }
  })();
  return statusPromise;
}

/** Быстрый синхронный признак по последнему опросу статуса */
export function aiModelCached(): boolean {
  return cachedStatus?.modelReady ?? false;
}

export function resetAiStatusCache(): void {
  cachedStatus = null;
  statusPromise = null;
}

/* ---------- Скачивание модели ---------- */

/** Скачать модель; onProgress приходит несколько раз в секунду */
export async function downloadModel(onProgress: (p: DownloadProgress) => void): Promise<void> {
  if (!aiAvailable()) throw new Error('Модель доступна только в нативном приложении');
  const { Channel, invoke } = await import('@tauri-apps/api/core');
  const channel = new Channel<DownloadRustEvent>();
  channel.onmessage = (e) => {
    if (e.type === 'progress') onProgress({ received: e.received, total: e.total });
    if (e.type === 'error') throw new Error(e.message);
  };
  await invoke('ai_download_model', { onProgress: channel });
}

export async function cancelDownload(): Promise<void> {
  if (!aiAvailable()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('ai_cancel_download').catch(() => {});
}

export async function deleteModel(): Promise<void> {
  if (!aiAvailable()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('ai_delete_model');
  resetAiStatusCache();
}

/* ---------- Диалог ---------- */

/**
 * Спросить локальную модель. Текст приходит токен-за-токеном
 * в onToken(накопленный текст). Бросает ошибку — вызывающий
 * код обязан уметь откатиться на правила.
 */
export async function aiGenerate(
  messages: AiChatMsg[],
  onToken: (accumulated: string) => void,
  onStatus?: (message: string) => void,
): Promise<string> {
  if (!aiAvailable()) throw new Error('Модель доступна только в нативном приложении');
  const { Channel, invoke } = await import('@tauri-apps/api/core');
  const channel = new Channel<AiRustEvent>();
  let acc = '';
  channel.onmessage = (e) => {
    if (e.type === 'token') {
      acc += e.text;
      onToken(acc);
    } else if (e.type === 'status') {
      onStatus?.(e.message);
    } else if (e.type === 'error') {
      throw new Error(e.message);
    }
  };
  const full = await invoke<string>('ai_chat', { messages, onEvent: channel });
  return full || acc;
}
