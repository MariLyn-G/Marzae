#!/usr/bin/env python3
"""Render a 1080x1920 Instagram Reels cover from a JSON spec.

Usage:
    python3 render.py spec.json out.png [--preview]

--preview also writes out.preview.png with the 3:4 profile-grid crop and the
Reels UI overlay zones drawn on top, so you can check nothing important sits
under the caption bar or gets cut from the grid tile.

The spec format is documented in SKILL.md. Paths inside the spec resolve
relative to the spec file.
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FONTS = {
    "montserrat": HERE / "fonts" / "Montserrat-Variable.ttf",
    "anton": HERE / "fonts" / "Anton-Regular.ttf",
    "bebas": HERE / "fonts" / "BebasNeue-Regular.ttf",
}

W, H = 1080, 1920
# Instagram profile grid shows a 3:4 crop (1080x1440) centred on the cover.
GRID_TOP, GRID_BOTTOM = (H - 1440) // 2, (H + 1440) // 2
# Areas the Reels player covers with UI.
UI_BOTTOM = 420  # caption, username, audio
UI_RIGHT = 150   # like / comment / share column


def rgba(color, opacity=1.0):
    color = color.lstrip("#")
    if len(color) == 3:
        color = "".join(c * 2 for c in color)
    r, g, b = (int(color[i:i + 2], 16) for i in (0, 2, 4))
    a = int(color[6:8], 16) if len(color) == 8 else 255
    return (r, g, b, int(a * opacity))


def font(name, size, weight=900):
    f = ImageFont.truetype(str(FONTS[name]), size)
    if name == "montserrat":
        f.set_variation_by_axes([weight])
    return f


def cover_fit(img, w, h, focus=(0.5, 0.5)):
    scale = max(w / img.width, h / img.height)
    img = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
    left = int((img.width - w) * focus[0])
    top = int((img.height - h) * focus[1])
    return img.crop((left, top, left + w, top + h))


def drop_shadow(layer, blur=18, opacity=0.55, offset=(0, 8), color="#000000"):
    """Return a shadow image for an RGBA layer, same size as the layer."""
    alpha = layer.getchannel("A").point(lambda a: int(a * opacity))
    shadow = Image.new("RGBA", layer.size, rgba(color))
    shadow.putalpha(alpha)
    shadow = ImageChops.offset(shadow, *offset)
    return shadow.filter(ImageFilter.GaussianBlur(blur))


def paste_with_shadow(canvas, layer, shadow):
    if shadow:
        canvas.alpha_composite(drop_shadow(layer, **shadow))
    canvas.alpha_composite(layer)


# ---------- backgrounds ----------

def build_background(spec, base):
    bg = spec.get("background", {})
    canvas = Image.new("RGBA", (W, H), rgba(bg.get("color", "#1a1a1a")))
    if "image" in bg:
        img = Image.open(base / bg["image"]).convert("RGBA")
        img = cover_fit(img, W, H, tuple(bg.get("focus", (0.5, 0.5))))
        if bg.get("blur"):
            img = img.filter(ImageFilter.GaussianBlur(bg["blur"]))
        if bg.get("brightness", 1) != 1:
            img = ImageEnhance.Brightness(img).enhance(bg["brightness"])
        if bg.get("saturation", 1) != 1:
            img = ImageEnhance.Color(img).enhance(bg["saturation"])
        canvas.alpha_composite(img)

    wash = spec.get("wash")
    if wash:
        canvas.alpha_composite(linear_gradient(wash["colors"], wash.get("direction", "horizontal"),
                                               wash.get("opacity", 0.35)))

    for g in spec.get("gradients", []):
        canvas.alpha_composite(edge_fade(g))

    if spec.get("vignette"):
        canvas.alpha_composite(vignette(spec["vignette"]))
    return canvas


def linear_gradient(colors, direction, opacity):
    stops = [rgba(c, opacity) for c in colors]
    length = W if direction == "horizontal" else H
    strip = Image.new("RGBA", (length, 1))
    for i in range(length):
        t = i / (length - 1) * (len(stops) - 1)
        k = min(int(t), len(stops) - 2)
        f = t - k
        strip.putpixel((i, 0), tuple(int(stops[k][j] + (stops[k + 1][j] - stops[k][j]) * f) for j in range(4)))
    if direction == "horizontal":
        return strip.resize((W, H))
    return strip.rotate(-90, expand=True).resize((W, H))


def edge_fade(g):
    """Darken (or tint) from one edge: {"edge": "bottom", "height": 0.45, "color": "#000", "opacity": 0.75}."""
    size = int((H if g.get("edge", "bottom") in ("top", "bottom") else W) * g.get("height", 0.4))
    col = rgba(g.get("color", "#000000"))
    ramp = Image.linear_gradient("L").resize((W, size))  # 0 at top, 255 at bottom
    ramp = ramp.point(lambda a: int(a * g.get("opacity", 0.7)))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    block = Image.new("RGBA", (W, size), col[:3] + (0,))
    edge = g.get("edge", "bottom")
    if edge == "bottom":
        block.putalpha(ramp)
        layer.paste(block, (0, H - size))
    elif edge == "top":
        block.putalpha(ramp.transpose(Image.FLIP_TOP_BOTTOM))
        layer.paste(block, (0, 0))
    else:
        r = Image.linear_gradient("L").rotate(90, expand=True).resize((size, H))
        r = r.point(lambda a: int(a * g.get("opacity", 0.7)))
        block = Image.new("RGBA", (size, H), col[:3] + (0,))
        block.putalpha(r if edge == "left" else r.transpose(Image.FLIP_LEFT_RIGHT))
        layer.paste(block, (0, 0) if edge == "left" else (W - size, 0))
    return layer


def vignette(strength):
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((-W * 0.25, -H * 0.1, W * 1.25, H * 1.1), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(220))
    inv = ImageChops.invert(mask).point(lambda a: int(a * strength))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(inv)
    return layer


# ---------- subject ----------

def draw_subject(canvas, s, base):
    img = Image.open(base / s["image"]).convert("RGBA")
    height = s.get("height", 1150)
    img = img.resize((int(img.width * height / img.height), height), Image.LANCZOS)
    cx, bottom = s.get("cx", W // 2), s.get("bottom", H)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(img, (cx - img.width // 2, bottom - img.height), img)
    if s.get("rim"):
        # Thin light outline that separates the cutout from a busy background.
        alpha = layer.getchannel("A").filter(ImageFilter.MaxFilter(s.get("rim_width", 9)))
        rim = Image.new("RGBA", (W, H), rgba(s["rim"], s.get("rim_opacity", 0.9)))
        rim.putalpha(ImageChops.multiply(alpha, Image.new("L", (W, H), int(255 * s.get("rim_opacity", 0.9)))))
        canvas.alpha_composite(rim.filter(ImageFilter.GaussianBlur(2)))
    paste_with_shadow(canvas, layer, s.get("shadow", {"blur": 30, "opacity": 0.45, "offset": (0, 14)}))


# ---------- elements ----------

def fit_font(el):
    name, weight = el.get("font", "montserrat"), el.get("weight", 900)
    size = el.get("size", 160)
    lines = el["text"].split("\n")
    max_w = el.get("max_width", W - 120)
    while size > 20:
        f = font(name, size, weight)
        widest = max(f.getbbox(line)[2] - f.getbbox(line)[0] for line in lines)
        if widest <= max_w:
            return f, lines
        size -= 4
    return font(name, size, weight), lines


def brush_shape(draw, box, color, seed):
    """Paint-stroke highlight behind a word, like the blue swipe in reference 02."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    pts_top, pts_bot = [], []
    steps = 24
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        pts_top.append((x, y0 + rnd.uniform(-6, 10)))
        pts_bot.append((x, y1 + rnd.uniform(-10, 6)))
    left = [(x0 - rnd.uniform(10, 30), y0 + (y1 - y0) * t) for t in (0.8, 0.5, 0.2)]
    right = [(x1 + rnd.uniform(10, 40), y0 + (y1 - y0) * t) for t in (0.2, 0.5, 0.8)]
    draw.polygon(pts_top + right + pts_bot[::-1] + left, fill=color)
    # Dry-brush streaks along the stroke.
    for _ in range(14):
        y = rnd.uniform(y0, y1)
        xs = rnd.uniform(x0 - 20, x0 + 40)
        draw.line((xs, y, xs + rnd.uniform(60, 200), y + rnd.uniform(-3, 3)), fill=color, width=rnd.randint(2, 5))


def draw_text(canvas, el):
    f, lines = fit_font(el)
    spacing = el.get("line_spacing", 1.0)
    ascent, descent = f.getmetrics()
    line_h = int((ascent + descent) * spacing)
    pad_x, pad_y = el.get("box", {}).get("pad", (32, 14)) if "box" in el else (0, 0)
    gap = el.get("box", {}).get("gap", 10) if "box" in el else 0

    layer = Image.new("RGBA", (W * 2, H * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ox, oy = W // 2, H // 2  # draw in the middle of an oversized layer so rotation does not clip
    anchor_x = el.get("x", W // 2)
    align = el.get("align", "center")
    y = 0
    color = rgba(el.get("color", "#ffffff"))
    for i, line in enumerate(lines):
        bb = f.getbbox(line)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        if align == "center":
            x = anchor_x - tw / 2
        elif align == "left":
            x = anchor_x
        else:
            x = anchor_x - tw
        tx, ty = ox + x - bb[0], oy + y + pad_y
        glyph_box = (ox + x, ty + bb[1], ox + x + tw, ty + bb[3])

        line_color = rgba(el["colors"][i]) if "colors" in el and i < len(el["colors"]) else color
        boxed = "box" in el and (el["box"].get("lines") is None or i in el["box"]["lines"])
        brushed = "brush" in el and (el["brush"].get("lines") is None or i in el["brush"]["lines"])
        if boxed:
            b = el["box"]
            d.rounded_rectangle((glyph_box[0] - pad_x, glyph_box[1] - pad_y, glyph_box[2] + pad_x, glyph_box[3] + pad_y),
                                radius=b.get("radius", 18), fill=rgba(b["color"]))
            if "text_color" in b:
                line_color = rgba(b["text_color"])
        if brushed:
            brush_shape(d, (glyph_box[0] - 30, glyph_box[1] - 18, glyph_box[2] + 30, glyph_box[3] + 18),
                        rgba(el["brush"]["color"]), seed=i + 7)
        stroke = el.get("stroke", {})
        d.text((tx, ty), line, font=f, fill=line_color,
               stroke_width=stroke.get("width", 0), stroke_fill=rgba(stroke.get("color", "#000000")))
        if "underline" in el and (el["underline"].get("lines") is None or i in el["underline"]["lines"]):
            u = el["underline"]
            uy = glyph_box[3] + u.get("offset", 22)
            ux0 = glyph_box[0] + tw * u.get("start", 0.0)
            ux1 = glyph_box[0] + tw * u.get("end", 1.0)
            for k in range(u.get("strokes", 2)):
                pts = [(ux0 + (ux1 - ux0) * t, uy + k * u.get("width", 12) * 1.4 - math.sin(t * math.pi) * 10 + t * 6)
                       for t in [j / 30 for j in range(31)]]
                d.line(pts, fill=rgba(u.get("color", "#E53935")), width=u.get("width", 12), joint="curve")
        y += line_h + (2 * pad_y + gap if boxed else 0)

    total_h = y
    v = el.get("valign", "top")
    shift = {"top": 0, "middle": -total_h // 2, "bottom": -total_h}[v]
    if el.get("rotate"):
        layer = layer.rotate(el["rotate"], resample=Image.BICUBIC,
                             center=(ox + anchor_x, oy + total_h / 2))
    layer = layer.crop((ox, oy - el.get("y", 0) - shift, ox + W, oy - el.get("y", 0) - shift + H))
    paste_with_shadow(canvas, layer, el.get("shadow", {"blur": 16, "opacity": 0.6, "offset": (0, 8)}))


def rounded_mask(size, radius_frac):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=int(min(size) * radius_frac), fill=255)
    return m


def draw_image(canvas, el, base):
    img = Image.open(base / el["src"]).convert("RGBA")
    w = el.get("w", 300)
    img = img.resize((w, int(img.height * w / img.width)), Image.LANCZOS)
    if el.get("radius"):
        img.putalpha(ImageChops.multiply(img.getchannel("A"), rounded_mask(img.size, el["radius"])))
    if el.get("rotate"):
        img = img.rotate(el["rotate"], resample=Image.BICUBIC, expand=True)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(img, (el["cx"] - img.width // 2, el["cy"] - img.height // 2), img)
    paste_with_shadow(canvas, layer, el.get("shadow", {"blur": 24, "opacity": 0.5, "offset": (0, 14)}))


def draw_badge(canvas, el):
    """App-icon style tile: rounded square, fill colour, one glyph or short word."""
    size = el.get("w", 260)
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.24), fill=rgba(el.get("color", "#D97757")))
    # Soft top highlight for the glossy 3D look in reference 03.
    hi = Image.linear_gradient("L").transpose(Image.FLIP_TOP_BOTTOM).resize((size, size)).point(lambda a: int(a * 0.25))
    gloss = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    gloss.putalpha(ImageChops.multiply(hi, rounded_mask((size, size), 0.24)))
    tile.alpha_composite(gloss)
    f = font(el.get("font", "montserrat"), int(size * el.get("text_scale", 0.42)), el.get("weight", 800))
    d.text((size / 2, size / 2), el.get("text", ""), font=f, fill=rgba(el.get("text_color", "#ffffff")), anchor="mm")
    el = dict(el, w=size)
    tmp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    t = tile.rotate(el.get("rotate", 0), resample=Image.BICUBIC, expand=True)
    tmp.paste(t, (el["cx"] - t.width // 2, el["cy"] - t.height // 2), t)
    paste_with_shadow(canvas, tmp, el.get("shadow", {"blur": 24, "opacity": 0.5, "offset": (0, 14)}))


def draw_arrow(canvas, el):
    """Dashed curved arrow, like the icon-to-price arrow in reference 03."""
    (x0, y0), (x1, y1) = el["from"], el["to"]
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    nx, ny = -(y1 - y0), (x1 - x0)
    bend = el.get("bend", 0.35)
    cx, cy = mx + nx * bend, my + ny * bend
    pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
            (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1) for t in [i / 400 for i in range(401)]]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    col, width = rgba(el.get("color", "#ffffff")), el.get("width", 10)
    dash, gap = el.get("dash", (30, 20))
    # Stamp round dots along the curve: thick polylines in PIL leave jagged joins.
    r = width / 2
    run, on = 0.0, True
    for a, b in zip(pts, pts[1:]):
        run += math.dist(a, b)
        if on:
            d.ellipse((b[0] - r, b[1] - r, b[0] + r, b[1] + r), fill=col)
        if run >= (dash if on else gap):
            on, run = not on, 0.0
    # Arrow head along the final tangent.
    (ax, ay), (bx, by) = pts[-12], pts[-1]
    ang = math.atan2(by - ay, bx - ax)
    head = el.get("head", 44)
    for s in (-1, 1):
        d.line((bx, by, bx - head * math.cos(ang + s * 0.5), by - head * math.sin(ang + s * 0.5)), fill=col, width=width)
    paste_with_shadow(canvas, layer, el.get("shadow", {"blur": 8, "opacity": 0.5, "offset": (0, 4)}))


def draw_steps(canvas, el):
    """Numbered milestones on a line that shifts colour, like reference 04."""
    pts = [tuple(p) for p in el["points"]]
    colors = [rgba(c) for c in el.get("colors", ["#E53935", "#FB8C00", "#FDD835", "#7CB342", "#43A047"])]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    n = len(pts)

    def color_at(t):
        t = t * (len(colors) - 1)
        k = min(int(t), len(colors) - 2)
        f = t - k
        return tuple(int(colors[k][j] + (colors[k + 1][j] - colors[k][j]) * f) for j in range(4))

    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        for s in range(20):
            p = (a[0] + (b[0] - a[0]) * s / 20, a[1] + (b[1] - a[1]) * s / 20)
            q = (a[0] + (b[0] - a[0]) * (s + 1) / 20, a[1] + (b[1] - a[1]) * (s + 1) / 20)
            d.line((p, q), fill=color_at((i + s / 20) / (n - 1)), width=el.get("width", 14))
    r = el.get("radius", 34)
    f = font("montserrat", int(r * 1.2), 800)
    for i, (x, y) in enumerate(pts):
        if i in el.get("hide", []):
            continue
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 255), outline=(20, 20, 20, 255), width=5)
        d.text((x, y), str(el.get("start", 1) + i), font=f, fill=(20, 20, 20, 255), anchor="mm")
    paste_with_shadow(canvas, layer, el.get("shadow", {"blur": 10, "opacity": 0.45, "offset": (0, 5)}))


def draw_element(canvas, el, base):
    kind = el["type"]
    if kind == "text":
        draw_text(canvas, el)
    elif kind == "image":
        draw_image(canvas, el, base)
    elif kind == "badge":
        draw_badge(canvas, el)
    elif kind == "arrow":
        draw_arrow(canvas, el)
    elif kind == "steps":
        draw_steps(canvas, el)
    else:
        raise ValueError(f"unknown element type: {kind}")


def preview(img):
    p = img.convert("RGBA")
    over = Image.new("RGBA", p.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rectangle((0, 0, W, GRID_TOP), fill=(255, 0, 0, 70))
    d.rectangle((0, GRID_BOTTOM, W, H), fill=(255, 0, 0, 70))
    d.rectangle((0, H - UI_BOTTOM, W, H), outline=(255, 220, 0, 255), width=6)
    d.rectangle((W - UI_RIGHT, H * 0.45, W, H - UI_BOTTOM), outline=(255, 220, 0, 255), width=6)
    d.rectangle((0, GRID_TOP, W - 1, GRID_BOTTOM), outline=(0, 255, 120, 255), width=6)
    f = font("montserrat", 34, 700)
    d.text((20, GRID_TOP + 12), "3:4 profile grid crop", font=f, fill=(0, 255, 120, 255))
    d.text((20, H - UI_BOTTOM + 12), "Reels caption / username", font=f, fill=(255, 220, 0, 255))
    p.alpha_composite(over)
    return p


def render(spec_path, out_path, with_preview=False):
    spec_path = Path(spec_path)
    spec = json.loads(spec_path.read_text())
    base = spec_path.parent
    canvas = build_background(spec, base)
    elements = spec.get("elements", [])
    for el in elements:
        if el.get("layer") == "back":
            draw_element(canvas, el, base)
    if "subject" in spec:
        draw_subject(canvas, spec["subject"], base)
    for el in elements:
        if el.get("layer") != "back":
            draw_element(canvas, el, base)
    out = canvas.convert("RGB")
    out.save(out_path, quality=95)
    if with_preview:
        stem = Path(out_path)
        preview(out).convert("RGB").save(stem.with_name(stem.stem + ".preview.png"))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    render(sys.argv[1], sys.argv[2], "--preview" in sys.argv)
