/* ============================================================
   Finora — локальная AI-модель (этап 3).

   Всё считается на этом компьютере: llama.cpp (Metal, с
   откатом на CPU) исполняет GGUF, скачанный пользователем
   один раз с Hugging Face. Сеть используется ТОЛЬКО на этапе
   скачивания файла модели — диалоги никуда не уходят.

   Команды:
     • ai_status          — есть ли модель на диске
     • ai_download_model  — докачка GGUF с прогрессом (Channel)
     • ai_cancel_download — отмена скачивания
     • ai_delete_model    — удалить файл модели
     • ai_chat            — стриминг ответа токен-за-токеном
   ============================================================ */

use std::io::Write;
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::Manager;

/* ---------- Константы модели ---------- */

/// Имя файла модели на диске
const MODEL_FILE: &str = "Qwen3.5-4B-Q4_K_M.gguf";
/// Публичный источник (Unsloth-квант Qwen3.5-4B, Apache-2.0).
/// После дообучения своей LoRA меняем на ссылку на свой GGUF —
/// остальной код не трогается.
const MODEL_URL: &str =
    "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf";
/// Дообученный LoRA-адаптер Finora (стиль советника). Файл маленький
/// (~25 МБ), скачивается следом за моделью; если его нет — модель
/// работает в стоковом виде, это не ошибка.
const LORA_FILE: &str = "finora-lora.gguf";
const LORA_URL: &str =
    "https://huggingface.co/fashffffffff/finora-ai/resolve/main/finora-lora.gguf";
/// Масштаб применения LoRA = lora_alpha (20) / rank (8)
const LORA_SCALE: f32 = 2.5;
/// Примерный размер адаптера для прогресса
const LORA_APPROX_BYTES: u64 = 6_000_000;
/// Примерный размер для показа статуса, точный приходит из Content-Length
const MODEL_APPROX_BYTES: u64 = 2_940_000_000;
/// Контекст: факты + история диалога — с запасом
const N_CTX: u32 = 8192;
/// Размер пакета декодирования. Промпт чата (роль + правила + факты)
/// заметно длиннее 512 токенов, а свежий llama.cpp при
/// n_tokens > n_batch abort'ится ассертом вместо разбиения на убатчи —
/// поэтому n_batch больше и промпт декодируется чанками.
const N_BATCH: u32 = 2048;
/// Максимум токенов ответа (короткий живой чат)
const MAX_REPLY_TOKENS: u32 = 640;
/// Настройки сэмплинга: рекомендация Qwen для instruct-режима
const TEMP: f32 = 0.7;
const TOP_P: f32 = 0.8;
const TOP_K: i32 = 20;
const PRESENCE: f32 = 1.5;

/* ---------- Состояние ---------- */

static CANCEL_DOWNLOAD: AtomicBool = AtomicBool::new(false);
static DOWNLOADING: AtomicBool = AtomicBool::new(false);

/// Крейс не помечает адаптер Send, но мы используем его строго под
/// GEN_LOCK (одна генерация за раз), как и саму модель.
struct SendLora(llama_cpp_2::model::LlamaLoraAdapter);
unsafe impl Send for SendLora {}

struct Engine {
    /// Порядок полей важен: модель и адаптер освобождаются ДО бэкенда
    model: llama_cpp_2::model::LlamaModel,
    /// Дообученный адаптер стиля; применяется к каждому контексту
    lora: Option<SendLora>,
    backend: llama_cpp_2::llama_backend::LlamaBackend,
    gpu: bool,
}

/// Модель живёт в памяти, только пока ей пользуются: после 10 минут
/// простоя поток-уборщик выгружает её (следующий вопрос загрузит снова).
/// Ничего не скачивается заново — файл уже на диске.
const IDLE_UNLOAD: Duration = Duration::from_secs(600);

static ENGINE: Mutex<Option<Engine>> = Mutex::new(None);
/// Момент последнего вопроса к модели (для авто-выгрузки)
static LAST_USED: Mutex<Option<Instant>> = Mutex::new(None);
/// Поток-уборщик запускается один раз вместе с моделью
static REAPER_SPAWNED: AtomicBool = AtomicBool::new(false);
/// Одновременная генерация не нужна — сериализуем запросы
static GEN_LOCK: Mutex<()> = Mutex::new(());

/// Раз в минуту проверяет простой и выгружает модель из памяти
fn spawn_reaper() {
    if REAPER_SPAWNED.swap(true, Ordering::Relaxed) {
        return;
    }
    std::thread::spawn(|| loop {
        std::thread::sleep(Duration::from_secs(60));
        let Ok(_gen) = GEN_LOCK.try_lock() else { continue };
        let idle = match LAST_USED.lock().unwrap().as_ref() {
            Some(t) => t.elapsed(),
            None => Duration::ZERO,
        };
        let Ok(mut slot) = ENGINE.lock() else { return };
        if slot.is_some() && idle >= IDLE_UNLOAD {
            *slot = None; // деструкторы llama.cpp освобождают память Metal
            log::info!("AI-модель выгружена из памяти после простоя");
        }
        if slot.is_none() {
            REAPER_SPAWNED.store(false, Ordering::Relaxed);
            return; // следующий запуск модели создаст новый поток
        }
    });
}

/* ---------- События и статусы (для фронтенда) ---------- */

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AiEvent {
    /// Промежуточный статус («гружу модель…»)
    Status { message: String },
    /// Очередной кусок ответа
    Token { text: String },
    /// Генерация завершена, полный текст
    Done { text: String },
    /// Ошибка — фронтенд откатится на правила
    Error { message: String },
}

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DownloadEvent {
    Progress { received: u64, total: u64 },
    Done { path: String },
    Error { message: String },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    /// Движок собран в этой сборке
    pub engine: bool,
    /// Файл модели лежит на диске и готов к загрузке
    pub model_ready: bool,
    pub model_file: String,
    pub model_bytes: Option<u64>,
    pub downloading: bool,
    /// Движок уже загружен в память и работает на GPU
    pub loaded: bool,
    pub gpu: bool,
    /// Дообученный адаптер стиля найден рядом с моделью
    pub lora_ready: bool,
}

#[derive(Deserialize)]
pub struct ChatMsg {
    pub role: String,
    pub content: String,
}

/* ---------- Пути ---------- */

fn models_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("не удалось определить папку данных: {e}"))?
        .join("models");
    Ok(dir)
}

fn model_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(MODEL_FILE))
}

/* ---------- Команды ---------- */

#[tauri::command]
pub fn ai_status(app: tauri::AppHandle) -> AiStatus {
    let path = model_path(&app).ok();
    let bytes = path.as_ref().and_then(|p| std::fs::metadata(p).ok()).map(|m| m.len());
    // файл меньше гигабайта — считаем битым (недокачался)
    let ready = matches!(bytes, Some(b) if b > 1_000_000_000);
    AiStatus {
        engine: true,
        model_ready: ready,
        model_file: MODEL_FILE.to_string(),
        model_bytes: bytes,
        downloading: DOWNLOADING.load(Ordering::Relaxed),
        loaded: ENGINE.lock().map(|s| s.is_some()).unwrap_or(false),
        gpu: ENGINE.lock().map(|s| s.as_ref().map(|e| e.gpu).unwrap_or(false)).unwrap_or(false),
        lora_ready: model_path(&app)
            .map(|p| p.parent().map(|d| d.join(LORA_FILE).exists()).unwrap_or(false))
            .unwrap_or(false),
    }
}

#[tauri::command]
pub async fn ai_download_model(
    app: tauri::AppHandle,
    on_progress: Channel<DownloadEvent>,
) -> Result<(), String> {
    if DOWNLOADING.swap(true, Ordering::Relaxed) {
        return Err("Скачивание уже идёт".into());
    }
    CANCEL_DOWNLOAD.store(false, Ordering::Relaxed);

    let result = download_inner(&app, &on_progress).await;
    // адаптер стиля: маленький файл, скачиваем следом; неудача не критична —
    // модель останется стоковой, а докачать можно позже
    if result.is_ok() {
        if let Ok(lora_path) = model_path(&app) {
            let lora_path = lora_path.parent().map(|d| d.join(LORA_FILE));
            if let Some(lora_path) = lora_path {
                if !lora_path.exists() {
                    let _ = on_progress.send(DownloadEvent::Progress {
                        received: 0,
                        total: LORA_APPROX_BYTES,
                    });
                    match download_file(LORA_URL, &lora_path).await {
                        Ok(()) => log::info!("LoRA-адаптер Finora скачан"),
                        Err(e) => log::warn!("LoRA-адаптер не скачался (не критично): {e}"),
                    }
                }
            }
        }
    }
    DOWNLOADING.store(false, Ordering::Relaxed);
    match result {
        Ok(path) => {
            let _ = on_progress.send(DownloadEvent::Done { path });
            Ok(())
        }
        Err(e) => {
            let _ = on_progress.send(DownloadEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

async fn download_inner(
    app: &tauri::AppHandle,
    on_progress: &Channel<DownloadEvent>,
) -> Result<String, String> {
    let dir = models_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("не удалось создать папку: {e}"))?;
    let final_path = dir.join(MODEL_FILE);
    let part_path = dir.join(format!("{MODEL_FILE}.part"));

    if final_path.exists()
        && std::fs::metadata(&final_path)
            .map(|m| m.len() > 1_000_000_000)
            .unwrap_or(false)
    {
        return Ok(final_path.to_string_lossy().into_owned());
    }

    let client = reqwest::Client::new();
    let resp = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("нет связи с источником модели: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("источник вернул код {}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(MODEL_APPROX_BYTES);

    let mut stream = resp.bytes_stream();
    let mut file = std::io::BufWriter::new(
        std::fs::File::create(&part_path).map_err(|e| format!("не удалось создать файл: {e}"))?,
    );
    let mut received: u64 = 0;
    let mut last_emit = Instant::now();

    while let Some(chunk) = stream.next().await {
        if CANCEL_DOWNLOAD.load(Ordering::Relaxed) {
            drop(file);
            let _ = std::fs::remove_file(&part_path);
            return Err("Скачивание отменено".into());
        }
        let chunk = chunk.map_err(|e| format!("обрыв при скачивании: {e}"))?;
        file.write_all(&chunk).map_err(|e| format!("ошибка записи: {e}"))?;
        received += chunk.len() as u64;
        if last_emit.elapsed() >= Duration::from_millis(250) {
            let _ = on_progress.send(DownloadEvent::Progress { received, total });
            last_emit = Instant::now();
        }
    }
    file.flush().map_err(|e| format!("ошибка записи: {e}"))?;
    drop(file);
    std::fs::rename(&part_path, &final_path).map_err(|e| format!("не удалось сохранить файл: {e}"))?;
    Ok(final_path.to_string_lossy().into_owned())
}

/// Простое скачивание файла во временный .part с переименованием
async fn download_file(url: &str, final_path: &PathBuf) -> Result<(), String> {
    let part_path = final_path.with_extension("gguf.part");
    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("нет связи: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("код {}", resp.status()));
    }
    let mut stream = resp.bytes_stream();
    let mut file = std::io::BufWriter::new(
        std::fs::File::create(&part_path).map_err(|e| e.to_string())?,
    );
    while let Some(chunk) = stream.next().await {
        file.write_all(&chunk.map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);
    std::fs::rename(&part_path, final_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn ai_cancel_download() {
    CANCEL_DOWNLOAD.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub fn ai_delete_model(app: tauri::AppHandle) -> Result<bool, String> {
    let path = model_path(&app)?;
    let part = path.with_extension("gguf.part");
    let existed = path.exists();
    let _ = std::fs::remove_file(&path);
    let _ = std::fs::remove_file(&part);
    Ok(existed)
}

/// Выгрузить движок из памяти. Вызывается при закрытии приложения:
/// Metal-бэкенд свежего llama.cpp ассертится при выходе процесса,
/// если ресурсы устройства не освобождены (rsets), — дропаем сами.
pub fn ai_shutdown() {
    let _gen = GEN_LOCK.lock();
    if let Ok(mut slot) = ENGINE.lock() {
        *slot = None; // деструкторы llama.cpp освобождают память Metal
    }
}

/// Основной диалоговый вызов: сообщения приходят готовым списком
/// (system + история + вопрос), ответ стримится в канал.
#[tauri::command]
pub async fn ai_chat(
    app: tauri::AppHandle,
    messages: Vec<ChatMsg>,
    on_event: Channel<AiEvent>,
) -> Result<String, String> {
    let dir = models_dir(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        generate(&dir, messages, &|e| on_event.send(e).map_err(|err| err.to_string()))
    })
    .await
    .map_err(|e| format!("поток генерации прерван: {e}"))?
}

/* ---------- ChatML (шаблон Qwen3.5) ---------- */

/// Собирает промпт в формате Qwen3.5. Thinking отключаем штатным
/// способом шаблона — пустым блоком <think> после «assistant».
fn build_prompt(messages: &[ChatMsg]) -> String {
    let mut p = String::new();
    for m in messages {
        let role = match m.role.as_str() {
            "system" => "system",
            "assistant" => "assistant",
            _ => "user",
        };
        p.push_str("<|im_start|>");
        p.push_str(role);
        p.push('\n');
        p.push_str(&m.content);
        p.push_str("<|im_end|>\n");
    }
    p.push_str("<|im_start|>assistant\n<think>\n\n</think>\n\n");
    p
}

/* ---------- Генерация ---------- */

/// Готовит движок к работе. Вызывать под GEN_LOCK.
fn ensure_engine(model_dir: &PathBuf) -> Result<(), String> {
    let mut slot = ENGINE.lock().map_err(|_| "движок заблокирован".to_string())?;
    if slot.is_some() {
        return Ok(());
    }
    let backend = llama_cpp_2::llama_backend::LlamaBackend::init()
        .map_err(|e| format!("не удалось запустить движок llama.cpp: {e}"))?;

    let model_file = model_dir.join(MODEL_FILE);

    // сначала пробуем полный перенос на GPU (Metal), при неудаче — CPU
    let load = |backend: &llama_cpp_2::llama_backend::LlamaBackend, gpu: u32| {
        let params = llama_cpp_2::model::params::LlamaModelParams::default().with_n_gpu_layers(gpu);
        llama_cpp_2::model::LlamaModel::load_from_file(backend, &model_file, &params)
    };

    let (model, gpu) = match load(&backend, u32::MAX) {
        Ok(m) => (m, true),
        Err(e) => {
            log::warn!("Metal недоступен, переключаюсь на CPU: {e}");
            let m = load(&backend, 0).map_err(|e| format!("не удалось загрузить модель: {e}"))?;
            (m, false)
        }
    };

    // дообученный адаптер стиля: если файла нет — стоковое поведение
    let lora = match model_dir.join(LORA_FILE).exists() {
        true => match model.lora_adapter_init(model_dir.join(LORA_FILE)) {
            Ok(a) => {
                log::info!("LoRA-адаптер Finora загружен");
                Some(a)
            }
            Err(e) => {
                log::warn!("LoRA-адаптер не загрузился, работаю со стоковой моделью: {e}");
                None
            }
        },
        false => None,
    };

    *slot = Some(Engine { model, lora: lora.map(SendLora), backend, gpu });
    Ok(())
}

fn generate(
    models_dir: &PathBuf,
    messages: Vec<ChatMsg>,
    emit: &dyn Fn(AiEvent) -> Result<(), String>,
) -> Result<String, String> {
    if !models_dir.join(MODEL_FILE).exists() {
        return Err("файл модели отсутствует".into());
    }

    let _guard = GEN_LOCK.lock().map_err(|_| "генерация уже занята".to_string())?;

    // грузим модель, только если её нет в памяти (после простоя она выгружена)
    let was_loaded = ENGINE.lock().map(|s| s.is_some()).unwrap_or(false);
    if !was_loaded {
        let _ = emit(AiEvent::Status {
            message: "Прогреваю модель…".into(),
        });
    }
    ensure_engine(models_dir)?;
    *LAST_USED.lock().map_err(|_| "часы заблокированы".to_string())? = Some(Instant::now());
    spawn_reaper();

    let mut engine_guard = ENGINE.lock().map_err(|_| "движок заблокирован".to_string())?;
    // раздельные заимствования полей: контекст живёт на model/backend,
    // а LoRA берётся отдельным мутабельным заимствованием своего поля
    let engine = engine_guard.as_mut().expect("движок должен быть загружен");
    let Engine { backend, model, lora, gpu: _ } = engine;

    let prompt = build_prompt(&messages);
    let ctx_params = llama_cpp_2::context::params::LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(N_CTX))
        .with_n_batch(N_BATCH);
    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| format!("не удалось создать контекст: {e}"))?;
    ctx.clear_kv_cache();

    // применяем дообученный адаптер стиля, если он загружен
    if let Some(lora) = lora {
        ctx.lora_adapter_set(&mut lora.0, LORA_SCALE)
            .map_err(|e| format!("не удалось применить LoRA: {e}"))?;
    }

    let prompt_tokens = model
        .str_to_token(&prompt, llama_cpp_2::model::AddBos::Always)
        .map_err(|e| format!("ошибка токенизации: {e}"))?;
    if prompt_tokens.is_empty() {
        return Err("пустой промпт".into());
    }

    // префилл промпта чанками: decode принимает пакеты не длиннее n_batch
    let mut start = 0;
    while start < prompt_tokens.len() {
        let end = (start + N_BATCH as usize).min(prompt_tokens.len());
        let last_chunk = end == prompt_tokens.len();
        let mut batch = llama_cpp_2::llama_batch::LlamaBatch::new(end - start, 1);
        for (i, tok) in prompt_tokens[start..end].iter().enumerate() {
            // логиты нужны только с последнего токена всего промпта
            let need_logits = last_chunk && i + 1 == end - start;
            batch
                .add(*tok, (start + i) as i32, &[0], need_logits)
                .map_err(|e| format!("ошибка пакета: {e}"))?;
        }
        ctx.decode(&mut batch)
            .map_err(|e| format!("ошибка обработки промпта: {e}"))?;
        start = end;
    }

    let mut sampler = llama_cpp_2::sampling::LlamaSampler::chain_simple([
        llama_cpp_2::sampling::LlamaSampler::penalties(
            model.n_vocab() as i32,
            64,
            1.0,
            0.0,
            PRESENCE,
        ),
        llama_cpp_2::sampling::LlamaSampler::top_k(TOP_K),
        llama_cpp_2::sampling::LlamaSampler::top_p(TOP_P, 1),
        llama_cpp_2::sampling::LlamaSampler::temp(TEMP),
        llama_cpp_2::sampling::LlamaSampler::dist(0),
    ]);

    let eos = model.token_eos();
    let mut answer = String::new();
    let mut pos = prompt_tokens.len() as i32;
    let started = Instant::now();

    for _ in 0..MAX_REPLY_TOKENS {
        let token = sampler.sample(&ctx, -1);
        sampler.accept(token);
        if token == eos {
            break;
        }
        let piece = model
            .token_to_piece_bytes(token, 64, false, None)
            .map(|b| String::from_utf8_lossy(&b).into_owned())
            .unwrap_or_default();
        if !piece.is_empty() {
            answer.push_str(&piece);
            let _ = emit(AiEvent::Token { text: piece });
        }

        let mut next = llama_cpp_2::llama_batch::LlamaBatch::new(1, 1);
        next.add(token, pos, &[0], true)
            .map_err(|e| format!("ошибка пакета: {e}"))?;
        ctx.decode(&mut next).map_err(|e| format!("ошибка генерации: {e}"))?;
        pos += 1;

        // страховка от зависания: 3 минуты на ответ
        if started.elapsed() > Duration::from_secs(180) {
            break;
        }
    }

    let text = answer.trim().to_string();
    if text.is_empty() {
        return Err("модель вернула пустой ответ".into());
    }
    let _ = emit(AiEvent::Done { text: text.clone() });
    Ok(text)
}

/* ---------- Тесты ---------- */

#[cfg(test)]
mod tests {
    use super::*;

    /// Интеграционный тест полного конвейера: загрузка GGUF (Metal) →
    /// ChatML → генерация → остановка на EOS. Требует скачанной модели:
    ///   cargo test --release -- --ignored
    #[test]
    #[ignore]
    fn generates_reply_from_local_model() {
        let path = directories_fallback();
        let events = std::sync::Mutex::new(Vec::new());
        let answer = generate(
            &path,
            vec![ChatMsg {
                role: "user".into(),
                content: "Трачу 10 тысяч в неделю на подарки девушке, это нормально? И как накопить на отпуск?".into(),
            }],
            &|e| {
                events.lock().unwrap().push(format!("{e:?}"));
                Ok(())
            },
        )
        .expect("генерация должна пройти");
        assert!(!answer.trim().is_empty(), "ответ пуст");
        let tokens = events
            .lock()
            .unwrap()
            .iter()
            .filter(|e| e.contains("Token"))
            .count();
        assert!(tokens > 3, "стриминг не сработал, токенов: {tokens}");
        println!("Ответ модели: {answer}");
    }

    /// Регресс на вылет из чата: промпт с фактами длиннее n_batch.
    /// Свежий llama.cpp abort'ится ассертом n_tokens <= n_batch, если
    /// скормить ему пакет целиком — префилл обязан идти чанками.
    #[test]
    #[ignore]
    fn handles_long_prompt() {
        let path = directories_fallback();
        // ~150 повторов ≈ 2500+ токенов, заметно больше N_BATCH (2048)
        let filler = "Пользователь каждый месяц откладывает часть зарплаты, "
            .repeat(150);
        let answer = generate(
            &path,
            vec![
                ChatMsg {
                    role: "system".into(),
                    content: "Ты — финансовый советник Finora.".into(),
                },
                ChatMsg {
                    role: "user".into(),
                    content: format!("{filler}\nОтветь одним коротким предложением: сколько месяцев в году двенадцать?"),
                },
            ],
            &|_| Ok(()),
        )
        .expect("длинный промпт должен декодироваться чанками без падения");
        assert!(!answer.trim().is_empty(), "ответ пуст");
        println!("Ответ на длинный промпт: {answer}");
        // выгрузка движка — то же, что при закрытии приложения; заодно
        // проверяем, что освобождение Metal-ресурсов не ассертится
        super::ai_shutdown();
    }

    fn directories_fallback() -> PathBuf {
        // FINORA_TEST_MODEL_DIR — папка с файлами модели (GGUF + LoRA):
        //   FINORA_TEST_MODEL_DIR=/path/dir cargo test --release -- --ignored
        if let Ok(p) = std::env::var("FINORA_TEST_MODEL_DIR") {
            return PathBuf::from(p);
        }
        let home = std::env::var("HOME").expect("нет HOME");
        PathBuf::from(home).join("Library/Application Support/ru.finora.app/models")
    }
}
