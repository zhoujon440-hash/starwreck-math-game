# 生成资产记录

本轮资产使用 Codex 内置图像生成工具生成，未使用 API / CLI fallback。原始输出已复制到项目内，不依赖用户目录中的生成缓存。

## PR #2 P0 整改后的当前资产

### G01 领航舱干净底图 v2

运行时文件：`public/assets/g01-cockpit.png`

当前底图不再烘焙应急手灯，并移除了与本场景无关的蓝色方块和三角星盘。配电盒、应急照明槽、保护开关和右侧维修柜已按冻结任务重新校准。

最终提示词：

```text
Use case: precise-object-edit
Asset type: 16:9 hand-painted HOPA game environment, clean base layer for SCN-G01-00
Input images: Image 1 is the edit target and composition anchor.
Primary request: Calibrate the cockpit artwork to the frozen G01 task. Remove the loose handheld flashlight from the left workbench, the blue cube on the lower-left table, and the triangular star-compass object on the right console; naturally reconstruct the exposed metal surfaces underneath. Add three clearly readable but unlabeled fixed maintenance fixtures integrated into the central console: a rectangular fused distribution box in the left-central console area, a narrow emergency-lighting fuse slot near the middle, and a small adjacent mechanical protection toggle to its right. Keep the large open maintenance cabinet on the right clearly visible as the scene's zoom target.
Style/medium: preserve the exact cinematic hand-painted industrial sci-fi realism, brushwork, camera angle, palette, damage, window view, debris, cockpit geometry, and 16:9 framing of Image 1.
Lighting/mood: dark emergency-red pre-power state with restrained amber practical lights; mature teen science-fiction tone.
Constraints: change only the specified loose objects and maintenance fixtures; preserve all other scene geometry and composition; the base layer must contain no collectible emergency hand lamp; no labels, no readable text, no UI, no hotspot circles, no marker dots, no characters, no watermark.
Avoid: buttons list, debug markers, cute or childish styling, weapons, combat elements, extra collectibles.
```

### G01 维修柜干净底图 v2

运行时文件：`public/assets/g01-maintenance-cabinet.png`

当前底图保留烧毁保险丝和散落螺丝作为干扰物，四个目标物全部由运行时透明图层提供。

最终提示词：

```text
Use case: precise-object-edit
Asset type: 16:9 hand-painted HOPA close-up, clean maintenance-cabinet base layer
Input images: Image 1 is the edit target and composition anchor.
Primary request: Remove exactly the five loose target/legacy objects from the open cabinet: the intact pale ceramic fuse with cyan band on the upper shelf, the large old wrench on the lower shelf, the pair of insulated work gloves on the lower-left shelf, the stack of blank wire-number tags on the lower-right shelf, and the handheld flashlight protruding at the bottom-left edge. Naturally reconstruct the exposed scratched metal shelves and empty compartments underneath. Keep the burnt blackened fuse on the upper-right shelf and the cluster of loose screws on the lower shelf as visible distractors. Keep the cabinet doors, wiring, canisters, baskets, rolled materials, small drawers, lighting, camera angle, geometry, and framing unchanged.
Style/medium: preserve the exact cinematic hand-painted industrial sci-fi realism, materials, red emergency lighting, brushwork, and 16:9 composition of Image 1.
Constraints: clean base layer contains none of the four collectible HOS objects and no flashlight; do not add replacement objects; no text, no labels, no UI, no hotspot circles, no marker dots, no characters, no watermark.
Avoid: changing the burnt fuse or screws; new tools; new gloves; new tags; cute styling; weapons.
```

### 五件可拾取物透明图层

键控源图：`art/source/g01-collectibles-chroma.png`

运行时文件：

- `public/assets/items/ITM-G01-001-layer.png`
- `public/assets/items/ITM-G01-002-layer.png`
- `public/assets/items/ITM-G01-003-layer.png`
- `public/assets/items/ITM-G01-004-layer.png`
- `public/assets/items/ITM-G01-005-layer.png`

内置图像生成先输出纯色键控图，再使用 imagegen 技能提供的 `remove_chroma_key.py` 做软遮罩、去溢色并切分为独立 PNG 图层。

最终提示词：

```text
Use case: background-extraction
Asset type: HOPA game collectible sprite source sheet for local chroma-key removal
Input images: Image 1 and Image 2 are style/material references only; do not preserve their backgrounds or composition.
Primary request: Create exactly five separate opaque collectible objects arranged in a clean 3-column by 2-row contact sheet, each fully contained in its own equal tile with generous padding and no overlap: (1) compact cylindrical emergency hand lamp with dark gunmetal body, a small amber power button, and a pale cyan illuminated lens ring; (2) intact short white ceramic fuse with brass end caps and one pale cyan band; (3) one large worn steel open-ended maintenance wrench; (4) one pair of thick black-and-ochre insulated work gloves; (5) a small tied stack of blank weathered metal wire-number tags with holes, absolutely no writing. Leave the sixth tile empty.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Style/medium: cinematic hand-painted industrial sci-fi realism matching the reference images, crisp readable silhouettes, mature teen product tone.
Composition/framing: orthographic-ish three-quarter product views, every object isolated, centered in its tile, generous separation; wrench horizontal; fuse horizontal; no object touches another or the canvas edge.
Lighting/mood: restrained neutral rim lighting painted only on the objects; no cast shadow or contact shadow.
Constraints: exactly five objects and one empty tile; crisp edges; do not use #00ff00 anywhere in the objects; no text, no labels, no symbols, no UI, no border grid, no watermark.
Avoid: extra tools, burnt fuse, screws, cute styling, floor plane, background variations, green reflections, soft smoke, transparent glass.
```

## 初版历史记录（已被 v2 取代）

以下提示词保留用于追溯首轮 PR 的资产来源，不再代表当前运行时美术基线。

### G01 领航舱场景 v1

项目文件：`public/assets/g01-cockpit.png`

最终提示词：

```text
Use case: stylized-concept
Asset type: HTML5 HOPA game environment background for the opening playable scene
Primary request: Create the first-person hidden-object adventure scene for G01 “拾光号坠落之前” (Before the Starlight Salvager Crashes): the interior of a damaged deep-space salvage ship cockpit moments before impact.
Scene/backdrop: a richly dressed, hand-painted sci-fi navigation cabin with a panoramic cracked observation window, distant blue-white planet and drifting debris outside; slanted floor, sparking conduits, emergency amber lighting, light smoke, damaged navigation console, half-open maintenance cabinet, storage webbing, hanging cables, scattered star charts, and believable salvage tools integrated into the environment.
Subject: an exploration-focused cockpit scene with multiple plausible search areas. Visually integrate these findable objects without making them obvious or outlining them: a brass-and-ceramic insulated wrench, a small translucent cyan memory prism, and a silver three-point star compass. Include a damaged maintenance hatch on the lower right and a circular navigation socket on the central console as later item-use targets.
Style/medium: premium cinematic hand-painted HOPA background, sophisticated sci-fi realism, detailed digital gouache and textured brushwork, aimed at ages 12–18, not childish, not photorealistic, no 3D game screenshot.
Composition/framing: wide 16:9 establishing view, fixed camera, first-person scene, strong depth and environmental storytelling; keep key objects separated enough for click/touch interaction; leave the bottom 14% relatively dark and uncluttered for an inventory HUD overlay.
Lighting/mood: urgent but mysterious, cool cyan starlight against warm amber emergency lights, subtle volumetric haze, crisp readable silhouettes.
Color palette: deep navy, graphite, oxidized brass, restrained cyan, emergency amber.
Materials/textures: worn painted metal, scratched glass, woven straps, ceramic insulation, dust, soot, glowing instrument glass.
Constraints: environment only; no visible person or character; no text, numbers, letters, logos, trademarks, watermark, interface, buttons, hotspot circles, targeting reticles, item labels, arrows, outlines, or tutorial markers. Do not present objects as a neat list. The three findable objects must feel naturally hidden in the detailed scene while remaining visually distinguishable at close inspection.
```

### PWA 星门图标

母版：`art/source/g01-app-icon-master.png`

运行时文件：

- `public/assets/app-icon-192.png`
- `public/assets/app-icon-512.png`

最终提示词：

```text
Use case: stylized-concept
Asset type: square PWA app icon for a science-fiction HOPA game
Primary request: Create a premium emblem for “星骸拾荒者：十二星门”: a silver three-point star compass nested inside a fractured circular star gate, with one small cyan core light and subtle oxidized-brass details.
Scene/backdrop: deep navy-black space with restrained dust and a faint radial glow; no full environment scene.
Subject: centered original star-compass and broken gate emblem with a strong, readable silhouette.
Style/medium: sophisticated hand-painted game icon, cinematic digital gouache, crisp at small sizes, aimed at ages 12–18, not childish, not cartoon mascot, not glossy mobile casino art.
Composition/framing: square, centered, generous safe padding for maskable PWA cropping, symmetrical visual weight.
Lighting/mood: cool cyan edge light with muted amber metal reflections; mysterious and premium.
Color palette: graphite, silver, oxidized brass, deep navy, restrained cyan.
Constraints: no text, letters, numbers, words, logos, trademarks, watermark, UI frame, buttons, or characters. Do not imitate an existing franchise.
```

### G01 维修柜找物特写 v1

项目文件：`public/assets/g01-maintenance-cabinet.png`

最终提示词：

```text
Use case: stylized-concept
Asset type: local zoom hidden-object scene for an HTML5 HOPA game
Primary request: Create the open maintenance cabinet close-up for SCN-G01-00 “拾光号熄灯” inside the damaged salvage ship 拾光号.
Scene/backdrop: a recessed industrial spacecraft maintenance cabinet viewed straight-on at close range, doors open, with layered shelves, cable loops, ceramic fuse holders, mesh pouches, scratched labels with NO readable text, small drawers, and believable repair clutter.
Subject: naturally integrate six searchable objects into the cabinet scene without outlines or markers: one intact temporary ceramic fuse with a pale cyan band (critical item), one worn metal wrench, one pair of insulated work gloves, one small bundle of blank wire-number tags, one visibly burnt fuse as a distractor, and a few ordinary loose screws as a distractor. Each object must occupy a distinct clickable region but still feel genuinely hidden among the clutter.
Style/medium: premium hand-painted HOPA close-up, sophisticated science-fiction realism, detailed digital gouache and textured brushwork, consistent with a dark navy, graphite, oxidized brass, cyan-and-amber spaceship cockpit; aimed at ages 12–18, not childish, not photorealistic, not a 3D screenshot.
Composition/framing: wide 16:9 close-up, fixed camera, cabinet fills most of the frame, readable depth across three shelf levels, no UI margin needed.
Lighting/mood: mostly dark emergency red/amber light with a narrow cool beam from a handheld lamp revealing the cabinet contents; urgent but legible.
Materials/textures: worn painted metal, ceramic insulation, woven gloves, old brass fittings, soot, dust, scratched glass, braided wire.
Constraints: no people, characters, hands, text, numbers, letters, logos, trademarks, watermark, interface, buttons, hotspot circles, targeting reticles, item labels, arrows, outlines, or tutorial markers. Do not arrange the objects as a neat list or inventory grid.
```
