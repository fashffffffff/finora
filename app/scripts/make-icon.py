#!/usr/bin/env python3
"""Генератор иконки Finora: тёплый тёмный сквиркл + три золотых слитка (без белого).

Запуск из папки app/:  python3 scripts/make-icon.py && npx tauri icon app-icon.png
"""
from PIL import Image, ImageDraw, ImageFilter
import os

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
R = 231  # радиус сквиркла macOS

# фон: тёплый тёмный с лёгким вертикальным затемнением книзу
bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
bgd = ImageDraw.Draw(bg)
for y in range(S):
    t = y / S
    r = int(34 + (18 - 34) * t)
    g = int(29 + (23 - 29) * t)
    b = int(21 + (15 - 21) * t)
    bgd.line([(0, y), (S, y)], fill=(r, g, b, 255))
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], R, fill=255)
img.paste(bg, (0, 0), mask)

# тонкая золотая окантовка
d.rounded_rectangle([26, 26, S - 26, S - 26], R - 22, outline=(212, 165, 66, 70), width=3)


def ingot(cx, bottom, w, h, face, top, side):
    """Трапеция слитка: узкий верх, широкий низ; тонкая линия блеска сверху."""
    tw = w * 0.66
    pts = [(cx - tw / 2, bottom - h), (cx + tw / 2, bottom - h), (cx + w / 2, bottom), (cx - w / 2, bottom)]
    d.polygon(pts, fill=face)
    d.line([(cx - tw / 2 + 10, bottom - h + 13), (cx + tw / 2 - 10, bottom - h + 13)], fill=top, width=7)


GOLD_FACE = (212, 165, 66, 255)
GOLD_TOP = (214, 170, 74, 255)
GOLD_SIDE = (156, 116, 36, 255)

# мягкая тень под стопкой
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.ellipse([252, 700, 772, 760], fill=(0, 0, 0, 110))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img, shadow)
d = ImageDraw.Draw(img)

# пирамида: два снизу, один сверху
ingot(364, 705, 300, 160, GOLD_FACE, GOLD_TOP, GOLD_SIDE)
ingot(661, 705, 300, 160, GOLD_FACE, GOLD_TOP, GOLD_SIDE)
ingot(512, 515, 300, 160, GOLD_FACE, GOLD_TOP, GOLD_SIDE)

out = os.path.join(os.path.dirname(__file__), "..", "app-icon.png")
img.save(os.path.abspath(out))
print("icon saved:", os.path.abspath(out))
