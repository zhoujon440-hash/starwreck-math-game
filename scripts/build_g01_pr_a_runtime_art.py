#!/usr/bin/env python3
"""Build the owner-authorized runtime art for G01 PR-A.

The checked-in production sources are never consumed directly by the game.
This script performs deterministic 16:9 preparation, object isolation,
inventory treatment, close-up extraction, state-layer composition, and
cryptographic provenance generation for SCN-G01-02 and SCN-G01-03.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/runtime-production/g01/pr-a/source"
RUNTIME = ROOT / "public/assets/g01/pr-a"
DATA = ROOT / "data/source/g01/pr-a"
PROVENANCE = ROOT / "docs/art/G01_PR_A_RUNTIME_ASSET_PROVENANCE.json"
SHA_LIST = ROOT / "docs/art/G01_PR_A_RUNTIME_ASSET_SHA256.txt"

FORMAL_PACKAGE = (
    "source_packages/originals-or-release-links/"
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0.zip"
)
FORMAL_PACKAGE_SHA = (
    "85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043"
)
SCENE_BOARD_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01序章场景概念设计总览.png"
)
SCENE_BOARD_SHA = (
    "38f2b34be1a8403b2e972251d724c881a65e97c0fa026bde02a89190f1bb96d7"
)
PROP_BOARD_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01序章道具与效果设计总览.png"
)
PROP_BOARD_SHA = (
    "8de48f4153e721fd865dc404e874ea4a9e838614e0ceb97d9c6cc1474996d8bc"
)
DANGER_BOARD_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01教学机制与危险视觉总览.png"
)
DANGER_BOARD_SHA = (
    "a16feaf0e0c9b36d73fe8d9eab508437736cdc3c13f090a8ddb7cf20e3574c40"
)
AUTHORIZATION = (
    "https://github.com/zhoujon440-hash/starwreck-math-game/"
    "issues/9#issuecomment-5114041966"
)
PLAN_COMMENT = (
    "https://github.com/zhoujon440-hash/starwreck-math-game/"
    "issues/9#issuecomment-5114127141"
)
PRODUCTION_TOOL = (
    "OpenAI built-in image_gen + imagegen chroma-key helper + "
    "Pillow deterministic runtime preparation"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ensure_dirs() -> None:
    for scene in ("scn-g01-02", "scn-g01-03"):
        for category in ("background", "closeups", "items", "hos", "states"):
            (RUNTIME / scene / category).mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    PROVENANCE.parent.mkdir(parents=True, exist_ok=True)


def validate_alpha_sheet(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError(f"{path} must have transparent and opaque pixels")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    ]
    if any(value > 8 for value in corners):
        raise RuntimeError(f"{path} has non-transparent corners: {corners}")
    return image


def crop_16_9(source: Image.Image) -> Image.Image:
    width, height = source.size
    target_height = round(width * 9 / 16)
    if target_height > height:
        target_width = round(height * 16 / 9)
        left = (width - target_width) // 2
        return source.crop((left, 0, left + target_width, height))
    top = (height - target_height) // 2
    return source.crop((0, top, width, top + target_height))


def trim_with_padding(image: Image.Image, padding: int = 26) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Object cell has no opaque pixels")
    cropped = image.crop(bbox)
    output = Image.new(
        "RGBA",
        (cropped.width + padding * 2, cropped.height + padding * 2),
        (0, 0, 0, 0),
    )
    output.alpha_composite(cropped, (padding, padding))
    return output


def grade(image: Image.Image, saturation: float, contrast: float) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Color(image.convert("RGB")).enhance(saturation)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    rgb.putalpha(alpha)
    return rgb


def fit_transparent(
    image: Image.Image, size: tuple[int, int], max_edge: int
) -> Image.Image:
    fitted = image.copy()
    scale = min(max_edge / fitted.width, max_edge / fitted.height, 1.0)
    fitted = fitted.resize(
        (
            max(1, round(fitted.width * scale)),
            max(1, round(fitted.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(
        fitted,
        ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2),
    )
    return canvas


def save_item_variants(
    sheet: Image.Image,
    cell: tuple[int, int, int, int],
    output_dir: Path,
    stem: str,
) -> dict[str, Any]:
    raw = trim_with_padding(sheet.crop(cell))
    scene = fit_transparent(grade(raw, 0.78, 0.91), (512, 512), 420)
    inventory = fit_transparent(grade(raw, 1.03, 1.08), (512, 512), 452)
    scene_path = output_dir / f"{stem}_scene.png"
    inventory_path = output_dir / f"{stem}_inventory.png"
    scene.save(scene_path, optimize=True)
    inventory.save(inventory_path, optimize=True)
    return {"raw": raw, "scene": scene_path, "inventory": inventory_path}


def save_single(
    sheet: Image.Image,
    cell: tuple[int, int, int, int],
    output_dir: Path,
    stem: str,
) -> Path:
    item = fit_transparent(
        grade(trim_with_padding(sheet.crop(cell)), 0.76, 0.9),
        (512, 512),
        430,
    )
    output = output_dir / f"{stem}.png"
    item.save(output, optimize=True)
    return output


def save_scene(source_name: str, output: Path) -> Image.Image:
    source = Image.open(SOURCE / source_name).convert("RGB")
    scene = crop_16_9(source).resize((3840, 2160), Image.Resampling.LANCZOS)
    scene = ImageEnhance.Contrast(scene).enhance(1.025)
    scene.save(output, "WEBP", quality=93, method=6)
    return scene


def save_closeup(
    scene: Image.Image,
    normalized_box: tuple[float, float, float, float],
    output: Path,
) -> Path:
    width, height = scene.size
    crop = scene.crop(
        (
            round(normalized_box[0] * width),
            round(normalized_box[1] * height),
            round(normalized_box[2] * width),
            round(normalized_box[3] * height),
        )
    )
    crop = crop.resize((1920, 1080), Image.Resampling.LANCZOS)
    crop.save(output, "WEBP", quality=92, method=6)
    return output


def save_hos_occlusion(background: Path, output: Path) -> Path:
    """Extract real foreground pixels so two HOS targets sit at scene depth."""
    scene = Image.open(background).convert("RGBA")
    mask = Image.new("L", scene.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [(250, 690), (530, 630), (620, 810), (535, 930), (225, 900)],
        fill=238,
    )
    draw.polygon(
        [(720, 600), (1010, 565), (1115, 720), (990, 835), (760, 790)],
        fill=225,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(radius=5))
    scene.putalpha(mask)
    scene.save(output, optimize=True)
    return output


def installed_layer(
    raw: Image.Image,
    output: Path,
    position: tuple[int, int],
    max_edge: int,
    rotation: float = 0,
) -> Path:
    scale = min(max_edge / raw.width, max_edge / raw.height)
    fitted = raw.resize(
        (max(1, round(raw.width * scale)), max(1, round(raw.height * scale))),
        Image.Resampling.LANCZOS,
    )
    if rotation:
        fitted = fitted.rotate(
            rotation, expand=True, resample=Image.Resampling.BICUBIC
        )
    canvas = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, position)
    canvas.save(output, optimize=True)
    return output


def extracted_state_layer(
    scene: Image.Image,
    normalized_box: tuple[float, float, float, float],
    output: Path,
    color: float,
    contrast: float,
) -> Path:
    preview = scene.resize((1920, 1080), Image.Resampling.LANCZOS)
    width, height = preview.size
    box = (
        round(normalized_box[0] * width),
        round(normalized_box[1] * height),
        round(normalized_box[2] * width),
        round(normalized_box[3] * height),
    )
    pixels = preview.crop(box).convert("RGB")
    pixels = ImageEnhance.Color(pixels).enhance(color)
    pixels = ImageEnhance.Contrast(pixels).enhance(contrast)
    mask = Image.new("L", pixels.size, 255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=10))
    pixels.putalpha(mask)
    layer = Image.new("RGBA", preview.size, (0, 0, 0, 0))
    layer.alpha_composite(pixels, (box[0], box[1]))
    layer.save(output, optimize=True)
    return output


def repress_effect(scene: Image.Image, output: Path) -> Path:
    preview = scene.resize((1920, 1080), Image.Resampling.LANCZOS).convert("RGB")
    leak = preview.crop((1030, 110, 1620, 790))
    blue = ImageEnhance.Color(leak).enhance(0.38)
    blue = ImageEnhance.Brightness(blue).enhance(1.12)
    delta = ImageChops.difference(leak, blue).convert("L")
    alpha = ImageEnhance.Contrast(delta).enhance(1.8)
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=18))
    alpha = alpha.point(lambda value: min(190, round(value * 2.1)))
    blue.putalpha(alpha)
    layer = Image.new("RGBA", preview.size, (0, 0, 0, 0))
    layer.alpha_composite(blue, (1030, 110))
    layer.save(output, optimize=True)
    return output


def image_record(
    asset_id: str,
    name: str,
    asset_type: str,
    path: Path,
    source_entry: str,
    source_sha: str,
    **extra: Any,
) -> dict[str, Any]:
    with Image.open(path) as image:
        width, height = image.size
        has_alpha = "A" in image.getbands()
    return {
        "asset_id": asset_id,
        "name": name,
        "type": asset_type,
        "runtime_path": rel(path),
        "width": width,
        "height": height,
        "has_alpha": has_alpha,
        "sha256": sha256(path),
        "source": "project_owner_authorized_runtime_production",
        "source_package": "PKG-G01-V3.0",
        "source_entry": source_entry,
        "source_entry_sha256": source_sha,
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        **extra,
    }


def build_scn02() -> tuple[dict[str, Any], list[Path]]:
    root = RUNTIME / "scn-g01-02"
    scene_path = root / "background/SCENE-G01-003_command_task_console.webp"
    scene = save_scene("scn02-scene-generated.png", scene_path)
    closeups = [
        save_closeup(scene, (0.0, 0.10, 0.56, 0.86), root / "closeups/task-console.webp"),
        save_closeup(scene, (0.35, 0.08, 0.82, 0.86), root / "closeups/ship-map.webp"),
        save_closeup(scene, (0.13, 0.42, 0.59, 0.98), root / "closeups/archive-tray.webp"),
    ]
    state_layers = [
        extracted_state_layer(
            scene,
            (0.12, 0.19, 0.46, 0.54),
            root / "states/task-screen-active.png",
            1.35,
            1.2,
        ),
        extracted_state_layer(
            scene,
            (0.48, 0.16, 0.75, 0.64),
            root / "states/ship-map-active.png",
            1.28,
            1.15,
        ),
        extracted_state_layer(
            scene,
            (0.22, 0.53, 0.50, 0.79),
            root / "states/task-chain-archived.png",
            0.9,
            1.2,
        ),
    ]

    sheet = validate_alpha_sheet(SOURCE / "scn02-objects-alpha.png")
    cell_width, cell_height = sheet.width // 3, sheet.height // 2
    cells = [
        (col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height)
        for row in range(2)
        for col in range(3)
    ]
    item_specs = [
        (
            "RUNTIME-ITM-G01-MAINTENANCE-SHEET",
            None,
            "维修清单",
            "maintenance-sheet",
            cells[0],
            {"x": 24, "y": 63, "width": 12, "height": 15},
        ),
        (
            "RUNTIME-ITM-G01-STAR-MAP-KEY",
            None,
            "星图钥片",
            "star-map-key",
            cells[1],
            {"x": 78, "y": 52, "width": 10, "height": 15},
        ),
    ]
    targets: list[dict[str, Any]] = []
    item_paths: list[Path] = []
    raw_targets: dict[str, Image.Image] = {}
    for asset_id, official_id, name, stem, cell, position in item_specs:
        variants = save_item_variants(sheet, cell, root / "items", stem)
        raw_targets[asset_id] = variants["raw"]
        item_paths.extend([variants["scene"], variants["inventory"]])
        targets.append(
            {
                "asset_id": asset_id,
                "official_id": official_id,
                "name": name,
                "type": "clue_target",
                "scene_asset": rel(variants["scene"]),
                "scene_sha256": sha256(variants["scene"]),
                "inventory_asset": rel(variants["inventory"]),
                "inventory_sha256": sha256(variants["inventory"]),
                "position": position,
                "state": "available",
                "collectible": True,
                "wrong_use_consumes": False,
                "source": "project_owner_authorized_runtime_production",
                "runtime_asset": True,
            }
        )
    distractor_specs = [
        ("RUNTIME-SCN02-D01", "空数据套", "empty-data-sleeve", cells[2], {"x": 8, "y": 46, "width": 12, "height": 15}),
        ("RUNTIME-SCN02-D02", "诊断线圈", "diagnostic-cable", cells[3], {"x": 45, "y": 73, "width": 13, "height": 15}),
        ("RUNTIME-SCN02-D03", "归档夹", "archive-clip", cells[4], {"x": 65, "y": 68, "width": 9, "height": 13}),
        ("RUNTIME-SCN02-D04", "工具布袋", "tool-pouch", cells[5], {"x": 86, "y": 74, "width": 11, "height": 14}),
    ]
    distractors: list[dict[str, Any]] = []
    for asset_id, name, stem, cell, position in distractor_specs:
        path = save_single(sheet, cell, root / "hos", stem)
        item_paths.append(path)
        distractors.append(
            image_record(
                asset_id,
                name,
                "environment_distractor",
                path,
                PROP_BOARD_ENTRY,
                PROP_BOARD_SHA,
                official_id=None,
                position=position,
                state="persistent",
                collectible=False,
            )
        )

    manifest = {
        "schema_version": 1,
        "scene_id": "SCN-G01-02",
        "scene_asset": image_record(
            "SCENE-G01-003",
            "中控任务台与船内地图",
            "scene_background",
            scene_path,
            SCENE_BOARD_ENTRY,
            SCENE_BOARD_SHA,
            version="1.0.0-review",
        ),
        "closeups": [
            image_record(
                f"RUNTIME-CLOSEUP-G01-02-{index:02d}",
                path.stem,
                "closeup_background",
                path,
                SCENE_BOARD_ENTRY,
                SCENE_BOARD_SHA,
                official_id=None,
            )
            for index, path in enumerate(closeups, 1)
        ],
        "state_layers": [
            image_record(
                f"RUNTIME-STATE-G01-02-{index:02d}",
                path.stem,
                "state_layer",
                path,
                SCENE_BOARD_ENTRY,
                SCENE_BOARD_SHA,
                official_id=None,
            )
            for index, path in enumerate(state_layers, 1)
        ],
        "clue_search": {
            "official_hos_id": None,
            "runtime_adapter_id": "RUNTIME-CLUE-G01-02",
            "formal_gap": "SCN-G01-02 has no formal HOS row",
            "source_hotspots": ["HS-G01-0009", "HS-G01-0010", "HS-G01-0011", "HS-G01-0012"],
            "targets": targets,
            "distractors": distractors,
        },
        "authorization": AUTHORIZATION,
        "runtime_asset": True,
    }
    paths = [scene_path, *closeups, *state_layers, *item_paths]
    return manifest, paths


def build_scn03() -> tuple[dict[str, Any], list[Path]]:
    root = RUNTIME / "scn-g01-03"
    scene_path = root / "background/SCENE-G01-004_cargo_leak.webp"
    scene = save_scene("scn03-scene-generated.png", scene_path)
    closeups = [
        save_closeup(scene, (0.0, 0.43, 0.58, 1.0), root / "closeups/emergency-box.webp"),
        save_closeup(scene, (0.48, 0.02, 0.94, 0.82), root / "closeups/hull-crack.webp"),
        save_closeup(scene, (0.58, 0.05, 1.0, 0.9), root / "closeups/gauge-and-valve.webp"),
    ]
    hos_foreground = save_hos_occlusion(
        closeups[0],
        root / "closeups/emergency-box-foreground-occlusion.png",
    )
    sheet = validate_alpha_sheet(SOURCE / "scn03-objects-alpha.png")
    cell_width, cell_height = sheet.width // 3, sheet.height // 3
    cells = [
        (col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height)
        for row in range(3)
        for col in range(3)
    ]
    target_specs = [
        ("ITM-G01-007", "PROP-G01-007", "密封胶带", "sealing-tape", cells[0], {"x": 18, "y": 63, "width": 12, "height": 15}),
        ("ITM-G01-008", "PROP-G01-006", "金属补片", "metal-patch", cells[1], {"x": 42, "y": 46, "width": 13, "height": 17}),
        ("ITM-G01-009", "PROP-G01-008", "压力表", "pressure-gauge", cells[2], {"x": 71, "y": 58, "width": 12, "height": 17}),
        ("RUNTIME-ITM-G01-REPRESS-KEY", None, "复压钥", "repress-key", cells[3], {"x": 79, "y": 28, "width": 10, "height": 15}),
    ]
    targets: list[dict[str, Any]] = []
    item_paths: list[Path] = []
    raw_targets: dict[str, Image.Image] = {}
    for item_id, official_prop_id, name, stem, cell, position in target_specs:
        variants = save_item_variants(sheet, cell, root / "items", stem)
        raw_targets[item_id] = variants["raw"]
        item_paths.extend([variants["scene"], variants["inventory"]])
        targets.append(
            {
                "asset_id": official_prop_id or item_id,
                "official_id": official_prop_id,
                "item_id": item_id,
                "name": name,
                "type": "target",
                "scene_asset": rel(variants["scene"]),
                "scene_sha256": sha256(variants["scene"]),
                "inventory_asset": rel(variants["inventory"]),
                "inventory_sha256": sha256(variants["inventory"]),
                "position": position,
                "state": "available",
                "collectible": True,
                "wrong_use_consumes": False,
                "source": "project_owner_authorized_runtime_production",
                "runtime_asset": True,
            }
        )
    distractor_specs = [
        ("RUNTIME-HOS-G01-003-D01", "普通胶带", "ordinary-tape", cells[4], {"x": 57, "y": 72, "width": 13, "height": 15}),
        ("RUNTIME-HOS-G01-003-D02", "破压力表", "broken-gauge", cells[5], {"x": 86, "y": 52, "width": 11, "height": 16}),
        ("RUNTIME-HOS-G01-003-D03", "旧软管接头", "hose-coupling", cells[6], {"x": 9, "y": 32, "width": 12, "height": 15}),
        ("RUNTIME-HOS-G01-003-D04", "弯曲货钩", "bent-cargo-hook", cells[7], {"x": 48, "y": 22, "width": 12, "height": 16}),
        ("RUNTIME-HOS-G01-003-D05", "货网绑带", "cargo-net-strap", cells[8], {"x": 83, "y": 75, "width": 13, "height": 15}),
    ]
    distractors: list[dict[str, Any]] = []
    for asset_id, name, stem, cell, position in distractor_specs:
        path = save_single(sheet, cell, root / "hos", stem)
        item_paths.append(path)
        distractors.append(
            image_record(
                asset_id,
                name,
                "distractor",
                path,
                PROP_BOARD_ENTRY,
                PROP_BOARD_SHA,
                official_id=None,
                position=position,
                state="persistent",
                collectible=False,
            )
        )

    state_layers = [
        installed_layer(
            raw_targets["ITM-G01-009"],
            root / "states/pressure-gauge-installed.png",
            (1125, 275),
            170,
            -4,
        ),
        installed_layer(
            raw_targets["ITM-G01-008"],
            root / "states/metal-patch-installed.png",
            (1335, 355),
            245,
            5,
        ),
        installed_layer(
            raw_targets["ITM-G01-007"],
            root / "states/sealing-tape-installed.png",
            (1320, 375),
            270,
            -7,
        ),
        repress_effect(scene, root / "states/cargo-repressurized.png"),
    ]
    manifest = {
        "schema_version": 1,
        "scene_id": "SCN-G01-03",
        "scene_asset": image_record(
            "SCENE-G01-004",
            "货舱裂口（漏气/复压）",
            "scene_background",
            scene_path,
            SCENE_BOARD_ENTRY,
            SCENE_BOARD_SHA,
            version="1.0.0-review",
        ),
        "danger_asset": {
            "asset_id": "DANGER-G01-002",
            "name": "货舱氧压下降",
            "source": "project_owner_authorized_runtime_production",
            "source_entry": DANGER_BOARD_ENTRY,
            "source_entry_sha256": DANGER_BOARD_SHA,
            "runtime_asset": True,
        },
        "effect_asset": {
            "asset_id": "FX-G01-003",
            "name": "货舱复压",
            "runtime_path": rel(state_layers[-1]),
            "sha256": sha256(state_layers[-1]),
            "source": "project_owner_authorized_runtime_production",
            "runtime_asset": True,
        },
        "closeups": [
            image_record(
                f"RUNTIME-CLOSEUP-G01-03-{index:02d}",
                path.stem,
                "closeup_background",
                path,
                SCENE_BOARD_ENTRY,
                SCENE_BOARD_SHA,
                official_id=None,
            )
            for index, path in enumerate(closeups, 1)
        ],
        "state_layers": [
            image_record(
                f"RUNTIME-STATE-G01-03-{index:02d}",
                path.stem,
                "state_layer",
                path,
                DANGER_BOARD_ENTRY if index == 4 else PROP_BOARD_ENTRY,
                DANGER_BOARD_SHA if index == 4 else PROP_BOARD_SHA,
                official_id=None,
            )
            for index, path in enumerate(state_layers, 1)
        ],
        "hos": {
            "hos_id": "HOS-G01-003",
            "background_asset": rel(closeups[0]),
            "background_sha256": sha256(closeups[0]),
            "foreground_occlusion_asset": rel(hos_foreground),
            "foreground_occlusion_sha256": sha256(hos_foreground),
            "targets": targets,
            "distractors": distractors,
            "completion_refreshes": False,
        },
        "authorization": AUTHORIZATION,
        "runtime_asset": True,
    }
    paths = [scene_path, *closeups, hos_foreground, *state_layers, *item_paths]
    return manifest, paths


def main() -> None:
    ensure_dirs()
    scn02, paths02 = build_scn02()
    scn03, paths03 = build_scn03()
    (DATA / "scn-g01-02-art-manifest.json").write_text(
        json.dumps(scn02, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (DATA / "scn-g01-03-art-manifest.json").write_text(
        json.dumps(scn03, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    production_inputs = sorted(SOURCE.glob("*.png"))
    runtime_paths = sorted({*paths02, *paths03})
    provenance = {
        "schema_version": 1,
        "scope": ["SCN-G01-02", "SCN-G01-03"],
        "production_status": "project_owner_authorized_runtime_production",
        "authorization": AUTHORIZATION,
        "implementation_plan_comment": PLAN_COMMENT,
        "design_source": {
            "source_package": "PKG-G01-V3.0",
            "source_package_path": FORMAL_PACKAGE,
            "source_package_sha256": FORMAL_PACKAGE_SHA,
            "scene_entry": SCENE_BOARD_ENTRY,
            "scene_entry_sha256": SCENE_BOARD_SHA,
            "prop_entry": PROP_BOARD_ENTRY,
            "prop_entry_sha256": PROP_BOARD_SHA,
            "danger_entry": DANGER_BOARD_ENTRY,
            "danger_entry_sha256": DANGER_BOARD_SHA,
            "visual_continuity_reference": (
                "public/assets/g01/scn-g01-01/background/"
                "SCENE-G01-002_navigation_core_cabin.webp"
            ),
        },
        "production_tool": PRODUCTION_TOOL,
        "runtime_production_asset": True,
        "generated_or_repainted_parts": [
            "SCENE-G01-003 command task console and ship map runtime background",
            "SCENE-G01-004 cargo leak runtime background",
            "SCN-G01-02 clue targets and environmental distractors",
            "HOS-G01-003 targets and distractors",
            "close-up and state layers for both scenes",
            "DANGER-G01-002 leak states and FX-G01-003 repressurization layer",
        ],
        "manual_cleanup": [
            "16:9 runtime crop and 3840x2160 preparation",
            "chroma-key removal, despill, and alpha validation",
            "object isolation, scene/inventory grading, and transparent padding",
            "scene-derived close-up and state-layer preparation",
            "SHA-256 manifest generation",
        ],
        "production_inputs": {rel(path): sha256(path) for path in production_inputs},
        "runtime_sha256": {rel(path): sha256(path) for path in runtime_paths},
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "forbidden_sources": {
            "pr_5_assets_used": False,
            "third_party_assets_used": False,
            "overview_board_used_as_runtime_asset": False,
            "css_or_svg_placeholder_used": False,
            "character_redesign_performed": False,
        },
    }
    PROVENANCE.write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    SHA_LIST.write_text(
        "\n".join(f"{sha256(path)}  {rel(path)}" for path in runtime_paths) + "\n",
        encoding="utf-8",
    )
    print(
        "G01_PR_A_RUNTIME_ART_OK "
        f"assets={len(runtime_paths)} "
        f"scn02={scn02['scene_asset']['sha256']} "
        f"scn03={scn03['scene_asset']['sha256']}"
    )


if __name__ == "__main__":
    main()
