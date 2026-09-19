# Finora AI — дообучение своей модели (LoRA)

Пайплайн дообучения Qwen3.5-4B под стиль финансового советника Finora
и сборка своего GGUF. Работает локально на Apple Silicon (M-серия).

## Что здесь лежит

```
make_dataset.py     генератор датасета (data/train.jsonl, data/valid.jsonl)
data/               сгенерированный датасет (формат messages для mlx_lm)
strip_mtp.py        вырезает MTP-слой из фьюз-чекпоинта (шаг 4a)
strip_mtp_gguf.py   резерв: правка метаданных готового GGUF
eval_adapter.sh     сравнение базы и адаптера через mlx_lm generate
adapters/finora-lora4   АКТУАЛЬНЫЙ адаптер (32 слоя = все, 400 итераций,
                        213 диалогов, lr 1e-5; в приложении с 19.09)
adapters/finora-lora3   предыдущий (16 слоёв, 160 итераций)
adapters/finora-lora2   первый рабочий (8 слоёв, 120 итераций)
adapters/finora-lora    первая попытка (lr 1e-4, испорчен — не использовать)
train4.log          лог последнего обучения (32 слоя, loss 0.10)
venv/               окружение (mlx-lm, torch, gguf)
build/              llama.cpp (свежий) + собранный llama-quantize
```

Модели (база, фьюз, GGUF — десятки ГБ) НЕ хранятся: они скачиваются/собираются
пайплайном за ~40 минут. Первые попытки экспорта в GGUF удалены как
нерабочие — см. «Открытая проблема» ниже.

## Пайплайн (после серьёзных правок датасета)

```bash
# 0. окружение (один раз)
brew install python@3.12 cmake
python3.12 -m venv venv
venv/bin/pip install mlx-lm gguf sentencepiece mistral-common
venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu

# 1. база: исходная модель + её 4-битная квантованная версия
venv/bin/hf download Qwen/Qwen3.5-4B --local-dir models/Qwen3.5-4B
venv/bin/python -m mlx_lm convert --hf-path models/Qwen3.5-4B \
  --quantize --q-bits 4 --q-group-size 64 --mlx-path models/Qwen3.5-4B-4bit

# 2. датасет
venv/bin/python make_dataset.py

# 3. обучение LoRA (QLoRA поверх 4-битной базы — влезает в 24 ГБ)
venv/bin/python -m mlx_lm lora --train \
  --model models/Qwen3.5-4B-4bit --data data \
  --fine-tune-type lora --num-layers 16 --iters 250 \
  --batch-size 1 --learning-rate 1.0e-4 --max-seq-length 900 \
  --grad-checkpoint --adapter-path adapters/finora-lora

# 4. влить адаптер в базу (де-квантованная фьюз-версия)
venv/bin/python -m mlx_lm fuse --model models/Qwen3.5-4B \
  --adapter-path adapters/finora-lora2 \
  --save-path models/Qwen3.5-4B-finora \
  --dequantize --export-gguf --gguf-path models/finora-ai-f16.gguf
# (флаг --gguf-path в mlx-lm 0.31 игнорируется — GGUF даст шаг 5)

# 4a. ВЫРЕЗАТЬ MTP-слой (обязательно для llama.cpp <= сент.2026):
venv/bin/python strip_mtp.py models/Qwen3.5-4B-finora
# без этого шага GGUF соберётся с 33-м блоком и ключом nextn — рантайм
# приложения упадёт 'blk.32.attn_norm.weight not found'

# 5. конвертация в GGUF + квантизация в Q4_K_M — как у стоковой
venv/bin/python build/llama.cpp/convert_hf_to_gguf.py \
      models/Qwen3.5-4B-finora --outfile models/finora-ai-f16.gguf --outtype f16
build/quantize/bin/llama-quantize models/finora-ai-f16.gguf \
      finora-ai-Q4_K_M.gguf Q4_K_M

# 6. адаптер → LoRA-GGUF для приложения (5 МБ)
venv/bin/python make_lora_peft.py adapters/finora-lora2/adapters.safetensors build/lora-peft
venv/bin/python build/llama.cpp/convert_lora_to_gguf.py build/lora-peft \
      --base models/Qwen3.5-4B --outfile models/finora-lora.gguf --outtype f16
# (в convert НЕ входят linear_attn in_proj — конвертер их пока не умеет;
#  в приложении адаптер применяется поверх СТОКОВОГО GGUF через lora_adapter_set)

# 7. проверка движком приложения (стоковый GGUF + адаптер):
#    положить finora-lora.gguf в ~/Library/Application Support/ru.finora.app/models/
#    и запустить интеграционный тест: cd app/src-tauri && cargo test --release -- --ignored
```

## Как подключить свою модель к приложению

1. Залить `finora-ai-Q4_K_M.gguf` в свой репозиторий Hugging Face
   (публичный, один файл — можно через web-интерфейс).
2. В `app/src-tauri/src/ai.rs` поменять три константы:
   `MODEL_FILE`, `MODEL_URL`, `MODEL_APPROX_BYTES` — больше ничего.
3. Пересобрать приложение (`cd app && npm run app:build`).
4. У пользователей, уже скачавших модель, кнопка в настройках предложит
   удалить старую и скачать новую (файл отличается — см. имя).

## Замечания

- Датасет сейчас маленький (≈95 диалогов) — он закрепляет СТИЛЬ ответов,
  а не знания. Знания о деньгах пользователя всегда приходят в промпте.
- **Урок первого цикла:** lr 1e-4 «ломает» связность речи (модель выдаёт
  бессвязицу). Рабочая связка: lr 1e-5, 8 слоёв, 120 итераций — val loss
  0.23, стиль закреплён, связность сохранена.
- Проверка через MLX — модель сначала «думает» английским: артефакт
  MLX-шаблона (thinking не отключить), НЕ качество модели. В приложении
  thinking отключён пустым блоком `<think>`.
- Если качество LoRA не устроит — стоковая Qwen3.5-4B остаётся рабочей:
  просто не заливайте свой GGUF.

## Открытая проблема: экспорт ПОЛНОГО GGUF (на 19.09.2026)

Дообученный адаптер **подключён в приложение** — не цельным GGUF, а как
LoRA-адаптер поверх стокового GGUF:

- MLX-адаптер → PEFT (`make_lora_peft.py`) → llama.cpp LoRA
  (`convert_lora_to_gguf.py --base models/Qwen3.5-4B`) → `finora-lora.gguf`
  (20 МБ; актуальный v4: 256 тензоров = q/k/v/o + MLP ВСЕХ 32 слоёв);
- линейно-внимательные in_proj адаптеры конвертер llama.cpp пока НЕ
  экспортирует (NotImplementedError) — ~половина дообученных тензоров
  не применяется; при желании усилить стиль — растить долю standard-слоёв
  в обучении (--num-layers больше) или ждать поддержки в llama.cpp;
- движок приложения применяет адаптер через `lora_adapter_set`
  (масштаб 2,5 = alpha 20 / rank 8); файл кладётся рядом с GGUF.

А вот ПОЛНЫЙ GGUF (fuse → convert → quantize) остаётся несовместим:
конвертеры llama.cpp для qwen35 пишут файлы, которые и старый, и свежий
рантайм исполняют мусором; рантайм крейса 0.1.156 к тому же требует
инуую раскладку (441 vs 426 тензоров). Разбор опытов — в истории git
и в `strip_mtp_gguf.py`. Работоспособный путь — LoRA выше.
