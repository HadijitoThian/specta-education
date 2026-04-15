#!/usr/bin/env python3
"""
SpecTa Education Instagram Image Compositor
Uses Python Pillow for reliable text rendering on production server.
Called from Node.js via child_process.execFile()
Input: JSON via stdin
Output: writes composed JPEG to output_path, prints result JSON to stdout
"""

import sys
import json
import os
import urllib.request
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Font paths (Noto Sans confirmed installed) ──────────────────────────────
FONT_BOLD   = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
FALLBACK_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        try:
            return ImageFont.truetype(FALLBACK_FONT, size)
        except Exception:
            return ImageFont.load_default()

def download_image(url):
    """Download image from URL to a temp file, return PIL Image."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp.write(data)
    tmp.close()
    return Image.open(tmp.name).convert("RGBA"), tmp.name

def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.ellipse([x1, y1, x1 + 2*radius, y1 + 2*radius], fill=fill)
    draw.ellipse([x2 - 2*radius, y1, x2, y1 + 2*radius], fill=fill)
    draw.ellipse([x1, y2 - 2*radius, x1 + 2*radius, y2], fill=fill)
    draw.ellipse([x2 - 2*radius, y2 - 2*radius, x2, y2], fill=fill)

def wrap_text(text, font, max_width):
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = font.getbbox(test)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def compose(data):
    W, H = 1080, 1080
    
    # ── Load background ──────────────────────────────────────────────────────
    bg_img = None
    tmp_files = []
    
    if data.get("background_url"):
        try:
            bg_img, tmp_path = download_image(data["background_url"])
            tmp_files.append(tmp_path)
            # Crop to square 1080x1080
            bg_img = bg_img.resize((W, H), Image.LANCZOS)
        except Exception as e:
            print(f"[compositor] Background download failed: {e}", file=sys.stderr)
    
    if bg_img is None:
        # Fallback: dark blue gradient
        bg_img = Image.new("RGBA", (W, H), (26, 58, 92, 255))
    
    canvas = bg_img.copy().convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # ── Dark gradient overlay (bottom 55%) ───────────────────────────────────
    gradient_start = int(H * 0.42)
    for y in range(gradient_start, H):
        alpha = int(220 * ((y - gradient_start) / (H - gradient_start)) ** 0.7)
        draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    
    # ── Badge (top right) ────────────────────────────────────────────────────
    badge_text = data.get("badge", "")
    if badge_text:
        font_badge = get_font(FONT_BOLD, 22)
        bbox = font_badge.getbbox(badge_text)
        bw = bbox[2] - bbox[0] + 40
        bh = 44
        bx = W - bw - 24
        by = 24
        draw_rounded_rect(draw, (bx, by, bx + bw, by + bh), 8, (212, 175, 55, 240))
        draw.text((bx + bw // 2, by + bh // 2), badge_text,
                  font=font_badge, fill=(20, 20, 20, 255), anchor="mm")
    
    # ── Headline ─────────────────────────────────────────────────────────────
    headline = data.get("headline", "")
    font_headline = get_font(FONT_BOLD, 68)
    font_headline_sm = get_font(FONT_BOLD, 56)
    
    headline_lines = wrap_text(headline, font_headline, W - 80)
    if len(headline_lines) > 3:
        headline_lines = wrap_text(headline, font_headline_sm, W - 80)
    
    line_h = 76
    total_headline_h = len(headline_lines) * line_h
    
    # ── Subheadline ──────────────────────────────────────────────────────────
    subheadline = data.get("subheadline", "")
    font_sub = get_font(FONT_REGULAR, 28)
    sub_lines = wrap_text(subheadline, font_sub, W - 120) if subheadline else []
    sub_line_h = 38
    total_sub_h = len(sub_lines) * sub_line_h
    
    # ── CTA button ───────────────────────────────────────────────────────────
    cta_text = data.get("cta", "DAFTAR SEKARANG")
    font_cta = get_font(FONT_BOLD, 26)
    cta_bbox = font_cta.getbbox(cta_text + "  →")
    cta_w = min(cta_bbox[2] - cta_bbox[0] + 80, 560)
    cta_h = 62
    
    # ── Layout: stack from bottom up ─────────────────────────────────────────
    copyright_y = H - 22
    font_copy = get_font(FONT_REGULAR, 15)
    
    cta_center_y = H - 90
    sub_bottom = cta_center_y - cta_h // 2 - 20
    sub_top = sub_bottom - total_sub_h
    headline_bottom = sub_top - 18
    headline_top = headline_bottom - total_headline_h
    
    # Draw text shadow for headline
    for i, line in enumerate(headline_lines):
        y = headline_top + i * line_h + line_h // 2
        # Shadow
        draw.text((W // 2 + 2, y + 2), line, font=font_headline,
                  fill=(0, 0, 0, 160), anchor="mm")
        # Main text
        draw.text((W // 2, y), line, font=font_headline,
                  fill=(255, 255, 255, 255), anchor="mm")
    
    # Draw subheadline
    for i, line in enumerate(sub_lines):
        y = sub_top + i * sub_line_h + sub_line_h // 2
        draw.text((W // 2, y), line, font=font_sub,
                  fill=(240, 240, 240, 230), anchor="mm")
    
    # Draw CTA button
    cta_x = W // 2 - cta_w // 2
    cta_y = cta_center_y - cta_h // 2
    draw_rounded_rect(draw, (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h), 31, (230, 57, 70, 255))
    draw.text((W // 2, cta_center_y), cta_text + "  →",
              font=font_cta, fill=(255, 255, 255, 255), anchor="mm")
    
    # Draw copyright bar
    copyright_text = data.get("copyright", "© 2026 SpecTa Education | spectaeducation.com | @spectaeducation")
    draw.rectangle([(0, H - 42), (W, H)], fill=(0, 0, 0, 180))
    draw.text((W // 2, copyright_y), copyright_text,
              font=font_copy, fill=(200, 200, 200, 255), anchor="mm")
    
    # ── Composite overlay onto canvas ────────────────────────────────────────
    canvas = Image.alpha_composite(canvas, overlay)
    
    # ── Composite SpecTa logo ─────────────────────────────────────────────────
    logo_url = data.get("logo_url", "")
    if logo_url:
        try:
            logo_img, tmp_path = download_image(logo_url)
            tmp_files.append(tmp_path)
            # Resize logo to max 180px wide, maintain aspect ratio
            logo_w, logo_h = logo_img.size
            target_w = 180
            target_h = int(logo_h * (target_w / logo_w))
            if target_h > 90:
                target_h = 90
                target_w = int(logo_w * (target_h / logo_h))
            logo_img = logo_img.resize((target_w, target_h), Image.LANCZOS)
            
            # Add subtle white background pad for visibility
            pad = 10
            bg_pad = Image.new("RGBA", (target_w + pad*2, target_h + pad*2), (255, 255, 255, 200))
            bg_pad.paste(logo_img, (pad, pad), logo_img if logo_img.mode == "RGBA" else None)
            
            # Round corners on logo bg
            logo_x, logo_y = 20, 20
            canvas.paste(bg_pad, (logo_x, logo_y), bg_pad)
        except Exception as e:
            print(f"[compositor] Logo overlay failed: {e}", file=sys.stderr)
    
    # ── Save output ───────────────────────────────────────────────────────────
    output_path = data["output_path"]
    canvas.convert("RGB").save(output_path, "JPEG", quality=92)
    
    # Cleanup temp files
    for f in tmp_files:
        try:
            os.unlink(f)
        except Exception:
            pass
    
    return {"success": True, "output_path": output_path}

if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        result = compose(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
