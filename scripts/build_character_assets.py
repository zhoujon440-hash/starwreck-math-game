#!/usr/bin/env python3
"""Deterministically extract Issue #8 runtime character assets from V2.1 artboards.

This is intentionally a mechanical extraction pipeline.  It does not call an
image-generation service and does not synthesize a new character design.
"""

from __future__ import annotations

from collections import deque
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import json
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "source_packages/originals-or-release-links/星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip"
ENTRY = "星骸拾荒者_人物形象设计全集_V2.1_补齐版/01_十二星球人物三视图/G02_锈环星_人物三视图.png"
PACKAGE_SHA256 = "a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb"
ENTRY_SHA256 = "c549fe94157daea3606a1b7b32562e28108c9e54f2dac1b156b38c8097c0a0b3"
CANVAS = 2048

XINGYU_STATES = ("normal", "alert", "thinking", "nervous", "determined")
QIMA_STATES = (
    "offline",
    "damaged",
    "booting",
    "normal",
    "question",
    "warning",
    "proud",
    "awkward",
    "scanning",
)


def digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def source_board() -> Image.Image:
    raw = PACKAGE.read_bytes()
    if digest(raw) != PACKAGE_SHA256:
        raise RuntimeError("PKG-CHARACTERS-V2.1 SHA-256 mismatch")
    with zipfile.ZipFile(BytesIO(raw)) as archive:
        entry = archive.read(ENTRY)
    if digest(entry) != ENTRY_SHA256:
        raise RuntimeError("G02 character artboard SHA-256 mismatch")
    return Image.open(BytesIO(entry)).convert("RGB")


def polygon_mask(
    crop: Image.Image,
    outer: list[tuple[int, int]],
    holes: list[list[tuple[int, int]]],
    force_foreground: list[list[tuple[int, int]]] | None = None,
) -> Image.Image:
    """Combine a hand-audited silhouette with conservative paper flood removal."""
    geometric = Image.new("L", crop.size, 0)
    draw = ImageDraw.Draw(geometric)
    draw.polygon(outer, fill=255)
    for hole in holes:
        draw.polygon(hole, fill=0)

    rgb = np.asarray(crop.convert("RGB")).astype(np.float32)
    geo = np.asarray(geometric) > 0
    border = np.concatenate(
        (
            rgb[:20].reshape(-1, 3),
            rgb[-10:].reshape(-1, 3),
            rgb[:, :8].reshape(-1, 3),
            rgb[:, -8:].reshape(-1, 3),
        )
    )
    border = border[border.mean(axis=1) > 150]
    paper = np.median(border, axis=0)
    distance = np.sqrt(((rgb - paper) ** 2).sum(axis=2))
    paper_candidate = (distance < 35) & (rgb.mean(axis=2) > 105)

    height, width = paper_candidate.shape
    exterior = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        for y in (0, height - 1):
            if paper_candidate[y, x] and not exterior[y, x]:
                exterior[y, x] = True
                queue.append((y, x))
    for y in range(height):
        for x in (0, width - 1):
            if paper_candidate[y, x] and not exterior[y, x]:
                exterior[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for yy in range(max(0, y - 1), min(height, y + 2)):
            for xx in range(max(0, x - 1), min(width, x + 2)):
                if paper_candidate[yy, xx] and not exterior[yy, xx]:
                    exterior[yy, xx] = True
                    queue.append((yy, xx))

    result = geo & ~exterior
    if force_foreground:
        forced = Image.new("L", crop.size, 0)
        forced_draw = ImageDraw.Draw(forced)
        for shape in force_foreground:
            forced_draw.polygon(shape, fill=255)
        result |= np.asarray(forced) > 0

    # Drop disconnected board typography and retain meaningful character pieces.
    seen = np.zeros_like(result)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if not result[y, x] or seen[y, x]:
                continue
            points: list[tuple[int, int]] = []
            seen[y, x] = True
            queue.append((y, x))
            while queue:
                yy, xx = queue.popleft()
                points.append((yy, xx))
                for ny in range(max(0, yy - 1), min(height, yy + 2)):
                    for nx in range(max(0, xx - 1), min(width, xx + 2)):
                        if result[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((ny, nx))
            components.append(points)
    components.sort(key=len, reverse=True)
    clean = np.zeros_like(result)
    if components:
        main = components[0]
        for y, x in main:
            clean[y, x] = True
        # Forced thin parts connect to the main silhouette. Other components are
        # board typography, cast shadows, or adjacent-panel fragments.
    # Pull the hard silhouette one source pixel inward, then feather only the
    # resulting sub-pixel boundary. This removes the scanned paper fringe while
    # retaining the deliberately forced antenna shapes.
    alpha = Image.fromarray((clean * 255).astype(np.uint8), "L")
    return alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.55))


def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA")).astype(np.float32)
    alpha = rgba[:, :, 3:4] / 255.0
    premultiplied = np.concatenate((rgba[:, :, :3] * alpha, rgba[:, :, 3:4]), axis=2)
    channels: list[np.ndarray] = []
    for index in range(4):
        channel = Image.fromarray(premultiplied[:, :, index], mode="F")
        channels.append(np.asarray(channel.resize(size, Image.Resampling.LANCZOS)))
    out_alpha = channels[3]
    safe_alpha = np.maximum(out_alpha / 255.0, 1e-5)
    out_rgb = np.stack(channels[:3], axis=2) / safe_alpha[:, :, None]
    output = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    output[:, :, :3] = np.clip(out_rgb, 0, 255).astype(np.uint8)
    output[:, :, 3] = np.clip(out_alpha, 0, 255).astype(np.uint8)
    output[output[:, :, 3] == 0, :3] = 0
    return Image.fromarray(output, "RGBA")


def normalized_cutout(
    board: Image.Image,
    crop_box: tuple[int, int, int, int],
    outer: list[tuple[int, int]],
    holes: list[list[tuple[int, int]]],
    target_height: int,
    force_foreground: list[list[tuple[int, int]]] | None = None,
) -> tuple[Image.Image, dict[str, float]]:
    crop = board.crop(crop_box)
    mask = polygon_mask(crop, outer, holes, force_foreground)
    rgba = crop.convert("RGBA")
    rgba.putalpha(mask)
    bounds = mask.getbbox()
    if not bounds:
        raise RuntimeError("empty character mask")
    trimmed = rgba.crop(bounds)
    width = round(trimmed.width * target_height / trimmed.height)
    resized = premultiplied_resize(trimmed, (width, target_height))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset = ((CANVAS - width) // 2, (CANVAS - target_height) // 2)
    canvas.alpha_composite(resized, offset)
    mapping = {
        "crop_x": crop_box[0],
        "crop_y": crop_box[1],
        "trim_x": bounds[0],
        "trim_y": bounds[1],
        "scale": target_height / trimmed.height,
        "offset_x": offset[0],
        "offset_y": offset[1],
    }
    return canvas, mapping


def mapped(mapping: dict[str, float], x: float, y: float) -> tuple[int, int]:
    return (
        round(mapping["offset_x"] + (x - mapping["trim_x"]) * mapping["scale"]),
        round(mapping["offset_y"] + (y - mapping["trim_y"]) * mapping["scale"]),
    )


def glow_layer(center: tuple[int, int], radius: int, strength: int) -> Image.Image:
    layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    pixels = np.asarray(layer).copy()
    yy, xx = np.ogrid[:CANVAS, :CANVAS]
    distance = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2)
    alpha = np.clip(1 - distance / radius, 0, 1) ** 2 * strength
    pixels[:, :, 0] = 24
    pixels[:, :, 1] = 230
    pixels[:, :, 2] = 241
    pixels[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(pixels, "RGBA")


def rotate_and_shift(image: Image.Image, angle: float, x: int = 0, y: int = 0) -> Image.Image:
    rotated = image.rotate(angle, Image.Resampling.BICUBIC, expand=False, fillcolor=(0, 0, 0, 0))
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(rotated, (x, y))
    return result


def xingyu_states(base: Image.Image, mapping: dict[str, float]) -> dict[str, Image.Image]:
    eye = mapped(mapping, 92, 60)
    mouth = mapped(mapping, 65, 75)
    states: dict[str, Image.Image] = {}
    specs = {
        "normal": (0.0, 0, 0, 48, "smile"),
        "alert": (-0.8, 10, 1, 110, "open"),
        "thinking": (0.7, -7, 4, 68, "flat"),
        "nervous": (-0.45, -4, 8, 36, "wave"),
        "determined": (0.25, 5, -3, 86, "firm"),
    }
    for state, (angle, dx, dy, strength, expression) in specs.items():
        image = base.copy()
        if state != "normal":
            draw = ImageDraw.Draw(image)
            face = (211, 181, 143, 255)
            radius_x, radius_y = 34, 22
            draw.ellipse(
                (mouth[0] - radius_x, mouth[1] - radius_y, mouth[0] + radius_x, mouth[1] + radius_y),
                fill=face,
            )
            ink = (78, 48, 29, 255)
            if expression == "open":
                draw.ellipse((mouth[0] - 11, mouth[1] - 7, mouth[0] + 11, mouth[1] + 15), outline=ink, width=7)
            elif expression == "flat":
                draw.line((mouth[0] - 24, mouth[1] + 3, mouth[0] + 22, mouth[1] - 2), fill=ink, width=7)
            elif expression == "wave":
                draw.arc((mouth[0] - 26, mouth[1] - 3, mouth[0], mouth[1] + 16), 200, 350, fill=ink, width=6)
                draw.arc((mouth[0], mouth[1] - 3, mouth[0] + 26, mouth[1] + 16), 190, 340, fill=ink, width=6)
            elif expression == "firm":
                draw.line((mouth[0] - 23, mouth[1] + 4, mouth[0] + 23, mouth[1] + 4), fill=ink, width=7)
        image.alpha_composite(glow_layer(eye, 150, strength))
        states[state] = rotate_and_shift(image, angle, dx, dy)
    return states


def qima_screen_layer(mapping: dict[str, float], state: str) -> Image.Image:
    layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    left, top = mapped(mapping, 28, 55)
    right, bottom = mapped(mapping, 84, 102)
    inset = round(9 * mapping["scale"])
    box = (left + inset, top + inset, right - inset, bottom - inset)
    draw.rounded_rectangle(box, radius=round(9 * mapping["scale"]), fill=(4, 19, 18, 252))
    cyan = (91, 244, 221, 255)
    dim = (45, 112, 105, 160)
    cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
    unit = max(8, round(2.2 * mapping["scale"]))

    def line(points: tuple[int, ...], fill=cyan, width=unit) -> None:
        draw.line(points, fill=fill, width=width, joint="curve")

    if state == "offline":
        draw.rectangle((box[0] + unit, cy, box[2] - unit, cy + unit), fill=(37, 58, 54, 95))
    elif state == "booting":
        segments = 7
        width = (box[2] - box[0] - unit * 4) // segments
        for index in range(segments):
            x = box[0] + unit * 2 + index * width
            draw.rectangle((x, cy, x + width - unit, cy + unit * 2), fill=cyan if index < 5 else dim)
        draw.rectangle((cx - unit, cy - unit * 7, cx + unit, cy - unit * 3), fill=cyan)
    elif state == "question":
        line((cx - unit * 4, cy - unit * 5, cx, cy - unit * 8, cx + unit * 4, cy - unit * 5, cx, cy))
        draw.rectangle((cx - unit, cy + unit * 4, cx + unit, cy + unit * 6), fill=cyan)
    elif state == "warning":
        draw.polygon(
            ((cx, cy - unit * 9), (cx - unit * 9, cy + unit * 7), (cx + unit * 9, cy + unit * 7)),
            outline=cyan,
        )
        draw.rectangle((cx - unit, cy - unit * 3, cx + unit, cy + unit * 2), fill=cyan)
        draw.rectangle((cx - unit, cy + unit * 4, cx + unit, cy + unit * 6), fill=cyan)
    elif state == "proud":
        line((cx - unit * 10, cy - unit * 4, cx - unit * 6, cy - unit * 7, cx - unit * 2, cy - unit * 4))
        line((cx + unit * 2, cy - unit * 4, cx + unit * 6, cy - unit * 7, cx + unit * 10, cy - unit * 4))
        draw.arc((cx - unit * 9, cy - unit, cx + unit * 9, cy + unit * 10), 15, 165, fill=cyan, width=unit)
    elif state == "awkward":
        draw.rectangle((cx - unit * 9, cy - unit * 5, cx - unit * 6, cy - unit * 2), fill=cyan)
        draw.rectangle((cx + unit * 6, cy - unit * 5, cx + unit * 9, cy - unit * 2), fill=cyan)
        line((cx - unit * 7, cy + unit * 5, cx - unit * 2, cy + unit * 2, cx + unit * 3, cy + unit * 5, cx + unit * 8, cy + unit * 2))
        draw.polygon(((cx + unit * 11, cy - unit * 4), (cx + unit * 14, cy), (cx + unit * 10, cy + unit)), fill=cyan)
    elif state == "scanning":
        line((box[0] + unit * 3, cy - unit * 6, box[2] - unit * 3, cy - unit * 6), width=unit // 2 + 2)
        line((box[0] + unit * 3, cy, box[2] - unit * 3, cy), width=unit)
        line((box[0] + unit * 3, cy + unit * 6, box[2] - unit * 3, cy + unit * 6), width=unit // 2 + 2)
        draw.rectangle((cx - unit * 2, cy - unit * 2, cx + unit * 2, cy + unit * 2), outline=cyan, width=unit)
    else:
        # normal and damaged share the official friendly face before damage marks.
        draw.rectangle((cx - unit * 9, cy - unit * 5, cx - unit * 6, cy - unit * 1), fill=cyan)
        draw.rectangle((cx + unit * 6, cy - unit * 5, cx + unit * 9, cy - unit * 1), fill=cyan)
        draw.arc((cx - unit * 9, cy - unit * 1, cx + unit * 9, cy + unit * 9), 10, 170, fill=cyan, width=unit)
        if state == "damaged":
            line((box[0] + unit * 3, box[1] + unit * 2, cx - unit, cy, cx - unit * 5, box[3] - unit), fill=(165, 204, 193, 190), width=max(3, unit // 2))
            line((cx - unit, cy, cx + unit * 5, cy + unit * 3), fill=(165, 204, 193, 190), width=max(3, unit // 2))
    return layer


def qima_states(base: Image.Image, mapping: dict[str, float]) -> tuple[dict[str, Image.Image], Image.Image]:
    states: dict[str, Image.Image] = {}
    scan_effect = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    scan_draw = ImageDraw.Draw(scan_effect)
    left, top = mapped(mapping, 24, 50)
    right, bottom = mapped(mapping, 89, 108)
    scan_draw.rectangle((left, (top + bottom) // 2 - 10, right, (top + bottom) // 2 + 10), fill=(61, 244, 222, 92))
    for state in QIMA_STATES:
        image = base.copy()
        image.alpha_composite(qima_screen_layer(mapping, state))
        if state == "damaged":
            image = rotate_and_shift(image, -1.0, -6, 10)
        elif state == "booting":
            image = rotate_and_shift(image, 0.35, 0, 5)
        elif state == "proud":
            image = rotate_and_shift(image, 0.7, 5, -2)
        elif state == "awkward":
            image = rotate_and_shift(image, -0.55, -5, 6)
        elif state == "scanning":
            image.alpha_composite(scan_effect)
        states[state] = image
    return states, scan_effect


def save_state_images(name: str, states: dict[str, Image.Image]) -> None:
    runtime = ROOT / f"public/assets/characters/{name}"
    runtime.mkdir(parents=True, exist_ok=True)
    for state, image in states.items():
        image.save(runtime / f"{name}_{state}.png", optimize=True)


def labelled_thumbnail(image: Image.Image, label: str, size: tuple[int, int], background: tuple[int, int, int]) -> Image.Image:
    tile = Image.new("RGB", size, background)
    available = (size[0] - 48, size[1] - 92)
    preview = image.copy()
    preview.thumbnail(available, Image.Resampling.LANCZOS)
    x = (size[0] - preview.width) // 2
    y = (size[1] - preview.height) // 2 + 20
    tile.paste(preview, (x, y), preview if preview.mode == "RGBA" else None)
    draw = ImageDraw.Draw(tile)
    draw.rounded_rectangle((16, 14, 16 + max(140, len(label) * 18), 56), radius=10, fill=(13, 21, 24))
    draw.text((30, 23), label, fill=(231, 224, 205), font=font(22))
    return tile


def state_grid(name: str, states: dict[str, Image.Image], columns: int) -> Image.Image:
    tile_size = (560, 700)
    rows = (len(states) + columns - 1) // columns
    grid = Image.new("RGB", (tile_size[0] * columns, tile_size[1] * rows), (28, 37, 40))
    for index, (state, image) in enumerate(states.items()):
        tile = labelled_thumbnail(image, state, tile_size, (28, 37, 40))
        grid.paste(tile, ((index % columns) * tile_size[0], (index // columns) * tile_size[1]))
    return grid


def master_comparison(panel: Image.Image, normal: Image.Image, states: dict[str, Image.Image], title: str) -> Image.Image:
    canvas = Image.new("RGB", (3000, 1800), (21, 29, 32))
    draw = ImageDraw.Draw(canvas)
    draw.text((70, 45), title, fill=(241, 228, 196), font=font(52))
    source = panel.copy()
    source.thumbnail((1370, 970), Image.Resampling.LANCZOS)
    canvas.paste(source, (70, 140))
    runtime = normal.copy()
    runtime.thumbnail((1050, 1050), Image.Resampling.LANCZOS)
    canvas.paste(runtime, (1690 + (1050 - runtime.width) // 2, 90), runtime)
    draw.text((70, 1135), "Frozen V2.1 master panel", fill=(180, 194, 191), font=font(32))
    draw.text((1740, 1135), "Runtime normal / transparent", fill=(180, 194, 191), font=font(32))
    thumb_width = 3000 // len(states)
    for index, (state, image) in enumerate(states.items()):
        thumb = image.copy()
        thumb.thumbnail((thumb_width - 30, 500), Image.Resampling.LANCZOS)
        x = index * thumb_width + (thumb_width - thumb.width) // 2
        canvas.paste(thumb, (x, 1225), thumb)
        draw.text((index * thumb_width + 22, 1738), state, fill=(238, 230, 210), font=font(26))
    return canvas


def edge_check(xingyu: Image.Image, qima: Image.Image, background: tuple[int, int, int], label: str) -> Image.Image:
    canvas = Image.new("RGB", (2400, 1400), background)
    for index, image in enumerate((xingyu, qima)):
        preview = image.copy()
        preview.thumbnail((1000, 1200), Image.Resampling.LANCZOS)
        x = 100 + index * 1200 + (1000 - preview.width) // 2
        y = 120 + (1200 - preview.height) // 2
        canvas.paste(preview, (x, y), preview)
    draw = ImageDraw.Draw(canvas)
    text_color = (245, 239, 222) if sum(background) < 300 else (30, 38, 40)
    draw.text((48, 36), label, fill=text_color, font=font(42))
    return canvas


def write_outputs() -> None:
    board = source_board()
    xingyu_panel = board.crop((0, 0, 486, 420))
    qima_panel = board.crop((486, 0, 970, 420))
    source_dirs = {
        "xingyu": ROOT / "art/source/characters/xingyu",
        "qima": ROOT / "art/source/characters/qima",
    }
    for path in source_dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    xingyu_panel.save(source_dirs["xingyu"] / "g02_master_panel.png", optimize=True)
    qima_panel.save(source_dirs["qima"] / "g02_master_panel.png", optimize=True)
    public_acceptance = ROOT / "public/acceptance/character-assets"
    public_acceptance.mkdir(parents=True, exist_ok=True)
    xingyu_panel.save(public_acceptance / "xingyu_master_panel.png", optimize=True)
    qima_panel.save(public_acceptance / "qima_master_panel.png", optimize=True)

    xingyu_outer = [
        (61, 5), (66, 0), (70, 8), (78, 2), (78, 13), (93, 12), (88, 20), (100, 23),
        (103, 30), (111, 39), (108, 50), (118, 57), (113, 67), (118, 76), (113, 83),
        (107, 86), (102, 98), (98, 103), (110, 105), (111, 113), (117, 119), (122, 126),
        (123, 139), (119, 148), (118, 160), (114, 169), (109, 176), (106, 189),
        (110, 202), (115, 212), (120, 221), (123, 235), (122, 245), (115, 252),
        (105, 254), (96, 252), (89, 251), (82, 250), (75, 251), (70, 258), (60, 258),
        (49, 258), (40, 255), (31, 256), (26, 250), (28, 238), (32, 228), (35, 218),
        (36, 207), (40, 198), (36, 186), (35, 176), (30, 168), (20, 171), (12, 168),
        (7, 160), (7, 148), (4, 140), (5, 127), (2, 120), (6, 112), (10, 105),
        (16, 100), (20, 102), (24, 96), (21, 87), (16, 83), (15, 74), (18, 65),
        (16, 57), (20, 48), (26, 43), (29, 36), (39, 33), (36, 28), (45, 21),
        (48, 14), (57, 14),
    ]
    xingyu_holes = [[
        (57, 170), (78, 170), (78, 194), (73, 207), (75, 221), (78, 235),
        (76, 248), (72, 264), (62, 264), (58, 248), (58, 229), (56, 207), (60, 192),
    ]]
    qima_outer = [
        (23, 4), (29, 5), (32, 10), (31, 15), (35, 22), (38, 31), (38, 39), (46, 39),
        (48, 43), (61, 43), (64, 39), (69, 27), (72, 19), (77, 13), (77, 8), (82, 4),
        (89, 5), (92, 10), (91, 14), (86, 17), (82, 16), (78, 20), (75, 29), (71, 41),
        (80, 43), (83, 47), (91, 46), (95, 51), (100, 58), (100, 66), (106, 71),
        (108, 84), (106, 96), (101, 102), (99, 109), (100, 117), (104, 123),
        (108, 126), (111, 133), (110, 144), (105, 151), (100, 154), (99, 163),
        (103, 171), (106, 177), (104, 184), (94, 187), (85, 186), (77, 183), (70, 184),
        (61, 184), (54, 183), (45, 184), (36, 183), (27, 187), (20, 184), (16, 177),
        (18, 168), (21, 163), (19, 155), (12, 153), (6, 147), (5, 138), (8, 130),
        (13, 126), (17, 125), (18, 115), (15, 108), (13, 103), (10, 98), (8, 89),
        (10, 80), (8, 72), (10, 63), (14, 57), (16, 51), (20, 47), (29, 44),
        (32, 39), (31, 29), (28, 20), (24, 17), (19, 16), (17, 11),
    ]
    qima_holes = [[
        (47, 155), (72, 155), (72, 170), (75, 178), (75, 190),
        (43, 190), (43, 178), (47, 170),
    ]]
    qima_forced = [
        [(23, 7), (28, 8), (31, 17), (35, 27), (39, 39), (38, 45), (35, 39), (32, 28), (28, 18), (22, 15)],
        [(68, 45), (70, 30), (74, 20), (78, 15), (80, 7), (87, 7), (88, 13), (83, 17), (79, 23), (75, 31), (72, 44)],
    ]

    xingyu_base, xingyu_mapping = normalized_cutout(
        board, (95, 125, 225, 395), xingyu_outer, xingyu_holes, 1760
    )
    qima_base, qima_mapping = normalized_cutout(
        board, (495, 145, 615, 335), qima_outer, qima_holes, 1680, qima_forced
    )

    xingyu = xingyu_states(xingyu_base, xingyu_mapping)
    qima, scan_effect = qima_states(qima_base, qima_mapping)
    save_state_images("xingyu", xingyu)
    save_state_images("qima", qima)

    extraction_dirs = {
        "xingyu": ROOT / "art/runtime-extraction/xingyu",
        "qima": ROOT / "art/runtime-extraction/qima",
    }
    for path in extraction_dirs.values():
        (path / "layers").mkdir(parents=True, exist_ok=True)
    xingyu_base.save(extraction_dirs["xingyu"] / "xingyu_base_normalized.png", optimize=True)
    qima_base.save(extraction_dirs["qima"] / "qima_base_normalized.png", optimize=True)
    glow_layer(mapped(xingyu_mapping, 92, 60), 150, 110).save(
        extraction_dirs["xingyu"] / "layers/electronic_eye_glow.png", optimize=True
    )
    qima_screen_layer(qima_mapping, "normal").save(
        extraction_dirs["qima"] / "layers/crt_screen_normal.png", optimize=True
    )
    scan_effect.save(extraction_dirs["qima"] / "layers/scan_effect.png", optimize=True)

    review = ROOT / "docs/review/character-assets"
    review.mkdir(parents=True, exist_ok=True)
    state_grid("xingyu", xingyu, 5).save(review / "xingyu_5_states.png", optimize=True)
    state_grid("qima", qima, 3).save(review / "qima_9_states.png", optimize=True)
    master_comparison(xingyu_panel, xingyu["normal"], xingyu, "Xingyu identity comparison").save(
        review / "xingyu_master_comparison.png", optimize=True
    )
    master_comparison(qima_panel, qima["normal"], qima, "Qima / EDU-0077 identity comparison").save(
        review / "qima_master_comparison.png", optimize=True
    )
    edge_check(xingyu["normal"], qima["normal"], (12, 19, 23), "Transparent edge check / dark").save(
        review / "transparent_edge_dark.png", optimize=True
    )
    edge_check(xingyu["normal"], qima["normal"], (239, 234, 220), "Transparent edge check / light").save(
        review / "transparent_edge_light.png", optimize=True
    )

    extraction_record = {
        "source_package": "PKG-CHARACTERS-V2.1",
        "source_entry": ENTRY,
        "source_sha256": ENTRY_SHA256,
        "package_sha256": PACKAGE_SHA256,
        "method": "audited silhouette mask + conservative paper flood removal + premultiplied Lanczos upscale",
        "canvas": [CANVAS, CANVAS],
        "generation_service_used": False,
        "xingyu_mapping": xingyu_mapping,
        "qima_mapping": qima_mapping,
    }
    for path in source_dirs.values():
        (path / "extraction-record.json").write_text(
            json.dumps(extraction_record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    asset_records = []
    for character, states in (("xingyu", XINGYU_STATES), ("qima", QIMA_STATES)):
        for state in states:
            relative = f"public/assets/characters/{character}/{character}_{state}.png"
            path = ROOT / relative
            with Image.open(path) as runtime_image:
                width, height = runtime_image.size
                mode = runtime_image.mode
            asset_records.append(
                {
                    "character": character,
                    "state": state,
                    "path": relative,
                    "sha256": digest(path.read_bytes()),
                    "width": width,
                    "height": height,
                    "mode": mode,
                    "runtime_asset": True,
                    "runtime_status": "produced_pending_review",
                    "acceptance_status": "pending_project_owner_review",
                }
            )

    provenance = {
        "schema_version": 1,
        "issue": 8,
        "source_package": "PKG-CHARACTERS-V2.1",
        "source_package_filename": PACKAGE.name,
        "source_package_version": "V2.1",
        "source_package_sha256": PACKAGE_SHA256,
        "source_entry": ENTRY,
        "source_entry_sha256": ENTRY_SHA256,
        "baseline_documents": [
            {"path": "docs/baseline/characters/CHAR-001_XINGYU.md", "version": "frozen"},
            {"path": "docs/baseline/characters/CHAR-002_QIMA.md", "version": "frozen"},
            {"path": "docs/baseline/source_text/characters/G-CHAR-01_V1.0.md", "version": "V1.0"},
            {"path": "docs/baseline/source_text/visual/G-S2-CHG-01_V1.0.md", "version": "V1.0"},
            {"path": "docs/baseline/source_text/visual/G-S2-D01_V1.0.md", "version": "V1.0_non_superseded_rules"},
            {"path": "docs/baseline/source_text/animation/G-ANIM-01_V1.0.md", "version": "V1.0"},
        ],
        "extraction_method": "audited silhouette mask, conservative paper flood removal, premultiplied Lanczos upscale, local state-layer compositing",
        "manual_cleanup_steps": [
            "isolated the G02 front-view figures from the formal three-view artboard",
            "removed paper, titles, guides, grid and neighboring cells with audited masks",
            "repaired alpha edges without changing body proportions, clothing or equipment",
            "placed each cutout on a 2048x2048 transparent canvas with safe padding",
        ],
        "generated_or_reconstructed_parts": {
            "xingyu": [
                "local mouth line variants for alert/thinking/nervous/determined",
                "electronic-eye cyan glow intensity layer",
                "sub-degree pose offsets only",
            ],
            "qima": [
                "CRT pixel-expression layers",
                "small screen crack and sub-degree tilt for damaged",
                "independent scanning overlay",
            ],
        },
        "generation_service_used": False,
        "pr5_assets_reused": False,
        "design_sources": [
            {
                "path": "art/source/characters/xingyu/g02_master_panel.png",
                "source_entry": ENTRY,
                "source_sha256": ENTRY_SHA256,
                "runtime_asset": False,
            },
            {
                "path": "art/source/characters/qima/g02_master_panel.png",
                "source_entry": ENTRY,
                "source_sha256": ENTRY_SHA256,
                "runtime_asset": False,
            },
        ],
        "characters": [
            {
                "catalog_id": "CAT-CHAR-001",
                "official_id": None,
                "character_name": "星宇",
                "runtime_key": "xingyu",
                "states": list(XINGYU_STATES),
                "runtime_status": "produced_pending_review",
                "acceptance_status": "pending_project_owner_review",
            },
            {
                "catalog_id": "CAT-CHAR-002",
                "official_id": "EDU-0077",
                "character_name": "七码",
                "runtime_key": "qima",
                "states": list(QIMA_STATES),
                "runtime_status": "produced_pending_review",
                "acceptance_status": "pending_project_owner_review",
            },
        ],
        "runtime_assets": asset_records,
    }
    character_docs = ROOT / "docs/characters"
    character_docs.mkdir(parents=True, exist_ok=True)
    (character_docs / "CHARACTER_ASSET_PROVENANCE.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    write_outputs()
