#!/usr/bin/env python3
"""Приводит GGUF от свежего конвертера llama.cpp к виду, который понимает
рантайм llama-cpp-sys-2 0.1.156 (сент. 2026): убирает qwen35-MTP.

Что делает:
  • вырезает qwen35.nextn_predict_layers и qwen35.attention.recurrent_layers
  • правит qwen35.block_count 33 -> 32
  • копирует секцию тензоров байт-в-байт (оффсеты относительные)

Использование: strip_mtp_gguf.py <in.gguf> <out.gguf>
"""
import math
import os
import struct
import sys

import gguf

DROP = {"qwen35.nextn_predict_layers", "qwen35.attention.recurrent_layers"}
ALIGN = 32
V = gguf.GGUFValueType


def w_str(b: bytes, s) -> bytes:
    b2 = s.encode() if isinstance(s, str) else s
    return b + struct.pack("<Q", len(b2)) + b2


def kv_bytes(name: str, f) -> bytes:
    out = w_str(b"", name)
    types = [int(t) for t in f.types]
    val = f.contents()
    if types[0] == int(V.ARRAY):
        et = types[1]
        out += struct.pack("<I", types[0]) + struct.pack("<I", et) + struct.pack("<Q", len(val))
        for el in val:
            if et == int(V.STRING):
                out += struct.pack("<Q", len(el)) + (el.encode() if isinstance(el, str) else el)
            elif et == int(V.UINT32):
                out += struct.pack("<I", el)
            elif et == int(V.INT32):
                out += struct.pack("<i", el)
            elif et == int(V.UINT64):
                out += struct.pack("<Q", el)
            elif et == int(V.INT64):
                out += struct.pack("<q", el)
            elif et == int(V.FLOAT32):
                out += struct.pack("<f", el)
            elif et == int(V.FLOAT64):
                out += struct.pack("<d", el)
            elif et == int(V.BOOL):
                out += struct.pack("<B", 1 if el else 0)
            else:
                raise SystemExit(f"массив типа {et} у {name}")
        return out
    out += struct.pack("<I", types[0])
    el = val[0] if isinstance(val, list) else val
    if types[0] == int(V.STRING):
        return w_str(out, el)
    if types[0] == int(V.UINT32):
        return out + struct.pack("<I", el)
    if types[0] == int(V.INT32):
        return out + struct.pack("<i", el)
    if types[0] == int(V.UINT64):
        return out + struct.pack("<Q", el)
    if types[0] == int(V.INT64):
        return out + struct.pack("<q", el)
    if types[0] == int(V.FLOAT32):
        return out + struct.pack("<f", el)
    if types[0] == int(V.FLOAT64):
        return out + struct.pack("<d", el)
    if types[0] == int(V.BOOL):
        return out + struct.pack("<B", 1 if el else 0)
    raise SystemExit(f"тип {types[0]} у {name}")


def main(src, dst):
    r = gguf.GGUFReader(src)
    total = sum(math.ceil(t.n_bytes / ALIGN) * ALIGN for t in r.tensors)
    with open(src, "rb") as fh:
        fh.seek(os.path.getsize(src) - total)
        blob = fh.read()

    meta, n_kv = b"", 0
    for name, f in r.fields.items():
        if name in DROP or name.startswith("GGUF."):
            continue
        meta += kv_bytes(name, f)
        n_kv += 1

    # block_count 33 -> 32
    key = b"qwen35.block_count"
    i = meta.find(key)
    assert i > 0, "нет block_count"
    tp = i + len(key)
    t, v = struct.unpack_from("<II", meta, tp)
    assert (t, v) == (int(V.UINT32), 33), f"block_count = {v}"
    meta = meta[: tp + 4] + struct.pack("<I", 32) + meta[tp + 8 :]

    out = b"GGUF" + struct.pack("<IQQ", 3, len(r.tensors), n_kv) + meta
    out += b"\0" * ((-len(out)) % ALIGN) + blob
    open(dst, "wb").write(out)
    print(f"записан {dst}: {os.path.getsize(dst)} байт, kv={n_kv}")

    # самопроверка: читаем обратно
    r2 = gguf.GGUFReader(dst)
    names = {f.name for f in r2.fields.values()}
    assert not (DROP & names), "ключи не вырезались"
    for f in r2.fields.values():
        if f.name == "qwen35.block_count":
            assert f.contents() == [32], f.contents()
    print("самопроверка пройдена: block_count=32, MTP-ключей нет")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
