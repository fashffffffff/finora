#!/usr/bin/env python3
"""Вырезает MTP-слой (последний, nextn) из фьюз-чекпоинта Qwen3.5.

llama.cpp в версии llama-cpp-sys-2 0.1.156 не поддерживает MTP-слой
qwen35: при nextn_predict_layers=1 ищет тензоры nextn-формата и падает
на 'blk.32.attn_norm.weight not found'. Стоковые GGUF собраны без
MTP-слоя (32 блока) — приводим фьюз к тому же виду.

Использование: strip_mtp.py <dir-модели>
"""
import json
import os
import sys

import safetensors
from safetensors import safe_open
from safetensors.torch import save_file

try:
    import torch
except ImportError:
    torch = None  # save_file работает и без torch? нет — нужен. Проверим ниже.

def main(d):
    idx_path = os.path.join(d, "model.safetensors.index.json")
    idx = json.load(open(idx_path))
    wm = idx["weight_map"]

    # конфиг может быть плоским или вложенным (text_config у Qwen3.5)
    cfg_path = os.path.join(d, "config.json")
    cfg = json.load(open(cfg_path))
    host = cfg if "num_hidden_layers" in cfg else cfg.get("text_config", cfg)
    n_layers = host.get("num_hidden_layers")
    if n_layers is None:
        raise SystemExit(f"не нашёл num_hidden_layers ни в корне, ни в text_config: {list(cfg)}")
    last = n_layers - 1
    drop = [k for k in wm if k.startswith(f"model.layers.{last}.")]
    print(f"слоёв: {n_layers}, вырезаю тензоров слоя {last}: {len(drop)}")
    assert drop, "тензоры последнего слоя не найдены"

    # группируем оставшиеся тензоры по файлам
    keep = {k: v for k, v in wm.items() if k not in drop}
    by_file = {}
    for k, f in keep.items():
        by_file.setdefault(f, []).append(k)

    # переписываем файлы без вырезанных тензоров
    for fname, keys in by_file.items():
        path = os.path.join(d, fname)
        tensors = {}
        with safe_open(path, framework="pt") as f:
            for k in keys:
                tensors[k] = f.get_tensor(k)
        save_file(tensors, path, metadata={"format": "pt"})
        print(f"{fname}: {len(keys)} тензоров переписано")

    # новые карты и конфиг
    new_wm = {k: wm[k] for k in keep}
    idx["weight_map"] = new_wm
    json.dump(idx, open(idx_path, "w"), indent=2)

    cfg["num_hidden_layers"] = last if "num_hidden_layers" in cfg else cfg.get("num_hidden_layers")
    host["num_hidden_layers"] = last
    # обрезаем layer_types до нового числа слоёв, если есть
    if isinstance(host.get("layer_types"), list):
        host["layer_types"] = host["layer_types"][:last]
        print("layer_types обрезан до", len(host["layer_types"]))
    for key in list(host):
        if "nextn" in key.lower() or "mtp" in key.lower():
            host.pop(key)
            print("из конфига удалён:", key)
    json.dump(cfg, open(cfg_path, "w"), indent=2)

    # подчищаем осиротевшие файлы
    used = set(idx["weight_map"].values())
    for f in os.listdir(d):
        if f.endswith(".safetensors") and f not in used:
            os.remove(os.path.join(d, f))
            print("удалён пустой файл:", f)

if __name__ == "__main__":
    main(sys.argv[1])
