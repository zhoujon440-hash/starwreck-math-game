# 生成资产记录

本轮资产使用 Codex 内置图像生成工具生成，未使用 API / CLI fallback。原始输出已复制到项目内，不依赖用户目录中的生成缓存。

## G01 角色与剧情系统第一阶段资产

完整生成提示词保存在 `art/prompts/g01-character-story-v1.md`。

### 星宇

- 键控母版：`art/source/g01-xingyu-portraits-chroma.png`
- 运行时目录：`public/assets/characters/xingyu/`
- 状态：`normal`、`alert`、`thinking`、`nervous`、`determined`
- 处理：内置图像生成 → `remove_chroma_key.py` 软遮罩与去溢色 → 3×2 等分切片。

仓库没有星宇冻结人物设计板。运行时母版只采用任务中明确的“拾光号少年修复者”身份和现有
拾光号场景的色彩、材质、年龄气质；未提供的服装制式、发型和个人标志仍标记为
“待项目负责人补充”。本资产不引入组织徽记、武器、新搭档或额外世界观。

### 七码 · EDU-0077

- 键控母版：`art/source/g01-qima-portraits-chroma.png`
- 运行时目录：`public/assets/characters/qima/`
- 状态：`offline`、`damaged`、`booting`、`normal`、`question`、`warning`、`proud`、
  `awkward`、`scanning`
- 处理：内置图像生成 → `remove_chroma_key.py` 软遮罩与去溢色 → 3×3 等分切片。

设计严格保留任务冻结的旧显示屏头、奶黄色修补机身、像素表情和维修痕迹；所有状态使用同一
机体轮廓，没有改成人形机器人或文字头像。

### SCN-G01-01 导航核心舱与修复特写

- 场景底图：`public/assets/g01-scene-01/navigation-core.png`
- 核心特写：`public/assets/g01-scene-01/qima-core-closeup.png`
- 部件键控母版：`art/source/g01-scene-01-parts-chroma.png`
- 部件运行时目录：`public/assets/items/g01-scene-01/`

场景与特写均为不含角色和目标物的干净底图。七码和芯片、接线片、微型保险丝、清洁刷使用
独立透明图层，保证状态切换、拾取和重载后能从画面中真实消失。

## PR #2 第二轮视觉整改资产

### 领航舱维修柜关闭状态

运行时文件：`public/assets/g01-cockpit-cabinet-closed-v2.png`

该图是完整领航舱的关闭状态，不再使用 CSS 条纹、纯黑矩形或几何遮罩。S0、S1 使用此图；从 S2 起切换为 `public/assets/g01-cockpit.png` 的真实打开状态。

最终提示词：

```text
Use case: precise-object-edit
Asset type: production 16:9 hand-painted HOPA game environment state, closed-maintenance-cabinet variant
Input images: Image 1 is the exact edit target and must remain compositionally identical
Primary request: Change only the open maintenance cabinet at the right side of the cockpit (roughly x 78–92%, y 18–58%) into a genuinely closed two-door maintenance cabinet. Paint the closed doors as part of the environment, matching the existing cabinet frame, perspective, teal-black worn metal, scratches, seams, hinges, recessed panels, amber rim light, red emergency spill, contact shadows, and hand-painted realism. The closed doors must fit inside the existing cabinet frame and visibly read as a closed state; use two asymmetrical battered metal panels with a small mechanical latch, not a black cover.
Composition/framing: preserve the exact 1672×941 wide framing, viewpoint, geometry, dashboard, windows, floor, left workbench, and all other objects pixel-compositionally as closely as possible
Lighting/mood: preserve the source lighting; cabinet doors receive the same warm amber and dim red edge light as their surroundings
Materials/textures: layered spaceship alloy, chipped teal-black paint, greasy fingerprints, fine scratches, rivets, inset ribs, subtle reflected cockpit light
Constraints: edit only the right-side maintenance cabinet interior and its two doors; keep every other part of Image 1 unchanged; the new doors must not extend beyond the original cabinet frame or cover the adjacent draped cloth, console, floor, or central controls; no CSS-like gradients, no flat rectangle, no repeating stripes, no geometric mask, no clip-path look, no clean product render, no hidden-object target items, no characters, no text, no labels, no symbols, no arrows, no dots, no hotspot markers, no UI, no watermark
Avoid: black curtain, featureless dark block, temporary placeholder, posterized surfaces, large high-contrast silhouette
```

### 维修柜环境杂物底图

运行时文件：`public/assets/g01-maintenance-cabinet-v2.png`

新底图加入电缆、工具卷、网兜、布片、零件盘和打开的抽屉。目标物仍为独立图层，烧毁保险丝和普通螺丝保留为干扰物；前景杂物复制层对手套、扳手和保险丝形成持续遮挡。

最终提示词：

```text
Use case: precise-object-edit
Asset type: production 16:9 hand-painted HOPA hidden-object maintenance-cabinet clean base layer
Input images: Image 1 is the exact edit target
Primary request: Keep the open three-level spaceship maintenance cabinet and its camera perspective, but fill its overly empty lower half with believable repair clutter so it reads as a lived-in hidden-object environment rather than a product shelf. Add persistent environmental clutter only: several differently thick coiled red/black cables, a faded canvas tool roll partly open, a dark mesh parts pouch sagging from the lower-left shelf, a small cloth rag, two dull metal brackets, a shallow right-side drawer left slightly ajar with washers inside, a battered component tray, loose ceramic sleeves, cable ties, and a few unremarkable fittings. Preserve the burnt damaged fuse on the upper-right shelf and the loose ordinary screws on the lower shelf as clear persistent distractors.
Style/medium: match the exact source hand-painted cinematic industrial realism
Composition/framing: preserve the exact 1672×941 cabinet framing, open side doors, shelves, camera angle, perspective, and cabinet silhouette; distribute clutter across at least two shelf depths, with irregular overlap and negative spaces for small target item layers
Lighting/mood: keep the same red emergency rim light, warm amber interior glints, deep dirty shadows, and subtle material reflections
Materials/textures: rusty teal-black alloy, greasy steel, worn canvas, rubber cable, mesh netting, scuffed ceramic, oxidized brass
Constraints: change only the contents and small lower shelf/drawer details inside the open cabinet; do not add any target item that resembles a complete white ceramic fuse with cyan band, an open-end wrench, a pair of work gloves, or a set of hanging metal tags; do not remove or transform the burnt fuse or loose screws; leave several naturally occluded pockets where independent target sprites can be placed behind shelf lips, cable loops, the mesh pouch edge, and the open drawer; no clean rows, no evenly spaced display, no text, no labels, no arrows, no dots, no outlines, no hotspot markers, no UI, no watermark
Avoid: empty black shelf, retail display, item grid, symmetrical arrangement, bright isolated objects, oversized targets
```

### 融入环境的应急手灯 v2

键控源图：`art/source/g01-emergency-lamp-chroma-v2.png`

运行时文件：`public/assets/items/ITM-G01-001-layer-v2.png`

手灯改为低亮度、磨损、缠线并被旧布部分遮挡的独立透明图层。运行时继续由 `foundItemIds` 控制消失和读档恢复。

最终提示词：

```text
Use case: background-extraction
Asset type: production hidden-object collectible sprite for a dark hand-painted spaceship workbench scene
Input images: Image 1 is the existing emergency hand lamp design reference
Primary request: Repaint the same emergency hand lamp as a worn, compact maintenance tool seen from a shallow three-quarter top view, lying horizontally at a slight angle. Make it darker, more scuffed, less polished, and much less luminous: the front lens has only a faint desaturated blue-gray residual glow and a tiny dull amber charge indicator. A thin dirty black cable crosses roughly the rear third of the lamp, and a small irregular corner of dusty blue work cloth overlaps about 15 percent of one side, creating believable partial environmental occlusion without hiding the recognizable cylindrical lamp shape.
Style/medium: hand-painted cinematic HOPA game sprite, industrial realism matching the supplied object, not catalog photography
Composition/framing: single compact lamp centered with generous padding, complete overall silhouette except for the intentional cable and cloth overlap; horizontal aspect, no cropped outer edges
Lighting/mood: dim red-brown emergency ambient light from upper right, deep contact-darkened underside, restrained highlights
Color palette: charcoal black, oxidized steel, muted blue-gray glass, tiny dull amber indicator, dusty desaturated blue cloth
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Constraints: the background must be exactly one uniform #00ff00 color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; crisp separated edges; do not use #00ff00 in the subject; no bright cyan ring, no white glow, no product halo, no text, no label, no logo, no arrow, no dot marker, no watermark
Avoid: oversized flashlight, floating product render, complete unobstructed silhouette, glossy new metal, intense emission, neon aura
```

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

### G01 维修柜干净底图 v1.5（已被杂物底图取代）

历史文件：`public/assets/g01-maintenance-cabinet.png`

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
