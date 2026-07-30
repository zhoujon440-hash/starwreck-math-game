from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/runtime-production/g02-slice-01/source"
PUBLIC = ROOT / "public/assets/g02/slice-01"
CHARACTERS = ROOT / "public/assets/characters"
DATA = ROOT / "data/source/g02/slice-01"
DOCS = ROOT / "docs/art"
CANVAS = (2560, 1440)
MAGENTA = (255, 0, 255)
AUTHORIZATION = "project_owner_authorized_runtime_production"
PLAN = "docs/plan/G02_VERTICAL_SLICE_01_IMPLEMENTATION_PLAN.md"

FORMAL_SOURCES = [
    {
        "package_id": "PKG-CHARACTERS-V2.1",
        "package_sha256": "a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip",
        "entry": "星骸拾荒者_人物形象设计全集_V2.1_补齐版/01_十二星球人物三视图/G02_锈环星_人物三视图.png",
        "entry_sha256": "c549fe94157daea3606a1b7b32562e28108c9e54f2dac1b156b38c8097c0a0b3",
        "purpose": "阿铆、郑身份与造型约束",
    },
    {
        "package_id": "PKG-SCENES-V1.0",
        "package_sha256": "731cc680ee98eba1bf27474d4d613476dbbe02ca7fff7dfb1beb4b2bb0595de0",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_场景美术设计全集_V1.0.zip",
        "entry": "星骸拾荒者_场景美术设计全集_V1.0/01_十二星球场景设定板/G02_锈环星_场景设定板.png",
        "entry_sha256": "977812ad694f15b6e58a11bc780bc17edab214f06d8ece2e07fe7a76dfa9a0af",
        "purpose": "G02旧屏幕谷环境、材质和色彩约束",
    },
    {
        "package_id": "PKG-PROPS-V3.0",
        "package_sha256": "f712245f25945b234fd73d794b3ff6d6be39744da3a56324a34706ee85f6aa2d",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_道具美术正式包_V3.0.zip",
        "entry": "星骸拾荒者_道具美术正式包_V3.0/01_正式道具设定板/G02_锈环星_PROP-001-012_已确认基准.png",
        "entry_sha256": "2698ab60ce208213328017cfff519c865d919cfb1d6d512251d756609e9e6b4c",
        "purpose": "G02关键物轮廓、材料和编号约束",
    },
    {
        "package_id": "PKG-MECH-V2.0",
        "package_sha256": "de7367d1ec06f97d3b8cca3c671ca9680f522f714929997d4a60fd9af1678b2f",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_机制可视化HOPA正式包_V2.0.zip",
        "entry": "星骸拾荒者_机制可视化HOPA正式包_V2.0/01_MECH-A_G02-G04/01_MECH-A详细机制设计板/MECH-002_参数诊断_HOPA机制详细设计板.png",
        "entry_sha256": "671909498c3253dad376c7a9752b22ec9108945f3132c53598dbcca9d231d149",
        "purpose": "MECH-002电视墙档案修复约束",
    },
    {
        "package_id": "PKG-DANGER-V2.0",
        "package_sha256": "981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_危险视觉HOPA正式包_V2.0.zip",
        "entry": "星骸拾荒者_危险视觉HOPA正式包_V2.0/01_DANGER-A_G02-G04/01_DANGER-A详细危险设计板/DANGER-001_裸露电缆放电_HOPA危险视觉详细设计板.png",
        "entry_sha256": "ec994d944a27a69210104f84836d0d77add4c6c4354fa9aa9319963de9e1fb33",
        "purpose": "电视墙漏电软失败约束",
    },
    {
        "package_id": "PKG-DANGER-V2.0",
        "package_sha256": "981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_危险视觉HOPA正式包_V2.0.zip",
        "entry": "星骸拾荒者_危险视觉HOPA正式包_V2.0/01_DANGER-A_G02-G04/01_DANGER-A详细危险设计板/DANGER-002_吊臂落物区_HOPA危险视觉详细设计板.png",
        "entry_sha256": "f8fb1e1cf4497057191a433b44933100f49177f74166d0b5a4ca72b352825670",
        "purpose": "吊臂落物软失败约束",
    },
    {
        "package_id": "PKG-DANGER-V2.0",
        "package_sha256": "981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b",
        "source_package_path": "source_packages/originals-or-release-links/星骸拾荒者_危险视觉HOPA正式包_V2.0.zip",
        "entry": "星骸拾荒者_危险视觉HOPA正式包_V2.0/01_DANGER-A_G02-G04/01_DANGER-A详细危险设计板/DANGER-004_磁性碎片风_HOPA危险视觉详细设计板.png",
        "entry_sha256": "068dfbddf20bc1a192823edf9fcfeda3fee9d0fff36ab00493fb7ea952a73f22",
        "purpose": "磁性碎片风软失败约束",
    },
]


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    source_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    else:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_background(source_name: str, target: Path) -> Image.Image:
    image = fit_cover(Image.open(SOURCE / source_name), CANVAS)
    ensure_parent(target)
    image.save(target, "WEBP", quality=94, method=6)
    return image


def remove_magenta(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, MAGENTA)
    distance = ImageChops.difference(rgb, background).convert("L")
    alpha = distance.point(lambda value: 0 if value < 28 else min(255, (value - 20) * 5))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def trim_transparent(image: Image.Image, padding: int = 18) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("sprite contains no visible pixels")
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(image.width, bbox[2] + padding)
    bottom = min(image.height, bbox[3] + padding)
    return image.crop((left, top, right, bottom))


def normalize_sprite(image: Image.Image, size: int) -> Image.Image:
    image = trim_transparent(image)
    scale = min((size - 32) / image.width, (size - 32) / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((size - resized.width) // 2, (size - resized.height) // 2),
    )
    return canvas


def crop_sheet(
    source_name: str,
    columns: int,
    rows: int,
    names: list[str],
) -> dict[str, Image.Image]:
    sheet = Image.open(SOURCE / source_name).convert("RGB")
    if len(names) != columns * rows:
        raise ValueError("sprite name count does not match sheet grid")
    sprites: dict[str, Image.Image] = {}
    for index, name in enumerate(names):
        column = index % columns
        row = index // columns
        left = round(column * sheet.width / columns)
        right = round((column + 1) * sheet.width / columns)
        top = round(row * sheet.height / rows)
        bottom = round((row + 1) * sheet.height / rows)
        sprites[name] = remove_magenta(sheet.crop((left, top, right, bottom)))
    return sprites


def save_sprite_pair(name: str, sprite: Image.Image) -> None:
    scene_path = PUBLIC / f"items/{name}_scene.png"
    inventory_path = PUBLIC / f"items/{name}_inventory.png"
    ensure_parent(scene_path)
    normalize_sprite(sprite, 640).save(scene_path, "PNG", optimize=True)
    normalize_sprite(sprite, 384).save(inventory_path, "PNG", optimize=True)


def save_character(runtime_key: str, state: str, sprite: Image.Image) -> None:
    sprite = trim_transparent(sprite, 24)
    scale = min(1500 / sprite.width, 1840 / sprite.height)
    sprite = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (1600, 2000), (0, 0, 0, 0))
    canvas.alpha_composite(
        sprite,
        ((canvas.width - sprite.width) // 2, canvas.height - sprite.height - 32),
    )
    target = CHARACTERS / f"{runtime_key}/{runtime_key}_{state}.png"
    ensure_parent(target)
    canvas.save(target, "PNG", optimize=True)


def extracted_region_layer(
    background: Image.Image,
    relative_box: tuple[float, float, float, float],
    alpha: int,
    tint: tuple[int, int, int] | None = None,
) -> Image.Image:
    left = round(relative_box[0] * background.width)
    top = round(relative_box[1] * background.height)
    right = round(relative_box[2] * background.width)
    bottom = round(relative_box[3] * background.height)
    region = background.crop((left, top, right, bottom)).convert("RGBA")
    if tint:
        wash = Image.new("RGBA", region.size, (*tint, 150))
        region = Image.blend(region, wash, 0.34)
    region.putalpha(
        Image.new("L", region.size, alpha).filter(ImageFilter.GaussianBlur(2.0))
    )
    layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
    layer.alpha_composite(region, (left, top))
    return layer


def save_layer(layer: Image.Image, target: Path) -> None:
    ensure_parent(target)
    layer.save(target, "PNG", optimize=True)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runtime_record(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        width, height = image.size
    relative_path = relative(path)
    if "/characters/" in f"/{relative_path}":
        category = "character_state"
        parent = "CHAR-G02-RUNTIME"
    elif "/items/" in f"/{relative_path}":
        category = "inventory_item" if "_inventory" in path.stem else "scene_item"
        parent = path.stem.replace("_inventory", "").replace("_scene", "")
    elif "/states/" in f"/{relative_path}":
        category = "scene_state_layer"
        parent = path.parent.parent.name
    elif "HOS-G02-001" in path.name:
        category = "hos_background"
        parent = "HOS-G02-001"
    else:
        category = "scene_background"
        parent = {
            "scn00": "SCENE-G02-001",
            "scn01": "SCENE-G02-002",
            "scn02": "SCENE-G02-003",
        }.get(path.parent.name, path.stem)
    return {
        "asset_id": path.stem,
        "formal_parent_id": parent,
        "category": category,
        "runtime_path": relative_path,
        "width": width,
        "height": height,
        "rgba_or_transparency": has_alpha,
        "sha256": sha256(path),
        "runtime_asset": True,
        "source": AUTHORIZATION,
    }


def write_manifests() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    runtime_files = sorted(path for path in PUBLIC.rglob("*") if path.is_file())
    character_files = sorted(
        path
        for runtime_key in ("almao", "zheng")
        for path in (CHARACTERS / runtime_key).glob("*.png")
    )
    records = [runtime_record(path) for path in [*runtime_files, *character_files]]
    generated_inputs = [
        {
            "path": relative(path),
            "sha256": sha256(path),
            "production_role": "owner-authorized generation input; never shipped directly",
        }
        for path in sorted(SOURCE.glob("*.png"))
    ]
    manifest = {
        "schema_version": 1,
        "slice_id": "G02-SLICE-01",
        "version": "G02-SLICE-0.1.0",
        "authorization": AUTHORIZATION,
        "runtime_asset": True,
        "formal_sources": FORMAL_SOURCES,
        "generated_inputs": generated_inputs,
        "runtime_assets": records,
        "hos": {
            "hos_id": "HOS-G02-001",
            "target_item_ids": [
                "ITM-G02-002",
                "ITM-G02-003",
                "ITM-G02-004",
                "RUNTIME-ITM-G02-005-A",
                "RUNTIME-ITM-G02-005-B",
                "ITM-G02-006",
            ],
            "distractor_ids": [
                "RUNTIME-DECOY-G02-BROKEN-REMOTE",
                "RUNTIME-DECOY-G02-KEYCAP",
                "RUNTIME-DECOY-G02-SCREWS",
                "RUNTIME-DECOY-G02-OLD-TAG",
                "RUNTIME-DECOY-G02-BURNT-CONNECTOR",
            ],
            "pickup_layers_independently_hide": True,
        },
        "forbidden_inputs": {
            "pr_5_assets": False,
            "third_party_network_assets": False,
            "design_board_used_directly_at_runtime": False,
            "css_or_svg_placeholder_art": False,
        },
    }
    manifest_path = DATA / "runtime-art-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    provenance = {
        "schema_version": 1,
        "authorization": AUTHORIZATION,
        "implementation_plan": PLAN,
        "status": "pending_project_owner_visual_review",
        "production_tool": "OpenAI built-in image generation plus deterministic Pillow 2D runtime preparation",
        "formal_sources": FORMAL_SOURCES,
        "generated_inputs": generated_inputs,
        "runtime_manifest": relative(manifest_path),
        "runtime_asset_count": len(records),
        "production_notes": [
            "Design sources constrain IDs, silhouettes, materials, palette and story semantics.",
            "Generated source canvases are separated from runtime assets and retain SHA-256 provenance.",
            "Pillow performs deterministic 16:9 crops, transparency extraction, sizing and state-layer preparation.",
            "No PR #5 asset, third-party download, direct design-board enlargement, CSS art, SVG placeholder, emoji or web icon is used.",
        ],
    }
    (DOCS / "G02_SLICE_01_RUNTIME_ASSET_PROVENANCE.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (DOCS / "G02_SLICE_01_RUNTIME_ASSET_SHA256.txt").write_text(
        "".join(
            f"{record['sha256']}  {record['runtime_path']}\n"
            for record in sorted(records, key=lambda record: str(record["runtime_path"]))
        ),
        encoding="utf-8",
    )
    print(f"Prepared {len(records)} G02 slice runtime assets.")


def main() -> None:
    scn00 = save_background(
        "SCN-G02-00_source.png",
        PUBLIC / "scn00/SCENE-G02-001_old-screen-valley-pulse.webp",
    )
    scn01 = save_background(
        "SCN-G02-01_source.png",
        PUBLIC / "scn01/SCENE-G02-002_five-tail-rescue.webp",
    )
    scn02 = save_background(
        "SCN-G02-02_source.png",
        PUBLIC / "scn02/SCENE-G02-003_tv-wall-archive.webp",
    )

    hos_crop = scn02.crop((0, round(scn02.height * 0.30), scn02.width, scn02.height))
    hos_closeup = fit_cover(hos_crop, CANVAS)
    hos_path = PUBLIC / "scn02/HOS-G02-001_screen-scrap-closeup.webp"
    ensure_parent(hos_path)
    hos_closeup.save(hos_path, "WEBP", quality=94, method=6)

    prop_names = [
        "RUNTIME-ITM-G02-MAGNETIC-GRAPNEL",
        "ITM-G02-002",
        "ITM-G02-003",
        "ITM-G02-004",
        "RUNTIME-ITM-G02-005-A",
        "RUNTIME-ITM-G02-005-B",
        "ITM-G02-006",
        "RUNTIME-DECOY-G02-BROKEN-REMOTE",
        "RUNTIME-DECOY-G02-KEYCAP",
        "RUNTIME-DECOY-G02-SCREWS",
        "RUNTIME-DECOY-G02-OLD-TAG",
        "RUNTIME-DECOY-G02-BURNT-CONNECTOR",
    ]
    props = crop_sheet("G02_props_source.png", 4, 3, prop_names)
    for name in prop_names[:7]:
        save_sprite_pair(name, props[name])

    character_names = [
        "almao_trapped",
        "almao_relieved",
        "almao_concerned",
        "zheng_warning",
        "zheng_measured",
        "zheng_silent",
    ]
    character_sprites = crop_sheet("G02_characters_source.png", 3, 2, character_names)
    for name, sprite in character_sprites.items():
        runtime_key, state = name.split("_", 1)
        save_character(runtime_key, state, sprite)

    pulse_located = extracted_region_layer(scn00, (0.38, 0.22, 0.72, 0.66), 105, (26, 165, 192))
    pulse_scanned = extracted_region_layer(scn00, (0.36, 0.20, 0.74, 0.68), 185, (32, 202, 228))
    save_layer(pulse_located, PUBLIC / "scn00/states/sealed-pulse-located.png")
    save_layer(pulse_scanned, PUBLIC / "scn00/states/sealed-pulse-scanned.png")

    grapnel_layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    grapnel = normalize_sprite(props["RUNTIME-ITM-G02-MAGNETIC-GRAPNEL"], 720)
    grapnel_layer.alpha_composite(grapnel, (940, 120))
    save_layer(grapnel_layer, PUBLIC / "scn01/states/grapnel-installed.png")

    almao_layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    almao = normalize_sprite(character_sprites["almao_relieved"], 820)
    almao_layer.alpha_composite(almao, (870, 430))
    save_layer(almao_layer, PUBLIC / "scn01/states/almao-rescued.png")
    save_layer(
        extracted_region_layer(scn01, (0.71, 0.62, 0.90, 0.91), 160, (32, 170, 188)),
        PUBLIC / "scn01/states/label-private-scanned.png",
    )
    save_layer(
        extracted_region_layer(scn01, (0.04, 0.62, 0.27, 0.92), 150, (29, 158, 178)),
        PUBLIC / "scn01/states/label-public-scanned.png",
    )
    save_layer(
        extracted_region_layer(scn01, (0.38, 0.68, 0.60, 0.94), 140, (40, 140, 156)),
        PUBLIC / "scn01/states/label-abandoned-scanned.png",
    )

    screen_boxes = [
        (0.04, 0.07, 0.33, 0.48),
        (0.34, 0.05, 0.67, 0.48),
        (0.68, 0.10, 0.94, 0.49),
    ]
    screen_layers = [
        extracted_region_layer(scn02, box, 205, (19, 162, 179))
        for box in screen_boxes
    ]
    save_layer(screen_layers[0], PUBLIC / "scn02/states/screen-a-restored.png")
    save_layer(screen_layers[1], PUBLIC / "scn02/states/screen-b-restored.png")
    save_layer(screen_layers[2], PUBLIC / "scn02/states/screen-c-restored.png")
    archive = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for layer in screen_layers:
        archive = Image.alpha_composite(archive, layer)
    archive = ImageEnhance.Brightness(archive).enhance(1.12)
    save_layer(archive, PUBLIC / "scn02/states/archive-restored.png")
    write_manifests()


if __name__ == "__main__":
    main()
