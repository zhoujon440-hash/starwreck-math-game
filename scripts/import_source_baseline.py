#!/usr/bin/env python3
"""Deterministically import the Issue #6 source baseline.

The script copies verified source archives, extracts searchable DOCX/CSV/JSON
content, builds the G01-G13 indexes, and normalizes the 71-character / 488-asset
catalogs. It does not create runtime assets or gameplay content.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import shutil
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from xml.etree import ElementTree as ET

import openpyxl


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"
REPO_ROOT: Path | None = None


@dataclass(frozen=True)
class PackageSpec:
    package_id: str
    filename: str
    version: str
    purpose: str
    expected_sha256: str
    expected_bytes: int
    authority: str
    source_location: str = "downloads"


PACKAGES: tuple[PackageSpec, ...] = (
    PackageSpec(
        "PKG-PRODUCT-PLAN-V1.1",
        "星骸拾荒者_开发前资料与计划确认包_V1.1_星宇确认版.zip",
        "V1.1",
        "产品、教育、计划与开发前门禁冻结文档",
        "ed51f0f9e6e68eae09fd97fe85b7481b688b93ed06099e0bb1cf9e46090115f2",
        291026,
        "Issue #6 confirmed baseline",
    ),
    PackageSpec(
        "PKG-G02-SCRIPT-FREEZE-V1.0",
        "星骸拾荒者_G02制作脚本总封版与S2启动确认包_V1.0.zip",
        "V1.0",
        "G-S1计划、总封版索引与G-SCR-01—05冻结文本",
        "2cc04b0a73275af35b8b905ee836123af704d04aea1695e943c38d94d535085e",
        463087,
        "Issue #6 confirmed baseline",
    ),
    PackageSpec(
        "PKG-CHARACTERS-V2.1",
        "星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip",
        "V2.1",
        "71人物设计/生产母版与全项目美术资产主清单",
        "a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb",
        74253878,
        "SOURCE_PACKAGE_MANIFEST + Issue #6",
    ),
    PackageSpec(
        "PKG-SCENES-V1.0",
        "星骸拾荒者_场景美术设计全集_V1.0.zip",
        "V1.0",
        "91场景设计/生产母版",
        "731cc680ee98eba1bf27474d4d613476dbbe02ca7fff7dfb1beb4b2bb0595de0",
        47905077,
        "SOURCE_PACKAGE_MANIFEST + Issue #6",
        "scene_bundle",
    ),
    PackageSpec(
        "PKG-PROPS-V3.0",
        "星骸拾荒者_道具美术正式包_V3.0.zip",
        "V3.0",
        "PROP-001—046道具设计/生产母版",
        "f712245f25945b234fd73d794b3ff6d6be39744da3a56324a34706ee85f6aa2d",
        31998862,
        "SOURCE_PACKAGE_MANIFEST + Issue #4/#6",
    ),
    PackageSpec(
        "PKG-MECH-V2.0",
        "星骸拾荒者_机制可视化HOPA正式包_V2.0.zip",
        "V2.0",
        "MECH-001—047机制可视化设计/生产母版",
        "de7367d1ec06f97d3b8cca3c671ca9680f522f714929997d4a60fd9af1678b2f",
        39204379,
        "SOURCE_PACKAGE_MANIFEST + Issue #4/#6",
    ),
    PackageSpec(
        "PKG-UI-V2.0",
        "星骸拾荒者_界面美术HOPA正式包_V2.0.zip",
        "V2.0",
        "UI-001—083界面设计/生产母版",
        "827d4262dcf68acf50abdbe77a63192c78cc7b44bf588b389bcbdc612e1d537a",
        49547246,
        "SOURCE_PACKAGE_MANIFEST + Issue #6",
    ),
    PackageSpec(
        "PKG-G02-G13-HOPA-V2.0",
        "星骸拾荒者_G02-G13全章节HOPA实施脚本_V2.0.zip",
        "V2.0",
        "G02—G13完整HOPA实施脚本",
        "f8b9d6f628cac99e5ba799d9cac2f630c45650cf0489dad548de31f569e7eb35",
        762114,
        "SOURCE_PACKAGE_MANIFEST + Issue #4/#6",
    ),
    PackageSpec(
        "PKG-G02-DATA-V2.1",
        "星骸拾荒者_G02锈环星_Unity数据级制作脚本_V2.1.zip",
        "V2.1",
        "G02结构化制作母本（非Unity工程路线）",
        "20d755a73ac1715960cf2c5c5a95b89414d86c9c26c47be76b0a4e6fe5eeb92a",
        119980,
        "Issue #4 supplemental SHA",
    ),
    PackageSpec(
        "PKG-G03-DATA-V2.1",
        "星骸拾荒者_G03齿轮荒原_Unity数据级制作脚本_V2.1.zip",
        "V2.1",
        "G03结构化制作母本（非Unity工程路线）",
        "409ab1be9a180d60eec1d4a15cb6917f628ae4d06d76ee34752d0f621185035b",
        114204,
        "locally observed supplemental package",
    ),
    PackageSpec(
        "PKG-HOPA-FX001-V1.0",
        "星骸拾荒者_HOPA架构与FX-001确认包_V1.0.zip",
        "V1.0",
        "HOPA架构、FX-001全文与四张设计/生产母版",
        "87e1c9f66c5c674c598f62ed69488d6417698aae78666cf749751cb8e93c4ae8",
        1282627,
        "Issue #4 supplemental SHA + Issue #6",
    ),
)


MISSING_REQUIRED: tuple[dict[str, Any], ...] = (
    {
        "source_id": "PKG-G01-V3.0",
        "name": "G01整合正式包 V3.0",
        "expected_filename": "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0.zip",
        "expected_sha256": "85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043",
        "expected_bytes": 2901474,
        "impact": "G01全文、结构化数据与33项新增资产的正式名称/ID无法导入",
    },
    {
        "source_id": "PKG-G02-G13-DATA-V2.1",
        "name": "G02—G13数据级制作脚本完整包 V2.1",
        "expected_filename": "星骸拾荒者_G02-G13_Unity数据级制作脚本完整包_V2.1.zip",
        "expected_sha256": "4db2cbb67e688aa7b55b5fe509f38377577e25a2259df3011c105f7c52c59708",
        "expected_bytes": 1112954,
        "impact": "仅G02和G03独立数据包可用；G04—G13结构化母本缺失",
    },
    {
        "source_id": "PKG-FX-V2.0",
        "name": "技能/装备效果HOPA正式包 V2.0",
        "expected_filename": "星骸拾荒者_技能与装备效果HOPA正式包_V2.0.zip",
        "expected_sha256": "882e933ca90917c37a6cd3c88d5988a2ce0ce8c6dbaf1d86e5f29102290ee5e1",
        "expected_bytes": 30540605,
        "impact": "FX-001—041只能由美术主清单建立索引，无法保留V2设计板原包",
    },
    {
        "source_id": "PKG-DANGER-V2.0",
        "name": "危险视觉HOPA正式包 V2.0",
        "expected_filename": "星骸拾荒者_危险视觉HOPA正式包_V2.0.zip",
        "expected_sha256": "981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b",
        "expected_bytes": 61745430,
        "impact": "DANGER-001—076只能建立可追踪初始槽位，无法保留V2设计板原包",
    },
    {
        "source_id": "DOC-G-S2-D01-V1.0",
        "name": "G-S2-D01 S2视觉总方向关键决策清单 V1.0",
        "expected_filename": "G-S2-D01_*_V1.0*.docx",
        "expected_sha256": None,
        "expected_bytes": None,
        "impact": "仅发现V0.9待确认版，不能冒充冻结V1.0",
    },
    {
        "source_id": "DOC-G-S2-CHG-01-V1.0",
        "name": "G-S2-CHG-01 V1.0",
        "expected_filename": "G-S2-CHG-01_*_V1.0*.docx",
        "expected_sha256": None,
        "expected_bytes": None,
        "impact": "正式视觉变更记录缺失",
    },
    {
        "source_id": "DOC-G-CHAR-01-V1.0",
        "name": "G-CHAR-01 星宇布偶C方案 V1.0",
        "expected_filename": "G-CHAR-01_*_V1.0*.docx",
        "expected_sha256": None,
        "expected_bytes": None,
        "impact": "星宇布偶C方案仅登记为已确认，正式文本未找到",
    },
    {
        "source_id": "DOC-G-ANIM-01-V1.0",
        "name": "G-ANIM-01 V1.0",
        "expected_filename": "G-ANIM-01_*_V1.0*.docx",
        "expected_sha256": None,
        "expected_bytes": None,
        "impact": "正式动画规范文本未找到",
    },
    {
        "source_id": "DOC-G02-BOUNDARY-V2.2",
        "name": "G02开场边界 V2.2",
        "expected_filename": "*G02*边界*V2.2*.docx",
        "expected_sha256": None,
        "expected_bytes": None,
        "impact": "无法导入独立V2.2原文；仓库现有06_G01_G02_BOUNDARY仅作为确认规则摘要",
    },
)


PRODUCT_DOCS = {
    "G-PROD-01_": "G-PROD-01_V1.1.md",
    "G-EDU-01_": "G-EDU-01_V1.0.md",
    "G-GDD-G02_": "G-GDD-G02_V1.1.md",
    "G-PLAN-01_": "G-PLAN-01_V1.1.md",
    "G-DOC-GATE-01_": "G-DOC-GATE-01_V1.3.md",
    "G-ARCH-M01_": "G-ARCH-M01_V4.3.md",
    "G-DOC-CONF-01_": "G-DOC-CONF-01_V1.0.md",
}

G02_FREEZE_DOCS = {
    "G-S1-PLAN-01_": "G-S1-PLAN-01_V2.0.md",
    "G-S1-CLOSE-01_": "G-S1-CLOSE-01_V1.0.md",
    "G-SCR-01_": "G-SCR-01_V1.0.md",
    "G-SCR-02_": "G-SCR-02_V1.0.md",
    "G-SCR-03_": "G-SCR-03_V1.0.md",
    "G-SCR-04_": "G-SCR-04_V1.0.md",
    "G-SCR-05_": "G-SCR-05_V1.0.md",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repository_path(path: Path) -> str:
    if REPO_ROOT is None:
        raise RuntimeError("repository root has not been initialized")
    return path.resolve().relative_to(REPO_ROOT).as_posix()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    headers: list[str] = []
    for row in rows:
        for key in row:
            if key not in headers:
                headers.append(key)
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def package_path(spec: PackageSpec, downloads: Path) -> Path:
    if spec.source_location == "scene_bundle":
        return downloads / "星骸拾荒者_美术设计全集" / spec.filename
    return downloads / spec.filename


def verify_and_copy_packages(
    downloads: Path, originals_dir: Path
) -> tuple[dict[str, Path], list[dict[str, Any]]]:
    originals_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    manifest: list[dict[str, Any]] = []
    errors: list[str] = []
    for spec in PACKAGES:
        source = package_path(spec, downloads)
        if not source.is_file():
            errors.append(f"missing local source: {source}")
            continue
        observed_size = source.stat().st_size
        observed_sha = sha256_file(source)
        if observed_size != spec.expected_bytes:
            errors.append(
                f"{spec.filename}: bytes {observed_size} != {spec.expected_bytes}"
            )
        if observed_sha != spec.expected_sha256:
            errors.append(
                f"{spec.filename}: sha256 {observed_sha} != {spec.expected_sha256}"
            )
        destination = originals_dir / spec.filename
        if not destination.exists() or sha256_file(destination) != observed_sha:
            shutil.copy2(source, destination)
        paths[spec.package_id] = destination
        manifest.append(
            {
                "package_id": spec.package_id,
                "filename": spec.filename,
                "version": spec.version,
                "purpose": spec.purpose,
                "authority": spec.authority,
                "status": "imported_verified",
                "expected_bytes": spec.expected_bytes,
                "observed_bytes": observed_size,
                "expected_sha256": spec.expected_sha256,
                "observed_sha256": observed_sha,
                "repository_path": repository_path(destination),
                "original_discovery_path": (
                    f"Downloads/星骸拾荒者_美术设计全集/{spec.filename}"
                    if spec.source_location == "scene_bundle"
                    else f"Downloads/{spec.filename}"
                ),
                "storage": "git_lfs",
            }
        )
    if errors:
        raise RuntimeError("\n".join(errors))
    return paths, manifest


def style_names_from_docx(archive: zipfile.ZipFile) -> dict[str, str]:
    if "word/styles.xml" not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read("word/styles.xml"))
    styles: dict[str, str] = {}
    for style in root.findall(f".//{W}style"):
        style_id = style.get(f"{W}styleId")
        name = style.find(f"{W}name")
        if style_id and name is not None:
            styles[style_id] = name.get(f"{W}val", style_id)
    return styles


def paragraph_text(paragraph: ET.Element) -> str:
    pieces: list[str] = []
    for element in paragraph.iter():
        if element.tag == f"{W}t":
            pieces.append(element.text or "")
        elif element.tag == f"{W}tab":
            pieces.append("\t")
        elif element.tag in {f"{W}br", f"{W}cr"}:
            pieces.append("\n")
    return "".join(pieces).strip()


def paragraph_markdown(paragraph: ET.Element, styles: dict[str, str]) -> str:
    text = paragraph_text(paragraph)
    if not text:
        return ""
    style = paragraph.find(f"./{W}pPr/{W}pStyle")
    style_name = ""
    if style is not None:
        style_id = style.get(f"{W}val", "")
        style_name = styles.get(style_id, style_id).lower()
    heading_match = re.search(r"(?:heading|标题)\s*([1-6])", style_name)
    if heading_match:
        return f"{'#' * int(heading_match.group(1))} {text}"
    return text


def table_markdown(table: ET.Element, styles: dict[str, str]) -> str:
    rows: list[list[str]] = []
    for tr in table.findall(f"./{W}tr"):
        row: list[str] = []
        for tc in tr.findall(f"./{W}tc"):
            paragraphs = [
                paragraph_markdown(p, styles).lstrip("# ").strip()
                for p in tc.findall(f".//{W}p")
            ]
            cell = "<br>".join(value for value in paragraphs if value)
            row.append(cell.replace("|", "\\|"))
        if row:
            rows.append(row)
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    output = [
        "| " + " | ".join(padded[0]) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    output.extend("| " + " | ".join(row) + " |" for row in padded[1:])
    return "\n".join(output)


def document_blocks(container: ET.Element, styles: dict[str, str]) -> Iterable[str]:
    for child in list(container):
        if child.tag == f"{W}p":
            value = paragraph_markdown(child, styles)
            if value:
                yield value
        elif child.tag == f"{W}tbl":
            value = table_markdown(child, styles)
            if value:
                yield value
        else:
            yield from document_blocks(child, styles)


def docx_to_markdown(
    data: bytes,
    *,
    package_id: str,
    source_entry: str,
    version: str,
    purpose: str,
) -> tuple[str, dict[str, Any]]:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
        styles = style_names_from_docx(archive)
    body = root.find(f".//{W}body")
    if body is None:
        raise ValueError(f"DOCX has no word body: {source_entry}")
    blocks = list(document_blocks(body, styles))
    xml_text_nodes = root.findall(f".//{W}t")
    source_chars = sum(len(node.text or "") for node in xml_text_nodes)
    captured_chars = sum(
        len(node.text or "") for node in body.findall(f".//{W}t")
    )
    source_hash = sha256_bytes(data)
    metadata = (
        "---\n"
        f"source_package: {package_id}\n"
        f"source_entry: {json.dumps(source_entry, ensure_ascii=False)}\n"
        f"source_sha256: {source_hash}\n"
        f"version: {version}\n"
        f"purpose: {json.dumps(purpose, ensure_ascii=False)}\n"
        "extraction: full_text_and_tables_from_ooxml\n"
        "runtime_asset: false\n"
        "---\n\n"
    )
    markdown = metadata + "\n\n".join(blocks).strip() + "\n"
    stats = {
        "source_entry": source_entry,
        "source_sha256": source_hash,
        "source_wt_nodes": len(xml_text_nodes),
        "source_text_characters": source_chars,
        "captured_text_characters": captured_chars,
        "coverage_ratio": 1 if source_chars == captured_chars else 0,
        "markdown_characters": len(markdown),
    }
    return markdown, stats


def find_entry(archive: zipfile.ZipFile, predicate: Any) -> str:
    matches = [name for name in archive.namelist() if predicate(name)]
    if len(matches) != 1:
        raise ValueError(f"expected one ZIP entry, found {len(matches)}: {matches}")
    return matches[0]


def record_extraction(
    records: list[dict[str, Any]],
    *,
    output: Path,
    package_id: str,
    entry: str,
    source_data: bytes,
    extraction: str,
) -> None:
    records.append(
        {
            "output_path": repository_path(output),
            "output_sha256": sha256_file(output),
            "source_package": package_id,
            "source_entry": entry,
            "source_entry_sha256": sha256_bytes(source_data),
            "extraction": extraction,
        }
    )


def extract_docx_entry(
    package: Path,
    package_id: str,
    entry: str,
    output: Path,
    version: str,
    purpose: str,
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    with zipfile.ZipFile(package) as archive:
        data = archive.read(entry)
    markdown, stats = docx_to_markdown(
        data,
        package_id=package_id,
        source_entry=entry,
        version=version,
        purpose=purpose,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown, encoding="utf-8")
    record_extraction(
        records,
        output=output,
        package_id=package_id,
        entry=entry,
        source_data=data,
        extraction="docx_full_text_and_tables_to_markdown",
    )
    stats["output_path"] = repository_path(output)
    return stats


def extract_named_docs(
    package: Path,
    package_id: str,
    mapping: dict[str, str],
    output_dir: Path,
    version: str,
    purpose: str,
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    stats: list[dict[str, Any]] = []
    with zipfile.ZipFile(package) as archive:
        names = archive.namelist()
    for prefix, output_name in mapping.items():
        entry = next(
            (
                name
                for name in names
                if PurePosixPath(name).name.startswith(prefix)
                and name.lower().endswith(".docx")
            ),
            None,
        )
        if entry is None:
            raise ValueError(f"{package.name}: missing required entry prefix {prefix}")
        stats.append(
            extract_docx_entry(
                package,
                package_id,
                entry,
                output_dir / output_name,
                version,
                purpose,
                records,
            )
        )
    return stats


def extract_story_docs(
    package: Path,
    repo: Path,
    records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    story_dir = repo / "docs/story/G01-G13"
    story_dir.mkdir(parents=True, exist_ok=True)
    g01 = story_dir / "G01.md"
    g01.write_text(
        "---\n"
        "chapter: G01\n"
        "status: missing_formal_source\n"
        "required_source: G01整合正式包 V3.0\n"
        "runtime_asset: false\n"
        "---\n\n"
        "# G01 正式源文缺失\n\n"
        "未找到与负责人清单 SHA 对应的 G01 V3.0 正式包；本文件只登记缺口，"
        "不以现有实现、旧脚本或摘要冒充正式全文。\n",
        encoding="utf-8",
    )
    stats: list[dict[str, Any]] = []
    index: list[dict[str, Any]] = [
        {
            "chapter": "G01",
            "status": "missing_formal_source",
            "version": "V3.0",
            "path": "docs/story/G01-G13/G01.md",
        }
    ]
    with zipfile.ZipFile(package) as archive:
        entries = [
            name
            for name in archive.namelist()
            if name.lower().endswith(".docx")
        ]
    for chapter_number in range(2, 14):
        chapter = f"G{chapter_number:02d}"
        entry = next(
            (
                name
                for name in entries
                if re.search(fr"_{chapter}_", PurePosixPath(name).name)
                and "更新总说明" not in name
            ),
            None,
        )
        if entry is None:
            raise ValueError(f"missing story DOCX for {chapter}")
        output = story_dir / f"{chapter}.md"
        chapter_stats = extract_docx_entry(
            package,
            "PKG-G02-G13-HOPA-V2.0",
            entry,
            output,
            "V2.0",
            f"{chapter} HOPA实施脚本正式全文",
            records,
        )
        stats.append({"chapter": chapter, **chapter_stats})
        index.append(
            {
                "chapter": chapter,
                "status": "imported_verified",
                "version": "V2.0",
                "path": output.relative_to(repo).as_posix(),
                "source_entry": entry,
                "source_sha256": chapter_stats["source_sha256"],
                "coverage_ratio": chapter_stats["coverage_ratio"],
            }
        )
    with zipfile.ZipFile(package) as archive:
        notes_entry = next(
            name for name in entries if "更新总说明" in name
        )
    stats.append(
        {
            "chapter": "G02-G13-NOTES",
            **extract_docx_entry(
                package,
                "PKG-G02-G13-HOPA-V2.0",
                notes_entry,
                story_dir / "HOPA_UPDATE_NOTES_V2.0.md",
                "V2.0",
                "G02—G13全章节脚本更新总说明",
                records,
            ),
        }
    )
    write_json(story_dir / "index.json", index)
    return stats, index


def extract_data_package(
    package: Path,
    package_id: str,
    chapter: str,
    repo: Path,
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    output_root = repo / "data/source/g02-g13" / chapter
    output_root.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(package) as archive:
        names = archive.namelist()
        docx_entry = find_entry(
            archive,
            lambda name: name.lower().endswith(".docx") and "制作脚本说明" in name,
        )
    doc_stats = extract_docx_entry(
        package,
        package_id,
        docx_entry,
        output_root / "README.md",
        "V2.1",
        f"{chapter}结构化制作母本说明；不代表Unity运行时路线",
        records,
    )
    file_index: list[dict[str, Any]] = []
    with zipfile.ZipFile(package) as archive:
        for entry in names:
            normalized = PurePosixPath(entry)
            if "02_CSV数据表" in normalized.parts and entry.lower().endswith(".csv"):
                destination = output_root / "csv" / normalized.name
                extraction = "verbatim_csv"
            elif "03_JSON数据" in normalized.parts and entry.lower().endswith(".json"):
                destination = output_root / "json" / normalized.name
                extraction = "verbatim_json"
            else:
                continue
            data = archive.read(entry)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            record_extraction(
                records,
                output=destination,
                package_id=package_id,
                entry=entry,
                source_data=data,
                extraction=extraction,
            )
            file_index.append(
                {
                    "path": destination.relative_to(repo).as_posix(),
                    "source_entry": entry,
                    "sha256": sha256_bytes(data),
                    "format": destination.suffix.lstrip("."),
                }
            )
    write_json(output_root / "index.json", file_index)
    return {
        "chapter": chapter,
        "status": "imported_verified",
        "version": "V2.1",
        "package_id": package_id,
        "description_coverage_ratio": doc_stats["coverage_ratio"],
        "files": len(file_index),
        "path": output_root.relative_to(repo).as_posix(),
    }


def xlsx_master_from_character_package(package: Path) -> tuple[bytes, str]:
    with zipfile.ZipFile(package) as archive:
        entry = find_entry(
            archive,
            lambda name: name.endswith("星骸拾荒者_全项目美术资产主清单_V1.0.xlsx"),
        )
        return archive.read(entry), entry


def sheet_rows(
    workbook: openpyxl.Workbook, sheet_name: str, id_prefix: str
) -> list[dict[str, Any]]:
    sheet = workbook[sheet_name]
    header_values = [cell.value for cell in sheet[4]]
    headers = [str(value).strip() if value is not None else "" for value in header_values]
    rows: list[dict[str, Any]] = []
    for values in sheet.iter_rows(min_row=5, values_only=True):
        asset_id = values[0]
        if not isinstance(asset_id, str) or not asset_id.startswith(f"{id_prefix}-"):
            continue
        row: dict[str, Any] = {}
        for index, header in enumerate(headers):
            if not header or index >= len(values):
                continue
            value = values[index]
            if value is not None:
                row[header] = value
        rows.append(row)
    return rows


def normalize_asset_row(
    source: dict[str, Any], domain: str, source_sheet: str
) -> dict[str, Any]:
    name = (
        source.get("人物名称")
        or source.get("场景名称")
        or source.get("名称")
        or source.get("资产ID")
    )
    return {
        "catalog_id": source["资产ID"],
        "official_id": source["资产ID"],
        "domain": domain,
        "name": name,
        "chapter": source.get("星球编号") or source.get("范围"),
        "scope": source.get("星球/范围") or source.get("星球") or source.get("范围"),
        "type": source.get("类别") or source.get("类型"),
        "maturity": source.get("当前状态"),
        "priority": source.get("优先级"),
        "source_sheet": source_sheet,
        "source_status": "indexed_from_confirmed_master",
        "runtime_asset": False,
    }


def build_catalogs(
    package: Path,
    repo: Path,
    records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data, entry = xlsx_master_from_character_package(package)
    workbook = openpyxl.load_workbook(io.BytesIO(data), data_only=False)
    tables = {
        "characters": sheet_rows(workbook, "人物清单", "CHAR"),
        "scenes": sheet_rows(workbook, "场景清单", "SCN"),
        "props": sheet_rows(workbook, "装备道具", "PROP"),
        "fx": sheet_rows(workbook, "技能特效", "FX"),
        "mech": sheet_rows(workbook, "玩法机制", "MECH"),
        "ui": sheet_rows(workbook, "UI清单", "UI"),
        "hazards": sheet_rows(workbook, "敌人与危险", "HAZ"),
    }
    expected = {
        "characters": 71,
        "scenes": 91,
        "props": 46,
        "fx": 41,
        "mech": 47,
        "ui": 83,
        "hazards": 32,
    }
    observed = {key: len(value) for key, value in tables.items()}
    if observed != expected:
        raise ValueError(f"master catalog counts mismatch: {observed} != {expected}")

    catalogs_dir = repo / "data/source/catalogs"
    characters = tables["characters"]
    write_json(catalogs_dir / "characters-71.json", characters)
    write_csv(catalogs_dir / "characters-71.csv", characters)

    assets: list[dict[str, Any]] = []
    assets.extend(
        normalize_asset_row(row, "character", "人物清单")
        for row in tables["characters"]
    )
    assets.extend(
        normalize_asset_row(row, "scene", "场景清单") for row in tables["scenes"]
    )
    assets.extend(
        normalize_asset_row(row, "prop", "装备道具") for row in tables["props"]
    )
    assets.extend(
        normalize_asset_row(row, "fx", "技能特效") for row in tables["fx"]
    )
    assets.extend(
        normalize_asset_row(row, "mechanism", "玩法机制")
        for row in tables["mech"]
    )
    assets.extend(normalize_asset_row(row, "ui", "UI清单") for row in tables["ui"])

    danger_rows: list[dict[str, Any]] = []
    for index, row in enumerate(tables["hazards"], start=1):
        danger_rows.append(
            {
                "catalog_id": f"DANGER-{index:03d}",
                "official_id": f"DANGER-{index:03d}",
                "domain": "danger",
                "name": row.get("名称"),
                "chapter": row.get("范围"),
                "scope": row.get("范围"),
                "type": row.get("类型"),
                "maturity": row.get("当前状态"),
                "priority": None,
                "source_sheet": "敌人与危险",
                "source_status": "normalized_from_HAZ_base_design; V2_package_missing",
                "source_id": row.get("资产ID"),
                "runtime_asset": False,
            }
        )
    shared = tables["hazards"][6:10]
    chapter_names = [
        ("G03", "齿轮荒原"),
        ("G04", "镜面沙海"),
        ("G05", "刻度冰原"),
        ("G06", "分片群岛"),
        ("G07", "方格城"),
        ("G08", "钟摆之城"),
        ("G09", "棋阵卫星"),
        ("G10", "概率云港"),
        ("G11", "立体工厂"),
        ("G12", "百工星环"),
        ("G13", "零号地球"),
    ]
    danger_index = 33
    for source in shared:
        for chapter, planet in chapter_names:
            danger_rows.append(
                {
                    "catalog_id": f"DANGER-{danger_index:03d}",
                    "official_id": f"DANGER-{danger_index:03d}",
                    "domain": "danger",
                    "name": f"{source.get('名称')}·{planet}皮肤",
                    "chapter": chapter,
                    "scope": planet,
                    "type": "共享原型星球化视觉应用",
                    "maturity": source.get("当前状态"),
                    "priority": None,
                    "source_sheet": "敌人与危险",
                    "source_status": (
                        "expanded_from_explicit_4x11_skin_rule; V2_package_missing"
                    ),
                    "source_id": source.get("资产ID"),
                    "runtime_asset": False,
                }
            )
            danger_index += 1
    if len(danger_rows) != 76:
        raise ValueError(f"danger visual catalog must have 76 rows, got {len(danger_rows)}")
    assets.extend(danger_rows)

    for index in range(1, 34):
        assets.append(
            {
                "catalog_id": f"G01-SLOT-{index:03d}",
                "official_id": None,
                "domain": "g01_addition",
                "name": None,
                "chapter": "G01",
                "scope": "序章正式包",
                "type": "待G01 V3.0正式包提供",
                "maturity": "source_missing",
                "priority": None,
                "source_sheet": None,
                "source_status": "inventory_slot_only; no official ID invented",
                "runtime_asset": False,
            }
        )

    domain_counts: dict[str, int] = {}
    for row in assets:
        domain_counts[row["domain"]] = domain_counts.get(row["domain"], 0) + 1
    expected_domains = {
        "character": 71,
        "scene": 91,
        "prop": 46,
        "fx": 41,
        "mechanism": 47,
        "danger": 76,
        "ui": 83,
        "g01_addition": 33,
    }
    if len(assets) != 488 or domain_counts != expected_domains:
        raise ValueError(
            f"asset catalog mismatch: total={len(assets)}, domains={domain_counts}"
        )
    write_json(
        catalogs_dir / "asset-catalog-488.json",
        {
            "schema_version": 1,
            "total": len(assets),
            "domain_counts": domain_counts,
            "source_package": "PKG-CHARACTERS-V2.1",
            "source_entry": entry,
            "caveats": [
                "DANGER V2原包缺失；76项由主清单的32基础项和4×11明确皮肤规则建立可追踪初始索引。",
                "G01 V3.0原包缺失；33项仅建立库存槽位，不生成正式ID、名称或美术。",
                "所有美术条目均为设计/生产母版索引，不是运行时资产。",
            ],
            "assets": assets,
        },
    )
    write_csv(catalogs_dir / "asset-catalog-488.csv", assets)
    write_json(
        catalogs_dir / "master-workbook-counts.json",
        {
            "source_package": "PKG-CHARACTERS-V2.1",
            "source_entry": entry,
            "source_entry_sha256": sha256_bytes(data),
            "counts": observed,
            "normalized_asset_total": 488,
            "design_or_production_master": True,
            "runtime_asset": False,
        },
    )
    for output in (
        catalogs_dir / "characters-71.json",
        catalogs_dir / "characters-71.csv",
        catalogs_dir / "asset-catalog-488.json",
        catalogs_dir / "asset-catalog-488.csv",
        catalogs_dir / "master-workbook-counts.json",
    ):
        record_extraction(
            records,
            output=output,
            package_id="PKG-CHARACTERS-V2.1",
            entry=entry,
            source_data=data,
            extraction="xlsx_table_normalization",
        )
    return characters, assets


def extract_art_catalog(
    package: Path,
    package_id: str,
    entry_suffix: str,
    output: Path,
    records: list[dict[str, Any]],
) -> None:
    with zipfile.ZipFile(package) as archive:
        entry = find_entry(archive, lambda name: name.endswith(entry_suffix))
        data = archive.read(entry)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    record_extraction(
        records,
        output=output,
        package_id=package_id,
        entry=entry,
        source_data=data,
        extraction="verbatim_csv",
    )


def extract_hopa_and_fx(
    package: Path,
    repo: Path,
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    output_dir = repo / "docs/baseline/source_text/hopa"
    stats: list[dict[str, Any]] = []
    with zipfile.ZipFile(package) as archive:
        names = archive.namelist()
    docs = {
        "星骸拾荒者_HOPA玩法与技术架构冻结修正版_V1.0.docx": (
            output_dir / "HOPA_ARCHITECTURE_V1.0.md",
            "HOPA玩法与技术架构冻结修正版完整文本",
        ),
        "星骸拾荒者_FX-001星宇瞬移_HOPA交互效果详细设计_V1.0.docx": (
            output_dir / "FX-001_V1.0.md",
            "FX-001 HOPA交互效果详细设计完整文本",
        ),
    }
    for filename, (output, purpose) in docs.items():
        entry = next(name for name in names if PurePosixPath(name).name == filename)
        stats.append(
            extract_docx_entry(
                package,
                "PKG-HOPA-FX001-V1.0",
                entry,
                output,
                "V1.0",
                purpose,
                records,
            )
        )
    masters_dir = repo / "docs/baseline/production-masters/hopa-fx001"
    for filename in (
        "HOPA核心循环_冻结版.png",
        "HOPA场景分层与热点架构.png",
        "HOPA技术模块架构.png",
        "FX-001星宇瞬移_HOPA交互流程.png",
    ):
        entry = next(name for name in names if PurePosixPath(name).name == filename)
        with zipfile.ZipFile(package) as archive:
            data = archive.read(entry)
        output = masters_dir / filename
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(data)
        record_extraction(
            records,
            output=output,
            package_id="PKG-HOPA-FX001-V1.0",
            entry=entry,
            source_data=data,
            extraction="verbatim_design_production_master",
        )
    (masters_dir / "README.md").write_text(
        "# HOPA 与 FX-001 设计/生产母版\n\n"
        "本目录四张 PNG 均从已校验的 HOPA 架构与 FX-001 确认包逐字节提取，"
        "用途是设计、生产和验收参考；它们不是游戏运行时资产。\n",
        encoding="utf-8",
    )
    return stats


def write_completeness_report(
    repo: Path, story_stats: list[dict[str, Any]]
) -> None:
    rows = [
        "| 章节 | DOCX文本字符 | 捕获字符 | 覆盖率 | Markdown |",
        "| --- | ---: | ---: | ---: | --- |",
    ]
    rows.append("| G01 | — | — | 0%（正式V3.0源包缺失） | `G01.md`缺口登记 |")
    for item in story_stats:
        if not re.fullmatch(r"G\d{2}", item["chapter"]):
            continue
        rows.append(
            f"| {item['chapter']} | {item['source_text_characters']} | "
            f"{item['captured_text_characters']} | "
            f"{item['coverage_ratio'] * 100:.0f}% | "
            f"`{PurePosixPath(item['output_path']).name}` |"
        )
    output = repo / "docs/story/G01-G13/COMPLETENESS_REPORT.md"
    output.write_text(
        "# G01—G13 Markdown / DOCX 完整性报告\n\n"
        "覆盖率按 DOCX `word/document.xml` 中全部 `w:t` 文本节点字符数与提取器"
        "捕获字符数核对。表格和正文均进入 Markdown；不把摘要当作全文。\n\n"
        + "\n".join(rows)
        + "\n",
        encoding="utf-8",
    )


def write_data_index(repo: Path, present: list[dict[str, Any]]) -> None:
    by_chapter = {item["chapter"]: item for item in present}
    index: list[dict[str, Any]] = []
    for number in range(1, 14):
        chapter = f"G{number:02d}"
        if chapter == "G01":
            status = {
                "chapter": chapter,
                "status": "missing_formal_source",
                "required_version": "V3.0",
                "reason": "G01整合正式包V3.0未找到",
                "path": "data/source/g01",
            }
        elif chapter in by_chapter:
            status = by_chapter[chapter]
        else:
            status = {
                "chapter": chapter,
                "status": "missing_formal_source",
                "required_version": "V2.1",
                "reason": "G02—G13完整数据包缺失；不得由HOPA文本反向生成数据",
                "path": f"data/source/g02-g13/{chapter}",
            }
            chapter_dir = repo / status["path"]
            chapter_dir.mkdir(parents=True, exist_ok=True)
            (chapter_dir / "README.md").write_text(
                f"# {chapter} 结构化制作母本缺失\n\n"
                "所需版本为 V2.1。未找到正式完整包，本目录不生成替代数据。\n",
                encoding="utf-8",
            )
        index.append(status)
    g01_dir = repo / "data/source/g01"
    g01_dir.mkdir(parents=True, exist_ok=True)
    (g01_dir / "README.md").write_text(
        "# G01 正式源数据缺失\n\n"
        "G01 V3.0 正式整合包未找到；不从现有游戏实现、损坏基线包或旧原型反推"
        "正式源数据。\n",
        encoding="utf-8",
    )
    write_json(repo / "data/source/index.json", index)


def main() -> int:
    global REPO_ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--downloads", type=Path, required=True)
    args = parser.parse_args()
    repo = args.repo.resolve()
    REPO_ROOT = repo
    downloads = args.downloads.resolve()
    originals = repo / "source_packages/originals-or-release-links"
    paths, package_manifest = verify_and_copy_packages(downloads, originals)
    records: list[dict[str, Any]] = []
    doc_stats: list[dict[str, Any]] = []

    doc_stats.extend(
        extract_named_docs(
            paths["PKG-PRODUCT-PLAN-V1.1"],
            "PKG-PRODUCT-PLAN-V1.1",
            PRODUCT_DOCS,
            repo / "docs/baseline/source_text/product-plan",
            "confirmed versions",
            "产品、教育、计划与门禁正式全文",
            records,
        )
    )
    doc_stats.extend(
        extract_named_docs(
            paths["PKG-G02-SCRIPT-FREEZE-V1.0"],
            "PKG-G02-SCRIPT-FREEZE-V1.0",
            G02_FREEZE_DOCS,
            repo / "docs/baseline/source_text/g02-freeze",
            "confirmed versions",
            "G02阶段计划与G-SCR-01—05冻结全文",
            records,
        )
    )
    doc_stats.extend(
        extract_hopa_and_fx(paths["PKG-HOPA-FX001-V1.0"], repo, records)
    )
    story_stats, _ = extract_story_docs(
        paths["PKG-G02-G13-HOPA-V2.0"], repo, records
    )
    doc_stats.extend(story_stats)

    data_status = [
        extract_data_package(
            paths["PKG-G02-DATA-V2.1"],
            "PKG-G02-DATA-V2.1",
            "G02",
            repo,
            records,
        ),
        extract_data_package(
            paths["PKG-G03-DATA-V2.1"],
            "PKG-G03-DATA-V2.1",
            "G03",
            repo,
            records,
        ),
    ]
    write_data_index(repo, data_status)
    build_catalogs(paths["PKG-CHARACTERS-V2.1"], repo, records)
    raw_catalog_dir = repo / "data/source/catalogs/raw"
    extract_art_catalog(
        paths["PKG-SCENES-V1.0"],
        "PKG-SCENES-V1.0",
        "91场景完成清单.csv",
        raw_catalog_dir / "SCENE-91_V1.0.csv",
        records,
    )
    extract_art_catalog(
        paths["PKG-PROPS-V3.0"],
        "PKG-PROPS-V3.0",
        "46件道具正式清单.csv",
        raw_catalog_dir / "PROP-46_V3.0.csv",
        records,
    )
    extract_art_catalog(
        paths["PKG-MECH-V2.0"],
        "PKG-MECH-V2.0",
        "47项机制可视化正式清单.csv",
        raw_catalog_dir / "MECH-47_V2.0.csv",
        records,
    )
    extract_art_catalog(
        paths["PKG-UI-V2.0"],
        "PKG-UI-V2.0",
        "83项界面美术正式清单.csv",
        raw_catalog_dir / "UI-83_V2.0.csv",
        records,
    )

    write_completeness_report(repo, story_stats)
    write_json(
        repo / "source_packages/manifests/source-packages.json",
        {
            "schema_version": 1,
            "issue": 6,
            "imported": package_manifest,
            "missing_required": list(MISSING_REQUIRED),
        },
    )
    write_json(
        repo / "source_packages/manifests/missing-sources.json",
        {
            "schema_version": 1,
            "issue": 6,
            "missing_count": len(MISSING_REQUIRED),
            "items": list(MISSING_REQUIRED),
        },
    )
    write_json(
        repo / "source_packages/manifests/extracted-files.json",
        {
            "schema_version": 1,
            "count": len(records),
            "files": sorted(records, key=lambda row: row["output_path"]),
        },
    )
    write_json(
        repo / "source_packages/manifests/docx-extraction-stats.json",
        {
            "schema_version": 1,
            "documents": doc_stats,
            "all_available_documents_full_text_captured": all(
                item["coverage_ratio"] == 1 for item in doc_stats
            ),
        },
    )
    sums = "\n".join(
        f"{item['observed_sha256']}  originals-or-release-links/{item['filename']}"
        for item in package_manifest
    )
    (repo / "source_packages/manifests/sha256sums.txt").write_text(
        sums + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "imported_packages": len(package_manifest),
                "missing_required": len(MISSING_REQUIRED),
                "extracted_files": len(records),
                "documents": len(doc_stats),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"source import failed: {error}", file=sys.stderr)
        raise
