# G01 角色与剧情系统第一阶段生成提示词

全部资产使用 Codex 内置图像生成工具生成。透明角色和物件先生成纯色键控母版，再使用
`remove_chroma_key.py` 进行软遮罩、去溢色与本地切分；未使用 API / CLI fallback。

## 星宇五状态母版

```text
Use case: background-extraction
Asset type: production runtime character portrait source sheet for the HTML5/PWA HOPA game “星骸拾荒者：十二星门”
Input images: Image 1 is a style, lighting, material, and color-palette reference for the existing hand-painted salvage-ship game only; it does not contain the character
Primary request: Create one identity-consistent adolescent Chinese boy character, Xingyu, the young repairer aboard the salvage ship, shown in exactly five separate head-and-upper-torso portraits with clearly distinct expressions: tile 1 normal and attentive; tile 2 alert with widened focus; tile 3 thinking with a restrained analytical gaze; tile 4 nervous but controlled; tile 5 determined and ready to repair. Preserve exactly the same face, hair, age, proportions, neutral worn repair jacket, and key features across every tile; only expression and very small head/shoulder pose changes may differ.
Scene/backdrop: each portrait must sit on one perfectly flat solid #00ff00 chroma-key background for local removal; no environment and no floor
Style/medium: premium cinematic hand-painted science-fiction HOPA character art, textured digital gouache consistent with the supplied cockpit, sophisticated ages 12–18 tone, realistic stylization rather than photorealism or cute cartoon
Composition/framing: clean 3-column by 2-row contact sheet, first five equal tiles occupied in reading order and sixth tile completely empty; every portrait centered in its own tile, cropped consistently at mid torso, generous clear padding around hair, shoulders, and arms; no overlap and no borders
Lighting/mood: restrained cool cyan edge light and dim warm amber ship light, readable facial planes, no glow halo
Color palette: graphite, weathered slate blue, muted oxidized brass and restrained cyan reflections; no bright toy colors
Materials/textures: worn practical repair fabric and small neutral metal fasteners, no logo and no faction marks
Constraints: exactly one same character repeated five times and one empty tile; no extra characters; the background must be exactly uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; do not use #00ff00 in the character; no cast shadow; crisp separated edges suitable for chroma key; no text, Chinese characters, letters, numbers, labels, UI frames, speech bubbles, watermark, weapons, mascot styling, space suit helmet, or branded insignia
Avoid: low-child-age appearance, chibi proportions, anime school uniform, superhero costume, catalog product pose, five different people, inconsistent hairstyle or clothing
```

## 七码九状态母版

```text
Use case: background-extraction
Asset type: production runtime character portrait and scene-sprite source sheet for the HTML5/PWA HOPA game “星骸拾荒者：十二星门”
Input images: Image 1 is a style, lighting, material, and color-palette reference for the existing hand-painted salvage-ship game only
Primary request: Create exactly nine identity-consistent views of Qima, model EDU-0077, the same compact companion robot in a 3-column by 3-row contact sheet. Qima must have an old slightly rounded rectangular CRT-like display head, a compact non-humanoid cream-yellow repaired utility body, short practical articulated arms, a low stable service chassis rather than human legs, exposed repair seams, mismatched replacement plates, and clear pixel-face expressions on the dark screen. Tile order in reading order: 1 offline—screen black and body unpowered; 2 damaged—screen cracked with weak pixel eyes and bent panel; 3 booting—amber/cyan startup bars and flicker; 4 normal—calm two-eye pixel face; 5 question—one raised pixel eyebrow/questioning face but no punctuation text; 6 warning—sharp amber warning expression but no warning symbol; 7 proud—self-satisfied pixel eyes; 8 awkward—uneven embarrassed pixel face; 9 scanning—focused cyan scan-line pixel eyes. Preserve exactly the same robot silhouette, screen shape, cream-yellow materials, proportions, patches, and scratches in all nine tiles; only power lighting, small damage state, display expression, and subtle arm posture may change.
Scene/backdrop: every tile uses one perfectly flat solid #00ff00 chroma-key background for local removal; no environment and no floor
Style/medium: premium cinematic hand-painted industrial science-fiction HOPA character art, textured digital gouache consistent with the supplied cockpit, mature ages 12–18 tone, charming through mechanical expression without cute toy proportions
Composition/framing: exact 3-column by 3-row equal contact sheet; one complete compact robot per tile, front three-quarter view, consistent scale and camera, fully contained with generous padding; no overlap, no borders, no labels
Lighting/mood: restrained cool cyan display light and dim warm amber ship edge light painted only on the robot
Color palette: aged cream yellow, graphite, oxidized brass, dark display glass, restrained cyan and amber pixels
Materials/textures: chipped paint, repaired sheet metal, taped cable sleeve, old screen glass, screws and patch plates
Constraints: exactly nine views of the same compact robot; keep old display-screen head, cream-yellow repaired body, pixel expressions and visible repair history; the background must be exactly uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; do not use #00ff00 in the robot; no cast shadow; crisp separated edges; no text, letters, numbers, Chinese characters, punctuation icons, labels, logos, UI frames, speech bubbles, watermark, weapons, humanoid face, human proportions, long human legs, or mascot toy styling
Avoid: ordinary android, sleek white robot, cute round mascot, television-headed human, nine different robots, inconsistent chassis, readable EDU text on the art
```

## 导航核心舱

```text
Use case: stylized-concept
Asset type: production 16:9 hand-painted HOPA environment background for SCN-G01-01 “找回七码”
Input images: Image 1 is the exact visual style, ship identity, palette, material, camera-language, and production-quality reference for the existing salvage ship 拾光号; create a different connected compartment, not a copy of the cockpit composition
Primary request: Create the fixed-camera navigation core cabin inside the same damaged salvage ship. This is the room immediately behind the cockpit where the offline companion robot will later be overlaid as an independent sprite and repaired. Show a believable cluttered navigation-core chamber with a large recessed unoccupied robot service cradle on the right-middle, a dark damaged core access panel beside it, a central navigation ring assembly, cable conduits, old diagnostic arms, storage mesh, scattered maintenance debris, a compact work surface, ceiling cable bundles, and a narrow lit passage back toward the cockpit. The service cradle must be visibly empty and sized for a compact waist-high service robot sprite; include contact rails and repair clamps but no robot.
Scene/backdrop: enclosed industrial spacecraft navigation core, damaged after power failure; no exterior window dominating the scene
Style/medium: premium cinematic hand-painted HOPA background, sophisticated science-fiction realism, textured digital gouache matching the supplied cockpit, ages 12–18, not photorealistic and not a 3D game screenshot
Composition/framing: wide 16:9 fixed first-person scene; strong depth; service cradle at approximately x 71–88%, y 27–69%; core access panel at x 43–60%, y 30–62%; keep the bottom 14% dark enough for the inventory HUD; distribute environmental clutter naturally without creating a button grid
Lighting/mood: unstable low emergency light, cool cyan navigation-core spill and restrained amber maintenance light, deep graphite shadows, worried but readable mood
Color palette: deep navy, graphite, oxidized brass, worn teal-black alloy, restrained cyan, muted emergency amber
Materials/textures: scratched ship metal, old glass, ceramic insulation, woven straps, dust, soot, patched wiring, chipped paint
Constraints: environment only; no people, no robot, no collectible chip, no loose wire connector plate, no tiny intact fuse, no cleaning brush, no weapons, no enemies; no readable text, letters, numbers, symbols, logos, UI, buttons, hotspot circles, marker dots, arrows, outlines, item labels, or watermark; the robot cradle and core access panel must be visually distinct but integrated into the room; no flat color placeholders
Avoid: sleek laboratory, glossy spaceship bridge, retail display, symmetrical puzzle board, combat scene, childish colors
```

## 七码核心检修特写

```text
Use case: stylized-concept
Asset type: production 16:9 local-zoom HOPA close-up background for SCN-G01-01 robot core repair
Input images: Image 1 is the exact navigation-core cabin style and room identity reference; create a close inspection view of its damaged robot core access assembly
Primary request: Create a close fixed-camera view of the open damaged service-core assembly beside Qima’s cradle. Show a recessed maintenance panel with a soot-darkened cleaning interface, one empty rectangular logic-chip socket, one empty contact rail for a connector plate, one empty miniature ceramic fuse holder, exposed cable bundles, ceramic standoffs, small drawers, mesh pockets, scorched brackets, a folded dirty cloth, loose ordinary washers, damaged dummy components, and dense believable repair clutter. The four actual collectible targets will be overlaid later, so the clean base must not contain an intact logic chip, loose connector plate, intact miniature fuse, or cleaning brush. Leave irregular pockets and partial-occlusion opportunities at different depths for those independent item sprites.
Scene/backdrop: open spacecraft repair core fills the frame, nested inside worn teal-black and graphite ship structure
Style/medium: premium cinematic hand-painted HOPA close-up, detailed digital gouache and industrial science-fiction realism matching Image 1 and the existing cockpit, ages 12–18
Composition/framing: wide 16:9 fixed close-up with three depth bands; soot-darkened cleaning interface at x 38–55%, y 34–58%; empty chip socket at x 21–34%, y 38–56%; connector rail at x 59–77%, y 32–54%; miniature fuse holder at x 47–58%, y 63–77%; environmental clutter distributed asymmetrically, not a product grid
Lighting/mood: narrow cool cyan diagnostic light, restrained amber rim light, deep dirty shadows, readable but challenging hidden-object contrast
Color palette: graphite, worn teal-black, oxidized brass, ceramic off-white, restrained cyan and amber
Materials/textures: greasy steel, chipped paint, soot, braided wire, old ceramic, worn canvas, dark mesh
Constraints: clean environment base only; no robot, no character, no intact collectible logic chip, no loose connector plate, no intact miniature fuse, no cleaning brush; keep the four empty repair targets visibly integrated but unlabeled; no readable text, letters, numbers, logos, UI, buttons, hotspot circles, dots, arrows, outlines, item labels, or watermark
Avoid: empty clean puzzle board, symmetric four-slot layout, retail display, colored button grid, flat CSS-like shapes, combat technology
```

## SCN-G01-01 四件修复部件母版

```text
Use case: background-extraction
Asset type: production HOPA collectible and inventory sprite source sheet for SCN-G01-01 robot repair
Input images: Image 1 is the exact material, palette, lighting, and repair-component style reference for the navigation core close-up
Primary request: Create exactly four separate opaque repair objects in a clean 2-column by 2-row contact sheet, one object per equal tile in reading order: tile 1 a compact worn rectangular logic chip module with dark ceramic body, oxidized brass pins and one restrained cyan glass trace; tile 2 a small irregular connector plate with two short insulated wire tails and worn brass contacts; tile 3 a tiny intact off-white ceramic micro fuse with aged brass end caps and a thin muted amber band; tile 4 a short stiff anti-static cleaning brush with dark worn handle and dusty pale bristles. Each object must feel used aboard the same patched salvage ship, visually recognizable at small size, and fully isolated.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local removal; no environment and no floor
Style/medium: premium hand-painted industrial science-fiction HOPA sprites, detailed digital gouache matching Image 1, mature ages 12–18 tone
Composition/framing: exact 2-column by 2-row equal contact sheet; one complete object centered in each tile with generous padding and no overlap; chip and fuse horizontal, connector plate angled slightly, brush diagonal; no tile borders
Lighting/mood: restrained neutral cyan/amber rim lighting painted only on objects; no cast shadow or halo
Color palette: graphite, off-white ceramic, oxidized brass, dark rubber, restrained cyan and muted amber
Materials/textures: chipped ceramic, scratched metal, braided wire, worn polymer, dusty bristles
Constraints: exactly four objects and no extras; the background must be one perfectly uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; do not use #00ff00 in the objects; crisp separated edges suitable for chroma key; no cast shadow; no text, letters, numbers, labels, symbols, logos, UI, grid borders, arrows, hotspot dots, hands, robot, characters, or watermark
Avoid: modern consumer electronics, clean retail presentation, toy colors, oversized parts, burnt fuse, extra screws
```

