# SCN-G01-01 正式美术阻断解除记录

核对日期：2026-07-28

## 结论

`CS-BLOCK-001-FORMAL-ART` 的原始缺图事实已经由项目负责人在 Issue #3 评论
`5105774977` 中明确授权的运行时生产方案解除。门禁本身没有删除、降级或改成
warning；现在它会严格校验正式源包、授权记录、运行时文件、尺寸、透明通道、
SHA-256、独立状态层和禁止来源。

当前状态为 `project_owner_authorized_runtime_production`，美术验收状态为
`pending_review`。这不表示资产是源包中直接提取的原图，也不提前代表项目负责人
已通过视觉验收。

## 授权与设计来源

- 授权：
  `https://github.com/zhoujon440-hash/starwreck-math-game/issues/3#issuecomment-5105774977`
- 正式包：`PKG-G01-V3.0`
- 包 SHA-256：
  `85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043`
- 场景设计登记：
  `G01序章场景概念设计总览.png`
- 场景登记 SHA-256：
  `38f2b34be1a8403b2e972251d724c881a65e97c0fa026bde02a89190f1bb96d7`
- 道具设计登记：
  `G01序章道具与效果设计总览.png`
- 道具登记 SHA-256：
  `8de48f4153e721fd865dc404e874ea4a9e838614e0ceb97d9c6cc1474996d8bc`
- 舱内连续性参考：`public/assets/g01-cockpit.png`
- 七码本体：继续使用 Issue #8 已验收的 9 张角色 PNG。

生产中使用了正式设计登记、已确认的拾光号舱内材质语言和七码既有造型约束，
通过 OpenAI 内置 `image_gen`、色键清理与 Pillow 确定性后处理制作运行时图层。
所有生成、重绘与人工清理部分均在 provenance 中明示。

## 已补齐资产

- `SCENE-G01-002`：3840×2160 导航核心舱无字背景。
- `HOS-G01-002`：真实场景裁切背景与栅格前景遮挡层。
- 四件目标物：七码芯片、接线片、保险丝、固定扣。
- 每件目标物：独立场景态、独立背包态、真实 alpha。
- 六件干扰物：空芯片壳、断线片、废旧接头、相似保险片、弯曲金属扣、导航零件。
- 六个状态层：接线片、保险丝、芯片、固定扣安装态，以及 booting、normal 效果。

机器清单：

- `data/source/g01/scn-g01-01/scene_manifest.json`
- `data/source/g01/scn-g01-01/hos_manifest.json`
- `docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json`

后者包含全部 23 个运行时文件的 SHA-256 清单。

## 门禁

`npm run validate:character-story` 必须无参数运行。`--allow-source-gap` 现在会使
`CS-BLOCK-001-FORMAL-ART` 失败，不能用于正式验收。

严格规则包括：

- 正式包与两张设计登记原条目 SHA 校验；
- 4K 16:9 场景尺寸和实际文件 SHA 校验；
- 四目标、六干扰物的文件、SHA 与真实 alpha 校验；
- 六个状态层逐文件校验；
- 23 个运行时层 SHA 唯一性与完整性校验；
- `project_owner_authorized_runtime_production` 授权和生产工具记录；
- 禁止总览板直接进入运行时；
- 禁止 PR #5、第三方下载和 CSS/SVG/文字占位物；
- 11 个独立美术负向破坏用例。

## 范围声明

- 未复用 PR #5 美术；
- 未改变星宇或七码设计；
- 未开发 SCN-G01-02 内容；
- 未开发 G02；
- 未启动 Issue #9 或 Issue #10；
- `world_star_core_count` 始终为 `0`。
