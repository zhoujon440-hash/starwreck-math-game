"""Build the project-owner-authorized G01 PR-C runtime art package.

The recorded source paintings live in art/runtime-production/g01/pr-c/source.
This deterministic pass creates deployable 4K backgrounds, closeups, alpha
objects, state overlays, provenance, and SHA-256 records. It never reads PR #5.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/runtime-production/g01/pr-c/source"
PUBLIC = ROOT / "public/assets/g01/pr-c"
DATA = ROOT / "data/source/g01/pr-c"
DOCS = ROOT / "docs/art"

PACKAGE = "PKG-G01-V3.0"
PACKAGE_SHA = "85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043"
SCENE_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01序章场景概念设计总览.png"
)
SCENE_ENTRY_SHA = "38f2b34be1a8403b2e972251d724c881a65e97c0fa026bde02a89190f1bb96d7"
PROP_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01序章道具与效果设计总览.png"
)
PROP_ENTRY_SHA = "8de48f4153e721fd865dc404e874ea4a9e838614e0ceb97d9c6cc1474996d8bc"
DANGER_ENTRY = (
    "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/"
    "02_G01美术资产/01_概念设计板/G01教学机制与危险视觉总览.png"
)
DANGER_ENTRY_SHA = "a16feaf0e0c9b36d73fe8d9eab508437736cdc3c13f090a8ddb7cf20e3574c40"
SOURCE_LABEL = "project_owner_authorized_runtime_production"
AUTHORIZATION = (
    "https://github.com/zhoujon440-hash/starwreck-math-game/"
    "issues/9#issuecomment-5117479638"
)
PLAN = (
    "https://github.com/zhoujon440-hash/starwreck-math-game/"
    "issues/9#issuecomment-5128562403"
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def save_webp(source: Path, output: Path, size: tuple[int, int]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        ImageOps.fit(
            image.convert("RGB"), size, method=Image.Resampling.LANCZOS
        ).save(output, "WEBP", quality=94, method=6)


def save_closeup(
    source: Path,
    output: Path,
    crop: tuple[float, float, float, float],
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        left = round(image.width * crop[0])
        top = round(image.height * crop[1])
        right = round(image.width * crop[2])
        bottom = round(image.height * crop[3])
        ImageOps.fit(
            image.convert("RGB").crop((left, top, right, bottom)),
            (1920, 1080),
            method=Image.Resampling.LANCZOS,
        ).save(output, "WEBP", quality=94, method=6)


def trim_magenta(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            # Source uses a flat magenta removal field. The soft transition keeps
            # antialiased brass/glass edges without leaving a neon fringe.
            distance = abs(255 - r) + abs(g) + abs(255 - b)
            alpha = 0 if distance < 95 else min(255, max(0, (distance - 70) * 4))
            pixels[x, y] = (r, g, b, alpha)
    box = rgba.getbbox()
    return rgba.crop(box) if box else rgba


def fit_layer(image: Image.Image, size: int, padding: int = 24) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image.thumbnail((size - padding * 2, size - padding * 2), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def image_record(
    path: Path,
    asset_id: str,
    name: str,
    kind: str,
    *,
    official_id: str | None = None,
    source_entry: str = PROP_ENTRY,
    source_entry_sha: str = PROP_ENTRY_SHA,
) -> dict:
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
        "source_entry": source_entry,
        "source_entry_sha256": source_entry_sha,
        "runtime_asset": True,
        "acceptance_status": "pending_review",
        "version": "1.0.0-review",
    }


def glow_layer(
    output: Path,
    glows: list[tuple[int, int, int, tuple[int, int, int, int]]],
    lines: list[tuple[tuple[int, int], tuple[int, int], tuple[int, int, int, int], int]]
    | None = None,
) -> None:
    layer = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    for x, y, radius, color in glows:
        glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
        layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(max(8, radius // 2))))
    if lines:
        glow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        for start, end, color, width in lines:
            draw.line((start, end), fill=color, width=width)
            draw.ellipse(
                (start[0] - width, start[1] - width, start[0] + width, start[1] + width),
                fill=color,
            )
            draw.ellipse(
                (end[0] - width, end[1] - width, end[0] + width, end[1] + width),
                fill=color,
            )
        layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(5)))
    output.parent.mkdir(parents=True, exist_ok=True)
    layer.save(output)


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    source_scn06 = SOURCE / "scn06-long-range-observation.png"
    source_scn07 = SOURCE / "scn07-old-screen-valley-descent.png"
    source_props = SOURCE / "scn06-props-magenta.png"
    for source in (source_scn06, source_scn07, source_props):
        if not source.exists():
            raise SystemExit(f"Missing recorded runtime-production source: {rel(source)}")

    scene_outputs = {
        "SCENE-G01-007": PUBLIC
        / "scn-g01-06/background/SCENE-G01-007_long_range_observation.webp",
        "SCENE-G01-008": PUBLIC
        / "scn-g01-07/background/SCENE-G01-008_old_screen_valley_descent.webp",
    }
    save_webp(source_scn06, scene_outputs["SCENE-G01-007"], (3840, 2160))
    save_webp(source_scn07, scene_outputs["SCENE-G01-008"], (3840, 2160))

    closeups = {
        "RUNTIME-CLOSEUP-G01-06-SIGNAL-RECEIVER": PUBLIC
        / "scn-g01-06/closeups/signal-receiver.webp",
        "RUNTIME-CLOSEUP-G01-06-AUTHORIZATION": PUBLIC
        / "scn-g01-06/closeups/authorization-console.webp",
        "RUNTIME-CLOSEUP-G01-07-LANDING-SCANNER": PUBLIC
        / "scn-g01-07/closeups/landing-scanner.webp",
    }
    save_closeup(source_scn06, closeups["RUNTIME-CLOSEUP-G01-06-SIGNAL-RECEIVER"], (0.23, 0.35, 0.79, 0.98))
    save_closeup(source_scn06, closeups["RUNTIME-CLOSEUP-G01-06-AUTHORIZATION"], (0.25, 0.46, 0.77, 0.99))
    save_closeup(source_scn07, closeups["RUNTIME-CLOSEUP-G01-07-LANDING-SCANNER"], (0.22, 0.44, 0.78, 0.98))

    object_specs = [
        ("signal-prism", "RUNTIME-ITM-G01-013-PRISM", "信号记忆棱镜", "hos_target", "ITM-G01-013"),
        ("tuning-coil", "RUNTIME-ITM-G01-013-COIL", "调谐线圈", "hos_target", "ITM-G01-013"),
        ("distress-record", "ITM-G01-013", "求救记录", "item_scene", None),
        ("phase-key", "RUNTIME-ITM-G01-013-PHASE-KEY", "相位校准钥", "hos_target", "ITM-G01-013"),
        ("ability-plate", "ITM-G01-014", "能力授权片", "state_object", None),
        ("burned-coil", "RUNTIME-HOS-G01-06-D01", "烧毁线圈", "hos_distractor", None),
        ("empty-record-case", "RUNTIME-HOS-G01-06-D02", "空记录壳", "hos_distractor", None),
        ("bent-phase-pin", "RUNTIME-HOS-G01-06-D03", "弯曲相位针", "hos_distractor", None),
    ]
    target_records: list[dict] = []
    item_records: list[dict] = []
    distractor_records: list[dict] = []
    state_object_records: list[dict] = []
    with Image.open(source_props) as sheet_image:
        sheet = sheet_image.convert("RGB")
        cell_w = sheet.width // 4
        cell_h = sheet.height // 2
        for index, (slug, asset_id, name, kind, official_parent) in enumerate(object_specs):
            col, row = index % 4, index // 4
            raw = trim_magenta(
                sheet.crop(
                    (
                        col * cell_w,
                        row * cell_h,
                        (col + 1) * cell_w,
                        (row + 1) * cell_h,
                    )
                )
            )
            folder = (
                "hos"
                if kind in {"hos_target", "hos_distractor"}
                else "items"
                if kind == "item_scene"
                else "states"
            )
            output = PUBLIC / f"scn-g01-06/{folder}/{slug}_scene.png"
            output.parent.mkdir(parents=True, exist_ok=True)
            fit_layer(raw, 512).save(output)
            record = image_record(
                output,
                asset_id,
                name,
                kind,
                official_id=asset_id if asset_id.startswith("ITM-") else None,
            )
            if official_parent:
                record["catalog_id"] = asset_id
                record["official_parent_id"] = official_parent
            if kind == "hos_target":
                target_records.append(record)
            elif kind == "hos_distractor":
                distractor_records.append(record)
            elif kind == "state_object":
                state_object_records.append(record)
            else:
                inventory = output.with_name(f"{slug}_inventory.png")
                fit_layer(raw, 512, 42).save(inventory)
                record["inventory_path"] = rel(inventory)
                record["inventory_sha256"] = sha(inventory)
                item_records.append(record)

    state_specs = [
        (
            "scn-g01-06",
            "signal-detected",
            [(960, 584, 185, (45, 220, 255, 105))],
            None,
        ),
        (
            "scn-g01-06",
            "signal-aligned",
            [(960, 585, 240, (45, 245, 255, 125))],
            [((740, 610), (1180, 610), (85, 245, 255, 180), 9)],
        ),
        (
            "scn-g01-06",
            "authorization-search",
            [(725, 775, 75, (45, 235, 255, 145))],
            None,
        ),
        (
            "scn-g01-06",
            "authorization-analysis",
            [(960, 780, 75, (255, 176, 60, 145))],
            None,
        ),
        (
            "scn-g01-06",
            "authorization-pathfinding",
            [(1190, 775, 75, (55, 245, 210, 150))],
            None,
        ),
        (
            "scn-g01-07",
            "landing-scan-active",
            [(960, 760, 230, (45, 230, 255, 115))],
            None,
        ),
        (
            "scn-g01-07",
            "landing-route-confirmed",
            [(960, 760, 280, (45, 245, 220, 95))],
            [
                ((790, 680), (960, 810), (70, 245, 235, 180), 8),
                ((960, 810), (1130, 680), (70, 245, 235, 180), 8),
            ],
        ),
        (
            "scn-g01-07",
            "impact-warning",
            [(310, 255, 165, (255, 92, 50, 115)), (1550, 230, 125, (255, 160, 50, 90))],
            None,
        ),
        (
            "scn-g01-07",
            "impact-stabilized",
            [(960, 620, 290, (45, 225, 200, 75))],
            None,
        ),
        (
            "scn-g01-07",
            "save-beacon-active",
            [(1505, 630, 150, (70, 245, 255, 140))],
            None,
        ),
        (
            "scn-g01-07",
            "handoff-ready",
            [(260, 545, 145, (255, 185, 75, 120))],
            None,
        ),
    ]
    state_records: list[dict] = []
    for scene_slug, slug, glows, lines in state_specs:
        output = PUBLIC / f"{scene_slug}/states/{slug}.png"
        glow_layer(output, glows, lines)
        record = image_record(
            output,
            f"RUNTIME-STATE-{slug.upper().replace('-', '_')}",
            slug,
            "state_layer",
            source_entry=DANGER_ENTRY if slug == "impact-warning" else PROP_ENTRY,
            source_entry_sha=DANGER_ENTRY_SHA if slug == "impact-warning" else PROP_ENTRY_SHA,
        )
        state_records.append(record)

    scene_records = [
        image_record(
            scene_outputs["SCENE-G01-007"],
            "SCENE-G01-007",
            "远距观测窗与求救波形",
            "scene_background",
            official_id="SCENE-G01-007",
            source_entry=SCENE_ENTRY,
            source_entry_sha=SCENE_ENTRY_SHA,
        ),
        image_record(
            scene_outputs["SCENE-G01-008"],
            "SCENE-G01-008",
            "锈环星近地落点交接",
            "scene_background",
            official_id="SCENE-G01-008",
            source_entry=SCENE_ENTRY,
            source_entry_sha=SCENE_ENTRY_SHA,
        ),
    ]
    closeup_records = [
        image_record(
            path,
            asset_id,
            {
                "RUNTIME-CLOSEUP-G01-06-SIGNAL-RECEIVER": "求救信号接收器近景",
                "RUNTIME-CLOSEUP-G01-06-AUTHORIZATION": "能力授权台近景",
                "RUNTIME-CLOSEUP-G01-07-LANDING-SCANNER": "落点扫描台近景",
            }[asset_id],
            "closeup",
            source_entry=SCENE_ENTRY,
            source_entry_sha=SCENE_ENTRY_SHA,
        )
        for asset_id, path in closeups.items()
    ]

    hos_targets = [
        {
            "item_id": "RUNTIME-ITM-G01-013-PRISM",
            "official_parent_id": "ITM-G01-013",
            "name": "信号记忆棱镜",
            "position": {"x": 8, "y": 15, "width": 17, "height": 27},
            "rotation": -8,
        },
        {
            "item_id": "RUNTIME-ITM-G01-013-COIL",
            "official_parent_id": "ITM-G01-013",
            "name": "调谐线圈",
            "position": {"x": 32, "y": 59, "width": 21, "height": 25},
            "rotation": 7,
        },
        {
            "item_id": "ITM-G01-013",
            "official_parent_id": None,
            "name": "求救记录",
            "position": {"x": 55, "y": 17, "width": 21, "height": 28},
            "rotation": -3,
        },
        {
            "item_id": "RUNTIME-ITM-G01-013-PHASE-KEY",
            "official_parent_id": "ITM-G01-013",
            "name": "相位校准钥",
            "position": {"x": 76, "y": 58, "width": 15, "height": 25},
            "rotation": 14,
        },
    ]
    target_by_id = {record["asset_id"]: record for record in target_records}
    target_by_id.update({record["asset_id"]: record for record in item_records})
    for target in hos_targets:
        record = target_by_id[target["item_id"]]
        target["scene_asset"] = record["runtime_path"]
        target["inventory_asset"] = record.get("inventory_path")
        target["state"] = "available"
        target["source"] = SOURCE_LABEL
        target["sha256"] = record["sha256"]

    distractor_positions = [
        {"x": 15, "y": 61, "width": 18, "height": 24},
        {"x": 59, "y": 58, "width": 19, "height": 25},
        {"x": 80, "y": 21, "width": 13, "height": 24},
    ]
    for record, position in zip(distractor_records, distractor_positions, strict=True):
        record["position"] = position

    source_prompts = {
        "scn06-long-range-observation.png": {
            "use_case": "stylized-concept",
            "purpose": "SCENE-G01-007 recorded generation source",
            "constraints": "16:9; no text; no characters; old salvage ship; distress receiver; three authorization sockets",
        },
        "scn07-old-screen-valley-descent.png": {
            "use_case": "stylized-concept",
            "purpose": "SCENE-G01-008 recorded generation source",
            "constraints": "16:9; no text; no characters; old-screen valley boundary; landing scanner; save beacon",
        },
        "scn06-props-magenta.png": {
            "use_case": "stylized-concept",
            "purpose": "SCN06 HOS, evidence, authorization, and distractor extraction source",
            "constraints": "4x2 isolated prop sheet; flat #ff00ff key; no text; no characters",
        },
    }
    source_files = [
        {
            "path": rel(path),
            "sha256": sha(path),
            "production_method": "openai_builtin_image_generation",
            "authorization": AUTHORIZATION,
            "prompt_record": source_prompts[path.name],
        }
        for path in (source_scn06, source_scn07, source_props)
    ]

    manifest = {
        "schema_version": 1,
        "authorization": AUTHORIZATION,
        "implementation_plan": PLAN,
        "source": SOURCE_LABEL,
        "production_method": "recorded_image_generation_and_deterministic_raster_post_processing",
        "generative_source_recorded": True,
        "source_package": PACKAGE,
        "source_package_sha256": PACKAGE_SHA,
        "formal_source_entries": [
            {"path": SCENE_ENTRY, "sha256": SCENE_ENTRY_SHA},
            {"path": PROP_ENTRY, "sha256": PROP_ENTRY_SHA},
            {"path": DANGER_ENTRY, "sha256": DANGER_ENTRY_SHA},
        ],
        "source_files": source_files,
        "scenes": scene_records,
        "closeups": closeup_records,
        "items": item_records + state_object_records,
        "hos_targets": target_records,
        "distractors": distractor_records,
        "state_layers": state_records,
        "hos": {
            "catalog_id": "RUNTIME-HOS-G01-06-SIGNAL-TRACE",
            "official_id": None,
            "formal_parent_hotspot_id": "HS-G01-0025",
            "formal_parent_item_id": "ITM-G01-013",
            "targets": hos_targets,
            "distractors": distractor_records,
            "completion_refreshes": False,
        },
        "runtime_adapters": [
            {
                "catalog_id": "RUNTIME-HOS-G01-06-SIGNAL-TRACE",
                "official_id": None,
                "formal_parent_id": "HS-G01-0025",
                "reason": "The formal G01 HOS table ends at HOS-G01-004; Issue #9 requires a real SCN06 HOS without inventing an official ID.",
            },
            {
                "catalog_id": "RUNTIME-CLOSEUP-G01-07-LANDING-SCANNER",
                "official_id": None,
                "formal_parent_id": "HS-G01-0029",
                "reason": "Runtime local-zoom adapter for the formal landing scan hotspot.",
            },
        ],
        "runtime_asset": True,
    }
    manifest_path = DATA / "runtime-art-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    provenance = {
        "authorization": AUTHORIZATION,
        "implementation_plan": PLAN,
        "source_label": SOURCE_LABEL,
        "package": PACKAGE,
        "package_sha256": PACKAGE_SHA,
        "generative_source_recorded": True,
        "source_files": source_files,
        "processing": [
            "4K Lanczos background fitting",
            "deterministic console crop and 1920x1080 closeup fitting",
            "flat-magenta chroma extraction with soft antialias matte",
            "RGBA object fitting",
            "deterministic raster glow/state-layer composition",
            "SHA-256 manifest generation",
        ],
        "forbidden_sources": {
            "pr_5": False,
            "third_party_web_assets": False,
            "unrecorded_generation": False,
            "design_board_direct_runtime_use": False,
        },
    }
    (DOCS / "G01_PR_C_RUNTIME_ASSET_PROVENANCE.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    runtime_paths: list[Path] = []
    for records in (
        scene_records,
        closeup_records,
        item_records,
        state_object_records,
        target_records,
        distractor_records,
        state_records,
    ):
        runtime_paths.extend(ROOT / record["runtime_path"] for record in records)
        for record in records:
            if record.get("inventory_path"):
                runtime_paths.append(ROOT / record["inventory_path"])
    sha_lines = [f"{sha(path)}  {rel(path)}" for path in sorted(set(runtime_paths))]
    (DOCS / "G01_PR_C_RUNTIME_ASSET_SHA256.txt").write_text(
        "\n".join(sha_lines) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "scenes": len(scene_records),
                "closeups": len(closeup_records),
                "items_and_targets": len(item_records)
                + len(state_object_records)
                + len(target_records),
                "distractors": len(distractor_records),
                "state_layers": len(state_records),
                "sha_records": len(sha_lines),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
