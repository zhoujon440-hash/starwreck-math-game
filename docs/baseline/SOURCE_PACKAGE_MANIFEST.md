# 正式源资料包清单与校验摘要

最近核对日期：2026-07-28。

机器事实源为：

- 正式源清单：`source_packages/manifests/source-packages.json`
- 独立 SHA 清单：`source_packages/manifests/sha256sums.txt`
- 提取物溯源：`source_packages/manifests/extracted-files.json`
- 替代关系：`source_packages/manifests/substitution-map.json`
- 缺失记录：`source_packages/manifests/missing-sources.json`

当前结论：19 项正式源全部通过 Git LFS 导入；`missing_required=[]`，`missing_count=0`。校验器要求机器清单与 SHA 清单的文件集合、相对路径和 SHA-256 完全一致，并逐条复核提取物的原包内部条目及输出文件哈希。

| Package ID | 正式文件 | SHA-256 | 状态 |
| --- | --- | --- | --- |
| `PKG-PRODUCT-PLAN-V1.1` | 星骸拾荒者_开发前资料与计划确认包_V1.1_星宇确认版.zip | `ed51f0f9e6e68eae09fd97fe85b7481b688b93ed06099e0bb1cf9e46090115f2` | 已导入 / Git LFS |
| `PKG-G02-SCRIPT-FREEZE-V1.0` | 星骸拾荒者_G02制作脚本总封版与S2启动确认包_V1.0.zip | `2cc04b0a73275af35b8b905ee836123af704d04aea1695e943c38d94d535085e` | 已导入 / Git LFS |
| `PKG-CHARACTERS-V2.1` | 星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip | `a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb` | 已导入 / Git LFS |
| `PKG-SCENES-V1.0` | 星骸拾荒者_场景美术设计全集_V1.0.zip | `731cc680ee98eba1bf27474d4d613476dbbe02ca7fff7dfb1beb4b2bb0595de0` | 已导入 / Git LFS |
| `PKG-PROPS-V3.0` | 星骸拾荒者_道具美术正式包_V3.0.zip | `f712245f25945b234fd73d794b3ff6d6be39744da3a56324a34706ee85f6aa2d` | 已导入 / Git LFS |
| `PKG-MECH-V2.0` | 星骸拾荒者_机制可视化HOPA正式包_V2.0.zip | `de7367d1ec06f97d3b8cca3c671ca9680f522f714929997d4a60fd9af1678b2f` | 已导入 / Git LFS |
| `PKG-UI-V2.0` | 星骸拾荒者_界面美术HOPA正式包_V2.0.zip | `827d4262dcf68acf50abdbe77a63192c78cc7b44bf588b389bcbdc612e1d537a` | 已导入 / Git LFS |
| `PKG-G02-G13-HOPA-V2.0` | 星骸拾荒者_G02-G13全章节HOPA实施脚本_V2.0.zip | `f8b9d6f628cac99e5ba799d9cac2f630c45650cf0489dad548de31f569e7eb35` | 已导入 / Git LFS |
| `PKG-G02-DATA-V2.1` | 星骸拾荒者_G02锈环星_Unity数据级制作脚本_V2.1.zip | `20d755a73ac1715960cf2c5c5a95b89414d86c9c26c47be76b0a4e6fe5eeb92a` | 已导入 / Git LFS |
| `PKG-G03-DATA-V2.1` | 星骸拾荒者_G03齿轮荒原_Unity数据级制作脚本_V2.1.zip | `409ab1be9a180d60eec1d4a15cb6917f628ae4d06d76ee34752d0f621185035b` | 已导入 / Git LFS |
| `PKG-HOPA-FX001-V1.0` | 星骸拾荒者_HOPA架构与FX-001确认包_V1.0.zip | `87e1c9f66c5c674c598f62ed69488d6417698aae78666cf749751cb8e93c4ae8` | 已导入 / Git LFS |
| `PKG-G01-V3.0` | 星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0.zip | `85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043` | 已导入 / Git LFS |
| `PKG-G02-G13-DATA-V2.1` | 星骸拾荒者_G02-G13_Unity数据级制作脚本完整包_V2.1.zip | `4db2cbb67e688aa7b55b5fe509f38377577e25a2259df3011c105f7c52c59708` | 已导入 / Git LFS |
| `PKG-FX-V2.0` | 星骸拾荒者_技能与装备效果HOPA正式包_V2.0.zip | `882e933ca90917c37a6cd3c88d5988a2ce0ce8c6dbaf1d86e5f29102290ee5e1` | 已导入 / Git LFS |
| `PKG-DANGER-V2.0` | 星骸拾荒者_危险视觉HOPA正式包_V2.0.zip | `981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b` | 已导入 / Git LFS |
| `DOC-G-S2-D01-V1.0` | G-S2-D01_S2视觉总方向关键决策冻结记录_V1.0.docx | `b746bec0e860b5a457b701d071d33f01316a1c6cc8f3205b06e92e3656b79a77` | 已导入 / Git LFS |
| `DOC-G-S2-CHG-01-V1.0` | G-S2-CHG-01_视觉路线与角色一致性修正记录_V1.0.docx | `a62e1c7df26ed537265dda4830cd7f3690d85e79046630869644e8b6e3641cb0` | 已导入 / Git LFS |
| `DOC-G-CHAR-01-V1.0` | G-CHAR-01_主角星宇造型基线_V1.0_C方案布偶修正版.docx | `9d5a83301f9462ffd4d268048e4ed809680309b2cb78f9f244d6d3facdddd435` | 已导入 / Git LFS |
| `DOC-G-ANIM-01-V1.0` | G-ANIM-01_图片解密游戏轻动效与骨骼动画方案_V1.0.docx | `c44dcfef7f8b15176f420eb267c50c0ad6aa0b8819f4ed9e26e8f86c333f9e28` | 已导入 / Git LFS |

## 成熟度边界

设计母版、三视图母版和生产规范的完成，不等于运行时透明资产、可播放动画或验收截图已经制作。目录必须分别记录设计/生产母版状态与运行时资产状态；不得用前者推断后者。

## 488 资产目录来源

`data/source/catalogs/asset-catalog-488.json` 是八个正式域清单共同生成的多源派生目录，不隶属于人物主清单：

| 域 | 正式来源 | 数量 |
| --- | --- | ---: |
| character | `PKG-CHARACTERS-V2.1` | 71 |
| scene | `PKG-SCENES-V1.0` | 91 |
| prop | `PKG-PROPS-V3.0` | 46 |
| mechanism | `PKG-MECH-V2.0` | 47 |
| ui | `PKG-UI-V2.0` | 83 |
| fx | `PKG-FX-V2.0` | 41 |
| danger | `PKG-DANGER-V2.0` | 76 |
| g01_addition | `PKG-G01-V3.0` | 33 |

聚合目录的生成方式、脚本、八个输入条目及条目 SHA 登记在 `source_packages/manifests/extracted-files.json`；单项资产的正式包、包内条目和 SHA 登记在资产目录自身。两层来源都由 baseline gate 逐字节验证。

## Legacy 隔离

损坏、旧技术路线和被替代原件只允许位于 `archive/legacy/**` 或明确的来源冲突/替代报告中，不得进入当前执行索引、资产来源、运行时配置或正式章节入口。
