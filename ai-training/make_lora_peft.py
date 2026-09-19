#!/usr/bin/env python3
"""Конвертирует MLX-адаптер (mlx_lm lora) в PEFT-формат для
convert_lora_to_gguf.py из llama.cpp.

MLX:  <prefix>.lora_a [in, r], <prefix>.lora_b [r, out]
PEFT: base_model.model.<path>.lora_A.weight [r, in],
      base_model.model.<path>.lora_B.weight [out, r]

Использование: make_lora_peft.py <mlx_adapter.safetensors> <out_dir>
"""
import json
import os
import sys

import numpy as np
from safetensors import safe_open
from safetensors.numpy import save_file


def main(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    tensors = {}
    targets = set()

    with safe_open(src, framework="np") as f:
        for key in f.keys():
            a = f.get_tensor(key)
            assert key.endswith(".lora_a") or key.endswith(".lora_b"), key
            # linear_attn in_proj конвертер llama.cpp пока не экспортирует —
            # пропускаем, чтобы конвертация не падала
            if "linear_attn" in key:
                continue
            path, kind = key.rsplit(".", 1)
            # language_model.model.layers.N.... → model.layers.N....
            if path.startswith("language_model."):
                path = path[len("language_model."):]
            # в MLX матрицы лежат транспозированно относительно PEFT
            w = a.T.astype(np.float32) if kind == "lora_a" else a.T.astype(np.float32)
            peft_kind = "lora_A" if kind == "lora_a" else "lora_B"
            tensors[f"base_model.model.{path}.{peft_kind}.weight"] = np.ascontiguousarray(w)
            targets.add(path.rsplit(".", 0)[0].split("layers.")[-1].split(".", 2)[-1]
                        if False else path)  # полный путь модуля

    # target_modules: уникальные хвосты путей (q_proj, in_proj_qkv, ...)
    tails = sorted({p.split(".")[-1] for p in targets})
    cfg = {
        "r": 8,
        "lora_alpha": 20,
        "lora_dropout": 0.0,
        "target_modules": tails,
        "modules_to_save": None,
        "base_model_name_or_path": "Qwen/Qwen3.5-4B",
        "bias": "none",
        "task_type": "CAUSAL_LM",
        "peft_type": "LORA",
    }
    save_file(tensors, os.path.join(out_dir, "adapter_model.safetensors"))
    json.dump(cfg, open(os.path.join(out_dir, "adapter_config.json"), "w"), indent=2)
    print(f"тензоров: {len(tensors)}, target_modules: {tails}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
