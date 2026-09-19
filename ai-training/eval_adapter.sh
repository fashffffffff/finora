#!/bin/zsh
# Сравнение стоковой Qwen3.5-4B (4-bit) и LoRA-адаптера Finora
# на трёх характерных промптах. Использование:
#   ./eval_adapter.sh adapters/finora-lora/adapter.safetensors [N_ITER]
set -e
cd "$(dirname "$0")"
ADAPTER="${1:-adapters/finora-lora/adapter.safetensors}"
LABEL="${2:-checkpoint}"

PROMPT_SYSTEM='Данные пользователя:
- сегодня: 17 сентября 2026
- баланс: 154 300 ₽
- цели: «Ноутбук для учёбы» — 64 300 из 180 000 ₽, срок 31 декабря 2026'

run_case () {
  local title="$1"; shift
  local user="$1"; shift
  echo "═══ $title ═══"
  echo "--- база ---"
  ./venv/bin/python -m mlx_lm generate --model models/Qwen3.5-4B-4bit \
    --extra-eos-token "<|im_end|>" --max-tokens 220 --temp 0.7 \
    --prompt "<|im_start|>system
$PROMPT_SYSTEM
Правила: отвечай по-русски живым тёплым языком, кратко (2–6 предложений), только на основе фактов, не выдумывай цифры.<|im_end|>
<|im_start|>user
$user<|im_end|>
<|im_start|>assistant
<think>

</think>

" 2>/dev/null | tail -n +1 | head -12
  echo "--- LoRA ($LABEL) ---"
  ./venv/bin/python -m mlx_lm generate --model models/Qwen3.5-4B-4bit \
    --adapter-path "$ADAPTER" \
    --extra-eos-token "<|im_end|>" --max-tokens 220 --temp 0.7 \
    --prompt "<|im_start|>system
$PROMPT_SYSTEM
Правила: отвечай по-русски живым тёплым языком, кратко (2–6 предложений), только на основе фактов, не выдумывай цифры.<|im_end|>
<|im_start|>user
$user<|im_end|>
<|im_start|>assistant
<think>

</think>

" 2>/dev/null | tail -n +1 | head -12
  echo
}

run_case "Подарки" "Трачу 10 тысяч в неделю на подарки девушке, это нормально?"
run_case "Свободные деньги" "Куда деть свободные деньги в этом месяце?"
run_case "План накопления" "Как накопить на ноутбук?"
