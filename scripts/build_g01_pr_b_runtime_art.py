"""Prepare the project-owner-authorized G01 PR-B runtime art package.

The three source paintings are retained in art/runtime-production for provenance.
This script performs deterministic resizing, chroma-key extraction, state-layer
composition, manifest generation, and SHA-256 recording. It never reads PR #5.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/runtime-production/g01/pr-b/source"
PUBLIC = ROOT / "public/assets/g01/pr-b"
DATA = ROOT / "data/source/g01/pr-b"
DOCS = ROOT / "docs/art"

PACKAGE = "PKG-G01-V3.0"
PACKAGE_SHA = "85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043"
SCENE_ENTRY = "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/02_G01美术资产/01_概念设计板/G01序章场景概念设计总览.png"
SCENE_ENTRY_SHA = "38f2b34be1a8403b2e972251d724c881a65e97c0fa026bde02a89190f1bb96d7"
PROP_ENTRY = "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/02_G01美术资产/01_概念设计板/G01序章道具与效果设计总览.png"
PROP_ENTRY_SHA = "8de48f4153e721fd865dc404e874ea4a9e838614e0ceb97d9c6cc1474996d8bc"
DANGER_ENTRY = "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/02_G01美术资产/01_概念设计板/G01教学机制与危险视觉总览.png"
DANGER_ENTRY_SHA = "a16feaf0e0c9b36d73fe8d9eab508437736cdc3c13f090a8ddb7cf20e3574c40"
SOURCE_LABEL = "project_owner_authorized_runtime_production"
AUTHORIZATION = "https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5115689539"
PLAN = "https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5115836880"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def save_webp(source: Path, output: Path, size: tuple[int, int]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.convert("RGB").resize(size, Image.Resampling.LANCZOS).save(
            output, "WEBP", quality=94, method=6
        )


def trim_magenta(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            # Generated source is near #ff00ff; soften only the immediate fringe.
            distance = abs(255 - r) + abs(g) + abs(255 - b)
            alpha = 0 if distance < 90 else min(255, max(0, (distance - 70) * 4))
            pixels[x, y] = (r, g, b, alpha)
    box = rgba.getbbox()
    return rgba.crop(box) if box else rgba


def fit_layer(image: Image.Image, size: int, padding: int = 22) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image.thumbnail((size - padding * 2, size - padding * 2), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def asset_record(path: Path, asset_id: str, name: str, kind: str, official_id=None):
    with Image.open(path) as image:
        has_alpha = image.mode in ("RGBA", "LA") and image.getextrema()[-1][0] < 255
        width, height = image.size
    return {
        "asset_id": asset_id,
        "official_id": official_id,
        "name": name,
        "type": kind,
        "runtime_path": rel(path),
        "width": width,
        "height": height,
        "has_alpha": has_alpha,
        "sha256": sha(path),
        "source": SOURCE_LABEL,
        "source_package": PACKAGE,
        "source_entry": PROP_ENTRY if kind != "scene_background" else SCENE_ENTRY,
        "source_entry_sha256": PROP_ENTRY_SHA if kind != "scene_background" else SCENE_ENTRY_SHA,
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "version": "1.0.0-review",
    }


def glow_layer(output: Path, nodes: list[tuple[int, int, int, tuple[int, int, int, int]]]) -> None:
    layer = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    for x, y, radius, color in nodes:
        glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
        layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(radius // 2)))
    output.parent.mkdir(parents=True, exist_ok=True)
    layer.save(output)


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    scene_sources = {
        "SCN-G01-04": SOURCE / "scn04-star-map-room.png",
        "SCN-G01-05": SOURCE / "scn05-garbage-route.png",
    }
    scene_outputs = {
        "SCN-G01-04": PUBLIC / "scn-g01-04/background/SCENE-G01-005_star_map_gap.webp",
        "SCN-G01-05": PUBLIC / "scn-g01-05/background/SCENE-G01-006_garbage_rain_route.webp",
    }
    for scene_id, source in scene_sources.items():
        save_webp(source, scene_outputs[scene_id], (3840, 2160))
        closeup = PUBLIC / scene_id.lower() / "closeups" / (
            "star-map-table.webp" if scene_id.endswith("04") else "route-console.webp"
        )
        save_webp(source, closeup, (1920, 1080))

    sheet = Image.open(SOURCE / "pr-b-props-magenta.png").convert("RGB")
    names = [
        ("fragment-a", "RUNTIME-ITM-G01-010-A", "星图碎片A", "ITM-G01-010"),
        ("fragment-b", "RUNTIME-ITM-G01-010-B", "星图碎片B", "ITM-G01-010"),
        ("fragment-c", "RUNTIME-ITM-G01-010-C", "星图碎片C", "ITM-G01-010"),
        ("coordinate-marker", "ITM-G01-011", "坐标标记", "ITM-G01-011"),
        ("ordinary-star-page", "RUNTIME-HOS-G01-004-D01", "普通星图页", None),
        ("wrong-coordinate-tag", "RUNTIME-HOS-G01-004-D02", "错误坐标标签", None),
        ("bypass-plate", "ITM-G01-012", "旁路板", "ITM-G01-012"),
        ("bent-bypass-plate", "RUNTIME-G01-05-D01", "弯曲旧旁路板", None),
    ]
    item_records = []
    distractor_records = []
    for index, (slug, asset_id, name, official_parent) in enumerate(names):
        col, row = index % 4, index // 4
        raw = trim_magenta(sheet.crop((col * 384, row * 512, (col + 1) * 384, (row + 1) * 512)))
        scene_layer = fit_layer(raw, 512)
        scene_path = PUBLIC / (
            f"scn-g01-04/{'hos' if index in (4, 5) else 'items'}/{slug}_scene.png"
            if index < 6
            else f"scn-g01-05/{'hos' if index == 7 else 'items'}/{slug}_scene.png"
        )
        scene_path.parent.mkdir(parents=True, exist_ok=True)
        scene_layer.save(scene_path)
        record = asset_record(
            scene_path,
            asset_id,
            name,
            "hos_distractor" if index in (4, 5, 7) else "item_scene",
            asset_id if asset_id.startswith("ITM-") else None,
        )
        if official_parent and asset_id.startswith("RUNTIME-"):
            record["catalog_id"] = asset_id
            record["official_id"] = None
            record["official_parent_id"] = official_parent
        if index in (4, 5, 7):
            distractor_records.append(record)
            continue
        inventory_path = scene_path.with_name(f"{slug}_inventory.png")
        fit_layer(raw, 512, 38).save(inventory_path)
        record["inventory_path"] = rel(inventory_path)
        record["inventory_sha256"] = sha(inventory_path)
        item_records.append(record)

    state_specs = [
        ("scn-g01-04", "star-map-calibrated", [(1210, 520, 190, (60, 220, 255, 105))]),
        ("scn-g01-04", "anomaly-signal", [(1395, 350, 95, (255, 170, 55, 125))]),
        ("scn-g01-04", "coordinate-locked", [(1540, 615, 70, (55, 255, 220, 155))]),
        ("scn-g01-04", "data-glitch", [(960, 480, 230, (255, 75, 95, 80))]),
        ("scn-g01-05", "route-node-a", [(895, 650, 60, (55, 235, 255, 140))]),
        ("scn-g01-05", "route-node-b", [(1090, 600, 60, (55, 235, 255, 140))]),
        ("scn-g01-05", "bypass-installed", [(950, 820, 95, (255, 185, 55, 135))]),
        ("scn-g01-05", "route-window-open", [(1375, 290, 175, (60, 245, 255, 105))]),
        ("scn-g01-05", "safe-landing", [(1540, 245, 110, (255, 215, 80, 150))]),
    ]
    state_records = []
    for scene_slug, slug, nodes in state_specs:
        output = PUBLIC / scene_slug / "states" / f"{slug}.png"
        glow_layer(output, nodes)
        state_records.append(asset_record(output, f"RUNTIME-STATE-{slug.upper()}", slug, "state_layer"))

    positions = {
        "RUNTIME-ITM-G01-010-A": {"x": 7, "y": 17, "width": 16, "height": 24},
        "RUNTIME-ITM-G01-010-B": {"x": 34, "y": 59, "width": 18, "height": 24},
        "RUNTIME-ITM-G01-010-C": {"x": 72, "y": 20, "width": 16, "height": 25},
        "ITM-G01-011": {"x": 80, "y": 62, "width": 11, "height": 17},
    }
    manifest = {
        "schema_version": 1,
        "authorization": AUTHORIZATION,
        "implementation_plan": PLAN,
        "source": SOURCE_LABEL,
        "source_package": PACKAGE,
        "source_package_sha256": PACKAGE_SHA,
        "formal_source_entries": [
            {"path": SCENE_ENTRY, "sha256": SCENE_ENTRY_SHA},
            {"path": PROP_ENTRY, "sha256": PROP_ENTRY_SHA},
            {"path": DANGER_ENTRY, "sha256": DANGER_ENTRY_SHA},
        ],
        "scenes": [
            asset_record(scene_outputs["SCN-G01-04"], "SCENE-G01-005", "导航星图室（缺口/修复）", "scene_background", "SCENE-G01-005"),
            asset_record(scene_outputs["SCN-G01-05"], "SCENE-G01-006", "垃圾雨航线驾驶舱", "scene_background", "SCENE-G01-006"),
        ],
        "items": item_records,
        "distractors": distractor_records,
        "state_layers": state_records,
        "hos": {
            "hos_id": "HOS-G01-004",
            "targets": [
                {
                    "item_id": item["asset_id"],
                    "official_parent_id": item.get("official_parent_id"),
                    "name": item["name"],
                    "scene_asset": item["runtime_path"],
                    "inventory_asset": item["inventory_path"],
                    "position": positions[item["asset_id"]],
                    "state": "available",
                    "source": SOURCE_LABEL,
                    "sha256": item["sha256"],
                }
                for item in item_records[:4]
            ],
            "distractors": [item for item in distractor_records if "scn-g01-04" in item["runtime_path"]],
            "completion_refreshes": False,
        },
        "runtime_adapters": [
            {
                "catalog_id": "RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT",
                "official_id": None,
                "reason": "ITM-G01-012 has a formal cockpit-tool-slot origin but no standalone formal hotspot ID.",
            },
            {
                "catalog_id": "RUNTIME-HS-G01-05-HAZARD-BRANCH",
                "official_id": None,
                "reason": "DANGER-G01-004 route branches are interaction adapters, not replacements for formal IDs.",
            },
        ],
        "runtime_asset": True,
    }
    manifest_path = DATA / "runtime-art-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    provenance = {
        "schema_version": 1,
        "authorization": AUTHORIZATION,
        "implementation_plan": PLAN,
        "tool": "OpenAI built-in image_gen + Pillow deterministic runtime preparation",
        "status": SOURCE_LABEL,
        "inputs": [{"path": rel(path), "sha256": sha(path)} for path in SOURCE.glob("*.png")],
        "manifest": rel(manifest_path),
        "formal_package": {"id": PACKAGE, "sha256": PACKAGE_SHA},
        "not_used": ["PR #5 assets", "third-party network assets", "design-board direct runtime use"],
    }
    (DOCS / "G01_PR_B_RUNTIME_ASSET_PROVENANCE.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    runtime_files = sorted(path for path in PUBLIC.rglob("*") if path.is_file())
    (DOCS / "G01_PR_B_RUNTIME_ASSET_SHA256.txt").write_text(
        "".join(f"{sha(path)}  {rel(path)}\n" for path in runtime_files), encoding="utf-8"
    )
    print(f"Prepared {len(runtime_files)} PR-B runtime assets.")


if __name__ == "__main__":
    main()
