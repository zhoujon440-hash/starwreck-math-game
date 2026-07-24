# 生成资产记录

本轮资产使用 Codex 内置图像生成工具生成，未使用 API / CLI fallback。原始输出已复制到项目内，不依赖用户目录中的生成缓存。

## G01 领航舱场景

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

## PWA 星门图标

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

