#!/usr/bin/env python3
"""Build the demo WebP images in public/samples/ from the Canva originals.

The originals (JPG, full size) live on the `sample-photos-src` branch:

    git fetch origin sample-photos-src
    mkdir -p /tmp/dc-src && git --work-tree=/tmp/dc-src checkout FETCH_HEAD -- .
    python3 -I scripts/sample-photos/build.py /tmp/dc-src public/samples

Every output is a WebP at the largest quality that stays under its size
budget (hero under 250 KB, product photos under 150 KB). These are demo
images: replace them with real product photos before launch.
"""

import io
import json
import sys
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])

PRODUCTS = [
    "vase-cream", "vase-clay", "vase-sage", "vase-lifestyle", "candle", "frame",
    "lamp-ivory", "lamp-blush", "lamp-lifestyle", "fairy-lights", "mushroom-lamp",
    "notebook-sage", "notebook-rosewood", "notebook-sand", "notebook-lifestyle",
    "pen-holder", "tray", "tote-natural", "tote-black", "claw-clips", "gift-box",
]
# Category slug -> vertical position of the 4:1 desktop strip (0 = top, 1 = bottom).
CATEGORIES = {
    "room-decor": 0.55, "lighting": 0.5, "desk-and-stationery": 0.62,
    "accessories": 0.32, "gifts": 0.62, "new-arrivals": 0.5,
}

report = []


def save(img: Image.Image, rel: str, budget_kb: int, q_max: int = 88, q_min: int = 50):
    """Write the highest-quality WebP under the budget."""
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGB")
    best = None
    lo, hi = q_min, q_max
    while lo <= hi:
        q = (lo + hi) // 2
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= budget_kb * 1024:
            best = (q, buf.getvalue())
            lo = q + 1
        else:
            hi = q - 1
    if best is None:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q_min, method=6)
        best = (q_min, buf.getvalue())
    path.write_bytes(best[1])
    report.append({"file": rel, "size": list(img.size), "kb": round(len(best[1]) / 1024, 1), "quality": best[0]})


def crop(img: Image.Image, ratio: float, x: float = 0.5, y: float = 0.5) -> Image.Image:
    """Largest crop with width/height = ratio; x, y place it (0 = left/top, 1 = right/bottom)."""
    w, h = img.size
    if w / h > ratio:
        cw, ch = round(h * ratio), h
    else:
        cw, ch = w, round(w / ratio)
    left = round((w - cw) * x)
    top = round((h - ch) * y)
    return img.crop((left, top, left + cw, top + ch))


def fit(img: Image.Image, width: int, height: int) -> Image.Image:
    return img.resize((width, height), Image.Resampling.LANCZOS)


def open_src(name: str) -> Image.Image:
    return Image.open(SRC / f"{name}.jpg")


# Product photos: 1200 px for the product page, 400 px for cards and thumbnails.
for name in PRODUCTS:
    img = crop(open_src(name), 1)
    save(fit(img, 1200, 1200), f"products/{name}.webp", 150)
    save(fit(img, 400, 400), f"products/{name}-400.webp", 36)

# Hero: 2400x1000 desktop (the objects sit on the right) and a 1080x1350 phone crop.
hero = open_src("hero-desktop")
save(fit(crop(hero, 2.4, x=0.5, y=0.62), 2400, 1000), "home/hero-desktop.webp", 250)
hero_m = open_src("hero-mobile")
# Phones show the text above the photo, so the crop sits tight on the lamp,
# the vase and the notebook (the empty wall above them is left out).
save(fit(crop(hero_m.crop((250, 300, hero_m.width, hero_m.height)), 0.8, y=1.0), 1080, 1350),
     "home/hero-mobile.webp", 250)

# Homepage banners: wide desktop crop and a phone crop centred on the objects.
for name, mobile_x in (("banner-evening", 0.72), ("banner-gifts", 0.74)):
    img = open_src(name)
    save(fit(crop(img, 2.4, y=0.6), 1776, 740), f"home/{name}-desktop.webp", 200)
    save(fit(crop(img, 1.25, x=mobile_x, y=0.6), 1000, 800), f"home/{name}-mobile.webp", 120)

# Category and collection images: square card, 4:1 desktop banner, 2:1 phone banner.
for slug, strip_y in CATEGORIES.items():
    src_name = "col-new-arrivals" if slug == "new-arrivals" else f"cat-{slug}"
    img = open_src(src_name)
    save(fit(crop(img, 1), 600, 600), f"categories/{slug}-card.webp", 60)
    save(fit(crop(img, 4, y=strip_y), 1776, 444), f"categories/{slug}-desktop.webp", 150)
    save(fit(crop(img, 2), 1440, 720), f"categories/{slug}-mobile.webp", 140)

(OUT / "README.txt").write_text(
    "Demo images generated in Canva for the [SAMPLE] products, categories and homepage.\n"
    "Replace them with real photos before launch. Built by scripts/sample-photos/build.py.\n"
)
print(json.dumps(report, indent=1))
total = sum(r["kb"] for r in report)
print(f"{len(report)} files, {total:.0f} KB")
