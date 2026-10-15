"""Generate a branded book-cover JPEG when no external provider has one.

Used as the final step of the cover pipeline so the storefront never shows
a broken image or the generic “COVER UNCHARTED” placeholder for catalogued
titles that simply aren't in Open Library / Google / Internet Archive
(common for local Pakistani editions).
"""

from __future__ import annotations

import io
from PIL import Image, ImageDraw, ImageFont

# Card proportions used across the shop (~3:4).
WIDTH = 600
HEIGHT = 800

# Allied blue palette (matches the site).
NAVY = (15, 23, 42)       # #0F172A
BLUE = (30, 58, 138)      # #1E3A8A
ACCENT = (37, 99, 235)    # #2563EB
LIGHT = (239, 246, 255)   # #EFF6FF
WHITE = (255, 255, 255)
MUTED = (148, 163, 184)   # #94A3B8


def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    # Prefer Windows system fonts; fall back to PIL default.
    candidates = (
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/Georgia.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    )
    if bold:
        candidates = (
            "C:/Windows/Fonts/georgiab.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
        ) + candidates
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    words = (text or "").strip().split()
    if not words:
        return []
    # Binary-ish wrap by character width using textbbox.
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
            if len(lines) >= max_lines:
                break
    if len(lines) < max_lines:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
    # Ellipsis on last line if we truncated.
    if len(words) > sum(len(l.split()) for l in lines):
        last = lines[-1]
        while True:
            trial = last.rstrip(" .") + "…"
            bbox = draw.textbbox((0, 0), trial, font=font)
            if bbox[2] - bbox[0] <= max_width or len(last) < 4:
                lines[-1] = trial
                break
            last = last[:-1]
    return lines


def generate_cover_jpeg(title: str, author: str | None = None) -> bytes:
    """Return a JPEG cover image as bytes."""
    img = Image.new("RGB", (WIDTH, HEIGHT), LIGHT)
    draw = ImageDraw.Draw(img)

    # Top navy band
    draw.rectangle([0, 0, WIDTH, 28], fill=NAVY)
    # Left accent spine strip
    draw.rectangle([0, 0, 18, HEIGHT], fill=ACCENT)
    # Bottom navy band
    draw.rectangle([0, HEIGHT - 64, WIDTH, HEIGHT], fill=NAVY)

    # Decorative compass ring
    cx, cy, r = WIDTH - 90, 110, 48
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT, width=2)
    draw.ellipse([cx - r + 12, cy - r + 12, cx + r - 12, cy + r - 12], outline=BLUE, width=1)
    draw.line([cx, cy - r + 6, cx, cy + r - 6], fill=NAVY, width=1)
    draw.line([cx - r + 6, cy, cx + r - 6, cy], fill=NAVY, width=1)

    title_font = _font(36, bold=True)
    author_font = _font(22)
    brand_font = _font(14)

    # Title block
    max_w = WIDTH - 80
    title_lines = _fit_text(draw, (title or "Untitled").upper(), title_font, max_w, 8)
    y = 200
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        tw = bbox[2] - bbox[0]
        draw.text(((WIDTH - tw) // 2 + 6, y), line, font=title_font, fill=NAVY)
        y += (bbox[3] - bbox[1]) + 10

    # Author
    author_clean = (author or "").strip()
    if author_clean and author_clean.upper() not in {"N/A", "NA"}:
        y += 24
        draw.line([90, y, WIDTH - 90, y], fill=ACCENT, width=2)
        y += 20
        author_lines = _fit_text(draw, author_clean.title(), author_font, max_w, 2)
        for line in author_lines:
            bbox = draw.textbbox((0, 0), line, font=author_font)
            tw = bbox[2] - bbox[0]
            draw.text(((WIDTH - tw) // 2 + 6, y), line, font=author_font, fill=BLUE)
            y += (bbox[3] - bbox[1]) + 6

    # Brand footer
    brand = "ALLIED BOOK COMPANY"
    bbox = draw.textbbox((0, 0), brand, font=brand_font)
    tw = bbox[2] - bbox[0]
    draw.text(
        ((WIDTH - tw) // 2 + 6, HEIGHT - 42),
        brand,
        font=brand_font,
        fill=WHITE,
    )

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


def try_generate(title: str, author: str | None = None) -> Optional[bytes]:
    try:
        return generate_cover_jpeg(title, author)
    except Exception:  # noqa: BLE001
        return None
