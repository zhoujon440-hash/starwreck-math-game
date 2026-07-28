#!/usr/bin/env python3
"""Build the owner-authorized SCN-G01-01 runtime art package.

The checked-in source images are production inputs, not runtime assets. This
script performs deterministic sizing, chroma-key cleanup validation, layer
extraction, inventory treatment, state-layer compositing, and manifest hashing.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/runtime-production/g01/scn-g01-01/source"
RUNTIME = ROOT / "public/assets/g01/scn-g01-01"
DATA = ROOT / "data/source/g01/scn-g01-01"
PROVENANCE = ROOT / "docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json"

SCENE_SOURCE = SOURCE / "scene-generated-reference.png"
TARGET_SOURCE = SOURCE / "targets-alpha-sheet.png"
DISTRACTOR_SOURCE = SOURCE / "distractors-alpha-sheet.png"

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
AUTHORIZATION = (
    "https://github.com/zhoujon440-hash/starwreck-math-game/"
    "issues/3#issuecomment-5105774977"
)
PRODUCTION_TOOL = (
    "OpenAI built-in image_gen (gpt-image-2) + imagegen chroma-key helper "
    "+ Pillow 12.3.0 deterministic runtime preparation"
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
    for path in [
        RUNTIME / "background",
        RUNTIME / "hos",
        RUNTIME / "items",
        RUNTIME / "states",
        DATA,
        PROVENANCE.parent,
    ]:
        path.mkdir(parents=True, exist_ok=True)


def validate_alpha_sheet(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError(f"{path} must contain transparent and opaque pixels")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    ]
    if any(value > 8 for value in corners):
        raise RuntimeError(f"{path} has non-transparent chroma-key corners: {corners}")
    return image


def trim_with_padding(image: Image.Image, padding: int = 28) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("Empty alpha layer")
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
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(saturation)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    rgb.putalpha(alpha)
    return rgb


def fit_transparent(image: Image.Image, size: tuple[int, int], max_edge: int) -> Image.Image:
    fitted = image.copy()
    scale = min(max_edge / fitted.width, max_edge / fitted.height, 1.0)
    fitted = fitted.resize(
        (max(1, round(fitted.width * scale)), max(1, round(fitted.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(
        fitted,
        ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2),
    )
    return canvas


def save_item_variants(
    source: Image.Image,
    cell: tuple[int, int, int, int],
    base_name: str,
) -> dict[str, Path]:
    item = trim_with_padding(source.crop(cell))
    scene = grade(item, 0.82, 0.94)
    inventory = grade(item, 1.02, 1.08)
    scene_path = RUNTIME / "items" / f"{base_name}_scene.png"
    inventory_path = RUNTIME / "items" / f"{base_name}_inventory.png"
    fit_transparent(scene, (512, 512), 420).save(scene_path, optimize=True)
    fit_transparent(inventory, (512, 512), 452).save(inventory_path, optimize=True)
    return {"scene": scene_path, "inventory": inventory_path, "raw": item}


def save_distractor(
    source: Image.Image,
    cell: tuple[int, int, int, int],
    base_name: str,
) -> Path:
    item = grade(trim_with_padding(source.crop(cell)), 0.78, 0.92)
    output = RUNTIME / "hos" / f"{base_name}.png"
    fit_transparent(item, (512, 512), 430).save(output, optimize=True)
    return output


def save_installed_layer(
    image: Image.Image,
    name: str,
    rotation: float,
    position: tuple[int, int],
    max_edge: int,
) -> Path:
    fitted = image.copy()
    scale = min(max_edge / fitted.width, max_edge / fitted.height)
    fitted = fitted.resize(
        (round(fitted.width * scale), round(fitted.height * scale)),
        Image.Resampling.LANCZOS,
    )
    fitted = fitted.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
    canvas = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, position)
    path = RUNTIME / "states" / name
    canvas.save(path, optimize=True)
    return path


def save_qima_effect(source_name: str, output_name: str, color: tuple[int, int, int]) -> Path:
    qima = Image.open(
        ROOT / f"public/assets/characters/qima/{source_name}"
    ).convert("RGBA")
    alpha = qima.getchannel("A")
    glow = alpha.filter(ImageFilter.GaussianBlur(radius=18))
    edge = ImageChops.subtract(glow, alpha.filter(ImageFilter.GaussianBlur(radius=3)))
    edge = edge.point(lambda value: min(180, round(value * 1.45)))
    effect = Image.new("RGBA", qima.size, (*color, 0))
    effect.putalpha(edge)

    scan_mask = Image.new("L", qima.size, 0)
    draw = ImageDraw.Draw(scan_mask)
    for y in range(100, qima.height - 80, 92):
        draw.rectangle((80, y, qima.width - 80, y + 5), fill=96)
    scan_mask = ImageChops.multiply(scan_mask, alpha)
    scan = Image.new("RGBA", qima.size, (*color, 0))
    scan.putalpha(scan_mask)
    effect.alpha_composite(scan)

    path = RUNTIME / "states" / output_name
    effect.save(path, optimize=True)
    return path


def build_scene_assets() -> dict[str, Path]:
    source = Image.open(SCENE_SOURCE).convert("RGB")
    scene = source.resize((3840, 2160), Image.Resampling.LANCZOS)
    scene = ImageEnhance.Contrast(scene).enhance(1.025)
    scene_path = (
        RUNTIME / "background" / "SCENE-G01-002_navigation_core_cabin.webp"
    )
    scene.save(scene_path, "WEBP", quality=92, method=6)

    # The HOS detail uses a genuine crop of the runtime production scene rather
    # than a CSS backdrop or a button-grid panel.
    crop = scene.crop((0, 620, 2380, 1960))
    hos_background = crop.resize((1920, 1080), Image.Resampling.LANCZOS)
    hos_path = RUNTIME / "background" / "HOS-G01-002_navigation_parts_pile.webp"
    hos_background.save(hos_path, "WEBP", quality=92, method=6)

    # A real raster foreground from the same scene creates partial occlusion for
    # selected collectibles without adding visible hotspot marks.
    mask = Image.new("L", hos_background.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [(0, 780), (290, 690), (535, 825), (790, 760), (930, 1080), (0, 1080)],
        fill=255,
    )
    draw.polygon(
        [(1120, 915), (1380, 820), (1600, 870), (1920, 760), (1920, 1080), (1080, 1080)],
        fill=220,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(radius=4))
    foreground = hos_background.convert("RGBA")
    foreground.putalpha(mask)
    foreground_path = (
        RUNTIME / "background" / "HOS-G01-002_foreground_occlusion.png"
    )
    foreground.save(foreground_path, optimize=True)
    return {
        "scene": scene_path,
        "hos_background": hos_path,
        "hos_foreground": foreground_path,
    }


def asset_record(
    asset_id: str,
    name: str,
    kind: str,
    path: Path,
    source_entry: str,
    source_sha: str,
    **extra: object,
) -> dict[str, object]:
    with Image.open(path) as image:
        width, height = image.size
        has_alpha = "A" in image.getbands()
    return {
        "asset_id": asset_id,
        "name": name,
        "type": kind,
        "runtime_path": rel(path),
        "width": width,
        "height": height,
        "has_alpha": has_alpha,
        "sha256": sha256(path),
        "source_package": "PKG-G01-V3.0",
        "source_entry": source_entry,
        "source_sha256": source_sha,
        "source": "project_owner_authorized_runtime_production",
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        **extra,
    }


def main() -> None:
    ensure_dirs()
    target_sheet = validate_alpha_sheet(TARGET_SOURCE)
    distractor_sheet = validate_alpha_sheet(DISTRACTOR_SOURCE)
    scene_assets = build_scene_assets()

    target_cells = {
        "PROP-G01-004_qima_chip": (0, 0, 627, 627),
        "PROP-G01-005_contact_plate": (627, 0, 1254, 627),
        "RUNTIME-G01-FUSE": (0, 627, 627, 1254),
        "RUNTIME-G01-FIXED-BUCKLE": (627, 627, 1254, 1254),
    }
    targets = {
        name: save_item_variants(target_sheet, cell, name)
        for name, cell in target_cells.items()
    }

    distractor_cells = {
        "RUNTIME-HOS-G01-002-D01_empty_chip_shell": (0, 0, 512, 512),
        "RUNTIME-HOS-G01-002-D02_broken_contact_strip": (512, 0, 1024, 512),
        "RUNTIME-HOS-G01-002-D03_old_connector": (1024, 0, 1536, 512),
        "RUNTIME-HOS-G01-002-D04_similar_fuse_plate": (0, 512, 512, 1024),
        "RUNTIME-HOS-G01-002-D05_bent_metal_clip": (512, 512, 1024, 1024),
        "RUNTIME-HOS-G01-002-D06_navigation_part": (1024, 512, 1536, 1024),
    }
    distractors = {
        name: save_distractor(distractor_sheet, cell, name)
        for name, cell in distractor_cells.items()
    }

    state_layers = [
        save_installed_layer(
            targets["PROP-G01-004_qima_chip"]["raw"],
            "SCN-G01-01_chip_installed.png",
            -8,
            (1355, 585),
            80,
        ),
        save_installed_layer(
            targets["PROP-G01-005_contact_plate"]["raw"],
            "SCN-G01-01_contact_plate_installed.png",
            12,
            (1390, 540),
            75,
        ),
        save_installed_layer(
            targets["RUNTIME-G01-FUSE"]["raw"],
            "SCN-G01-01_fuse_installed.png",
            84,
            (1455, 610),
            55,
        ),
        save_installed_layer(
            targets["RUNTIME-G01-FIXED-BUCKLE"]["raw"],
            "SCN-G01-01_buckle_locked.png",
            -5,
            (1420, 735),
            65,
        ),
        save_qima_effect(
            "qima_booting.png",
            "SCN-G01-01_qima_booting_effect.png",
            (75, 224, 235),
        ),
        save_qima_effect(
            "qima_normal.png",
            "SCN-G01-01_qima_normal_effect.png",
            (239, 166, 65),
        ),
    ]

    positions = {
        "PROP-G01-004": {"x": 17, "y": 17, "width": 16, "height": 19},
        "PROP-G01-005": {"x": 57, "y": 25, "width": 15, "height": 16},
        "RUNTIME-G01-FUSE": {"x": 32, "y": 64, "width": 11, "height": 15},
        "RUNTIME-G01-FIXED-BUCKLE": {"x": 68, "y": 62, "width": 14, "height": 17},
        "RUNTIME-HOS-G01-002-D01": {"x": 7, "y": 49, "width": 12, "height": 14},
        "RUNTIME-HOS-G01-002-D02": {"x": 42, "y": 10, "width": 13, "height": 15},
        "RUNTIME-HOS-G01-002-D03": {"x": 82, "y": 13, "width": 12, "height": 16},
        "RUNTIME-HOS-G01-002-D04": {"x": 9, "y": 76, "width": 14, "height": 13},
        "RUNTIME-HOS-G01-002-D05": {"x": 49, "y": 75, "width": 13, "height": 13},
        "RUNTIME-HOS-G01-002-D06": {"x": 81, "y": 78, "width": 13, "height": 13},
    }

    target_meta = [
        ("PROP-G01-004", "七码芯片", "PROP-G01-004_qima_chip", "ITM-G01-004"),
        ("PROP-G01-005", "接线片", "PROP-G01-005_contact_plate", "ITM-G01-005"),
        ("RUNTIME-G01-FUSE", "保险丝", "RUNTIME-G01-FUSE", "ITM-G01-006"),
        (
            "RUNTIME-G01-FIXED-BUCKLE",
            "固定扣",
            "RUNTIME-G01-FIXED-BUCKLE",
            "RUNTIME-ITM-G01-FIXED-BUCKLE",
        ),
    ]
    target_records = []
    for asset_id, name, key, item_id in target_meta:
        variants = targets[key]
        target_records.append(
            {
                "asset_id": asset_id,
                "official_id": asset_id if asset_id.startswith("PROP-") else None,
                "item_id": item_id,
                "name": name,
                "type": "target",
                "source": "project_owner_authorized_runtime_production",
                "source_package": "PKG-G01-V3.0",
                "source_entry": PROP_BOARD_ENTRY,
                "source_sha256": PROP_BOARD_SHA,
                "scene_asset": rel(variants["scene"]),
                "scene_sha256": sha256(variants["scene"]),
                "inventory_asset": rel(variants["inventory"]),
                "inventory_sha256": sha256(variants["inventory"]),
                "position": positions[asset_id],
                "state": "available",
                "collectible": True,
                "wrong_use_consumes": False,
                "runtime_asset": True,
                "acceptance_status": "pending_review",
            }
        )

    distractor_names = [
        ("RUNTIME-HOS-G01-002-D01", "空芯片壳", "RUNTIME-HOS-G01-002-D01_empty_chip_shell"),
        ("RUNTIME-HOS-G01-002-D02", "断线片", "RUNTIME-HOS-G01-002-D02_broken_contact_strip"),
        ("RUNTIME-HOS-G01-002-D03", "废旧接头", "RUNTIME-HOS-G01-002-D03_old_connector"),
        ("RUNTIME-HOS-G01-002-D04", "相似保险片", "RUNTIME-HOS-G01-002-D04_similar_fuse_plate"),
        ("RUNTIME-HOS-G01-002-D05", "弯曲金属扣", "RUNTIME-HOS-G01-002-D05_bent_metal_clip"),
        ("RUNTIME-HOS-G01-002-D06", "导航零件", "RUNTIME-HOS-G01-002-D06_navigation_part"),
    ]
    distractor_records = [
        {
            "asset_id": asset_id,
            "official_id": None,
            "name": name,
            "type": "distractor",
            "source": "project_owner_authorized_runtime_production",
            "source_package": "PKG-G01-V3.0",
            "source_entry": PROP_BOARD_ENTRY,
            "source_sha256": PROP_BOARD_SHA,
            "runtime_path": rel(distractors[key]),
            "sha256": sha256(distractors[key]),
            "position": positions[asset_id],
            "state": "persistent",
            "collectible": False,
            "runtime_asset": True,
            "acceptance_status": "pending_review",
        }
        for asset_id, name, key in distractor_names
    ]

    scene_manifest = {
        "schema_version": 1,
        "scene_id": "SCN-G01-01",
        "asset_id": "SCENE-G01-002",
        "name": "导航核心舱",
        "source": "project_owner_authorized_runtime_production",
        "design_source": [SCENE_BOARD_ENTRY, "public/assets/g01-cockpit.png"],
        "version": "1.0.0-review",
        "runtime_path": rel(scene_assets["scene"]),
        "sha256": sha256(scene_assets["scene"]),
        "width": 3840,
        "height": 2160,
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "source_package": "PKG-G01-V3.0",
        "source_package_path": FORMAL_PACKAGE,
        "source_package_sha256": FORMAL_PACKAGE_SHA,
        "source_entry": SCENE_BOARD_ENTRY,
        "source_sha256": SCENE_BOARD_SHA,
        "runtime_production_asset": True,
        "generated_or_repainted_parts": [
            "navigation core cabin background",
            "Qima repair cradle and repair landmarks",
            "navigation parts workbench and power area",
        ],
        "manual_cleanup": [
            "16:9 runtime sizing",
            "contrast normalization",
            "HOS crop and raster foreground occlusion preparation",
        ],
        "production_tool": PRODUCTION_TOOL,
        "authorization": AUTHORIZATION,
    }
    (DATA / "scene_manifest.json").write_text(
        json.dumps(scene_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    hos_manifest = {
        "schema_version": 1,
        "hos_id": "HOS-G01-002",
        "scene_id": "SCN-G01-01",
        "source": "project_owner_authorized_runtime_production",
        "background_asset": {
            "path": rel(scene_assets["hos_background"]),
            "sha256": sha256(scene_assets["hos_background"]),
        },
        "foreground_occlusion_asset": {
            "path": rel(scene_assets["hos_foreground"]),
            "sha256": sha256(scene_assets["hos_foreground"]),
        },
        "targets": target_records,
        "distractors": distractor_records,
        "state": "not_started",
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "authorization": AUTHORIZATION,
    }
    (DATA / "hos_manifest.json").write_text(
        json.dumps(hos_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    state_records = [
        asset_record(
            f"STATE-G01-{index:03d}",
            path.stem,
            "state_layer",
            path,
            PROP_BOARD_ENTRY,
            PROP_BOARD_SHA,
        )
        for index, path in enumerate(state_layers, start=1)
    ]
    all_runtime_paths = [
        scene_assets["scene"],
        scene_assets["hos_background"],
        scene_assets["hos_foreground"],
        *[
            variants[variant]
            for variants in targets.values()
            for variant in ("scene", "inventory")
        ],
        *distractors.values(),
        *state_layers,
    ]
    provenance = {
        "schema_version": 1,
        "scene_id": "SCN-G01-01",
        "production_status": "project_owner_authorized_runtime_production",
        "authorization": AUTHORIZATION,
        "design_source": {
            "source_package": "PKG-G01-V3.0",
            "source_package_path": FORMAL_PACKAGE,
            "source_package_sha256": FORMAL_PACKAGE_SHA,
            "scene_entry": SCENE_BOARD_ENTRY,
            "scene_entry_sha256": SCENE_BOARD_SHA,
            "prop_entry": PROP_BOARD_ENTRY,
            "prop_entry_sha256": PROP_BOARD_SHA,
            "approved_style_reference": "public/assets/g01-cockpit.png",
            "approved_style_reference_sha256": sha256(
                ROOT / "public/assets/g01-cockpit.png"
            ),
            "approved_qima_manifest": "docs/characters/CHARACTER_ASSET_PROVENANCE.json",
        },
        "runtime_production_asset": True,
        "generated_or_repainted_parts": [
            "SCENE-G01-002 navigation core cabin",
            "HOS-G01-002 target and distractor production layers",
            "repair state layers and local light effects",
        ],
        "manual_cleanup": [
            "chroma-key removal and despill",
            "transparent-edge validation",
            "object isolation and inventory treatment",
            "16:9 scene sizing",
            "raster-only HOS occlusion compositing",
        ],
        "production_tool": PRODUCTION_TOOL,
        "production_inputs": {
            rel(path): sha256(path)
            for path in [
                SCENE_SOURCE,
                SOURCE / "targets-chroma-sheet.png",
                TARGET_SOURCE,
                SOURCE / "distractors-chroma-sheet.png",
                DISTRACTOR_SOURCE,
            ]
        },
        "runtime_sha256": {
            rel(path): sha256(path) for path in sorted(all_runtime_paths)
        },
        "state_layers": state_records,
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "forbidden_sources": {
            "pr_5_assets_used": False,
            "third_party_assets_used": False,
            "overview_board_used_as_runtime_asset": False,
        },
    }
    PROVENANCE.write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "SCN_G01_01_RUNTIME_ART_OK "
        f"assets={len(all_runtime_paths)} scene_sha256={scene_manifest['sha256']}"
    )


if __name__ == "__main__":
    main()
