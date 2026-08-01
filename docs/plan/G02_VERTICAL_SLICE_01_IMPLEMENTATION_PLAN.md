G02 VERTICAL SLICE IMPLEMENTATION PLAN READY

# G02 Vertical Slice 01 Implementation Plan

## 冻结基线与范围

- Issue：#10
- PMO 执行指令：comment `5132091133`
- Base：`main@648ad396ea02f5d519f8ab9699c63486ba405720`
- Branch：`codex/g02-vertical-slice-00-02-v1`
- Version：`G02-SLICE-0.1.0`
- 起点：G01 完成后的 `G02-BOUNDARY` 旧屏幕谷外缘交接
- 正式运行场景：`SCN-G02-00`、`SCN-G02-01`、`SCN-G02-02`
- 终点：`SCN-G02-03A/B/C/D` 能源搜索分支之前的只读边界
- 目标时长：正常阅读、观察与操作 20—30 分钟

明确不实现 SCN-G02-03A/B/C/D 玩法、磁力手套工坊、豆包借电、五塔供能、管理员权限解除、十二秒回路、星核、G02 结算、G03，也不修改已验收的 G01 SCN00—07。

## 正式来源与优先级

冲突优先级：

`G01/G02 边界 V2.2 > G02 数据 V2.1 > G02 HOPA V2.0 > 五册剧情母本 V1.0 > 更早历史稿`

本切片直接查询并映射：

- `docs/baseline/source_text/g01/G02_OPENING_BOUNDARY_V2.2.md`
- `docs/story/G01-G13/G02.md`
- `docs/baseline/source_text/product-plan/G-GDD-G02_V1.1.md`
- `docs/baseline/source_text/g02-freeze/G-S1-PLAN-01_V2.0.md`
- `docs/baseline/source_text/g02-freeze/G-S1-CLOSE-01_V1.0.md`
- `docs/baseline/source_text/g02-freeze/G-SCR-01_V1.0.md`
- `docs/baseline/source_text/g02-freeze/G-SCR-02_V1.0.md`
- `docs/baseline/source_text/g02-freeze/G-SCR-03_V1.0.md`
- `docs/baseline/source_text/g02-freeze/G-SCR-04_V1.0.md`
- `docs/baseline/source_text/g02-freeze/G-SCR-05_V1.0.md`
- `data/source/g02-g13/G02/json/G02_MasterData.json`
- `data/source/g02-g13/G02/json/{场景流程,热点清单,找物清单,背包道具流转,对话脚本,小游戏与机制,场景状态机,三级提示,存档与恢复,程序变量,资产映射}.json`
- `data/source/g02-g13/G02/csv/*.csv`
- `data/source/catalogs/{characters-71,asset-catalog-488,fx-41,danger-76}.csv`
- `source_packages/manifests/{source-packages,extracted-files,sha256sums}.json`

V2.2 已把旧版开场航线移入 G01。因此 `G02-BOUNDARY` 只增加一个可追溯交接动作；`SCN-G02-00` 不重复航线教学，只承接断卫星轴掩体调查、DANGER-004 环境压力和封存脉冲扫描。

## 场景和状态映射

### G02-BOUNDARY

- 单一交接动作适配：`RUNTIME-ACT-G02-HANDOFF`（不向只读边界添加热点）
- 正式父项：V2.2 旧屏幕谷外缘交接
- 只执行 `G02-BOUNDARY → SCN-G02-00`，不含 HOS、背包谜题或新任务链。

### SCN-G02-00《垃圾雨之前》

| 状态 | 运行时语义 |
| --- | --- |
| S0 | 抵达掩体外缘，读取环境 |
| S1 | 调查 `HS-G02-0001` 断卫星轴，确认掩体 |
| S2 | 在局部近景锁定 `HS-G02-0002` 封存脉冲 |
| S3 | 使用已授权的七码扫描并完成脉冲间隔匹配 |
| S4 | `RUNTIME-STATE-G02-00-S4`：核对封存样本 |
| S5 | 写入 `EVD-G02-001`、`g02_intro_scan_done=true`、`AUTO-G02-001` |
| S6 | `RUNTIME-STATE-G02-00-S6`：安全离开并进入 SCN01 |

- 危险：正式 `DANGER-004` 磁性碎片风/垃圾雨语义。
- 数学嵌入：观察脉冲间隔并选择与扫描取样窗匹配的节拍，不使用独立答题弹窗。
- 软失败：退回 `SCN-G02-00:satellite-axle-cover`；保留掩体调查、已取得证据与能力。
- UI：正式 `UI-005` 危险预警语义。

### SCN-G02-01《五尾清算》

| 状态 | 运行时语义 |
| --- | --- |
| S0 | 进入旧屏幕谷外场，识别吊臂落物区 |
| S1 | 取得任务挂索并观察 `HS-G02-0003` |
| S2 | 拖拽挂索救下阿铆 |
| S3 | `g02_almao_rescued=true`，开放资源标签调查 |
| S4 | 扫描 `HS-G02-0005/0006/0007`，按真实操作递增证据 |
| S5 | 三类归属推理完成，`g02_resource_labels=3` |
| S6 | 写入 `AUTO-G02-002` 并进入 SCN02 |

- 任务物：`RUNTIME-ITM-G02-MAGNETIC-GRAPNEL`，绑定 `HS-G02-0003`、SCN01 与正式“磁力挂索”文本；它不是磁力手套。
- 证据：`EVD-G02-002` 私人、`EVD-G02-003` 公共供暖、`EVD-G02-004` 废弃。
- 危险：正式 `DANGER-002` 吊臂落物区。
- 数学嵌入：通过三类标签形状、连接数量与归属关系完成资源分类。
- 软失败：退回 `SCN-G02-01:old-screen-valley-safe`；不丢救援前正确进度，不生成证据。
- `HS-G02-0004` 明确保留“缺少后续工具”的只读反馈，绝不授权磁力手套。
- 对话：`DLG-G02-0003—0006` 由 DialogueRunner 数据加载。

### SCN-G02-02《谁说这是无主之物》

| 状态 | 运行时语义 |
| --- | --- |
| S0 | 调查旧电视墙 |
| S1 | 通过 `HS-G02-0011` 进入 HOS |
| S2 | 完成 `HOS-G02-001` 六目标找物 |
| S3 | 修复 `HS-G02-0008` 主屏 A |
| S4 | 修复 `HS-G02-0009` 主屏 B |
| S5 | 修复 `HS-G02-0010` 主屏 C |
| S6 | 取得 `EVD-G02-005`，写入 `g02_archive_restored=true` 与 `AUTO-G02-003` |

- HOS 目标：`ITM-G02-002` 电源键 A、`ITM-G02-003` 电源键 B、`ITM-G02-004` 电源键 C、正式组合项 `ITM-G02-005` 下的 `RUNTIME-ITM-G02-005-A/B` 两段短线、`ITM-G02-006` 镜面屏片。
- 干扰物：破遥控器、普通键帽、废螺丝、旧标签；拾取目标后图层真实消失，完成后不重复发放。
- 修复：正式 `HS-G02-0008/0009/0010`；A/B 各需正确电源键和对应短线，C 需正确电源键并利用前两屏的连接结果。运行时子槽使用 `RUNTIME-*`，绑定正式屏幕热点。
- 数学嵌入：磨损边缘匹配、连接数量 6/4 与资源归属证据推理；无独立答题弹窗。
- 三级提示：正式 `HINT-G02-001-1/2/3`，方向→区域→仅安装一个合法电源键。
- 软失败：退回 `SCN-G02-02:tv-wall-safe`，保留 HOS、背包、屏幕正确步骤和证据。
- 完成后进入 `RUNTIME-G02-ENERGY-SEARCH-BOUNDARY` 只读边界；不创建 SCN03 分支场景。
- 对话：`DLG-G02-0007—0009` 由 DialogueRunner 数据加载。

## 存档、变量和幂等

- 延续 schema v2 与现有正式存档槽，增加 G02 切片状态的向后兼容可选字段。
- G01 完成存档进入 G02 后持续保持：
  `g01_chapter_complete=true`、`g01_handoff_to_g02=true`、`world_star_core_count=0`、
  `ability_qima_search=true`、`ability_analysis=true`、`ability_pathfinding=true`、
  `ability_teleport=false`、`ability_shrink=false`、`ability_clone=false`。
- 仅允许完成正式变量：
  `g02_intro_scan_done`、`g02_almao_rescued`、`g02_resource_labels`、`g02_archive_restored`。
- 其余 G02 正式变量保持 false/0；不写章节完成。
- 内部持久项全部使用登记过的 `RUNTIME-*` 键，包括已调查热点、HOS 目标、屏幕子槽、最近安全点、失败前状态和对话幂等键。
- 自动存档：`AUTO-G02-001/002/003`；软失败保存安全节点与失败前有效快照；刷新停留安全节点，“继续”恢复失败前正确进度。
- 旧 G01 存档迁移不重复发物、不重复强制对白、不重复授权；损坏存档执行显式拒绝或规范化修复。

## 角色、场景与运行时资产

- 星宇、七码：只复用已验收运行时文件并锁定现有 SHA。
- 阿铆、狰：基于人物 V2.1 正式三视图生产运行时角色层，不改设计。
- 场景：基于场景 V1.0 的 SCN-001/L00 与 SCN-002/L01 概念设计，生产三个 16:9 无字运行时背景，不直接放大设计板。
- 物件/状态层：断卫星轴、封存脉冲、挂索、阿铆救援状态、三类标签、电视墙 A/B/C、六个 HOS 目标、四个干扰物、危险/FX 状态层。
- 若正式包无独立成品图层，来源统一登记
  `project_owner_authorized_runtime_production`，
  `acceptance_status=pending_review`，并记录设计包、包内路径、源 SHA、生产工具、生成/重绘部分、清理、runtime 路径和 runtime SHA。
- 禁止 PR #5、第三方网络素材、未登记生成素材、纯色 SVG/CSS 几何图形、Emoji、网页图标、设计板直接放大。

## 工程改动

- 数据/契约：`data/source/g02/slice-01/**`
- 场景：`src/scenes/g02/scn00.ts`、`scn01.ts`、`scn02.ts`
- 内容：`src/content/g02.ts`
- 对话：`src/data/dialogue/g02.ts`
- 角色：扩展正式 Almao/Zheng 运行时定义
- 引擎：通用 G02 交接、扫描、任务物、HOS、组合修复、提示、软失败与恢复；剧情数据不写死在 `GameView`
- UI：数据驱动的 G02 场景/HOS/局部近景/证据/历史/档案渲染
- 存档：schema v2 向后兼容 G02 切片适配
- 美术：`art/runtime-production/g02-slice-01/**`、`public/assets/g02-slice-01/**`
- 文档：本计划、runtime story、视觉验收、provenance、SHA、`README_G02_SLICE.md`
- 测试：validator、负向 fixtures、Vitest、Playwright 全流程/PWA/双分辨率证据
- CI：新增 `G02 Vertical Slice Gate`，保留全部既有门禁
- 发布：GitHub Pages 分支预览、`dist/` 与 `starwreck-g02-vertical-slice-0.1.0.zip`

## 门禁和验收

- 新增 `npm run validate:g02-slice-01`
- 新增 `npm run test:g02-slice-01`
- 新增 GitHub Actions：`G02 Vertical Slice Gate`
- 自动验证范围隔离、正式映射、关键物错误使用不消耗、HOS/任务物幂等、三级提示只完成一步、三场软失败、刷新/异常退出恢复、G01 变量/能力保留、后续变量锁定、星核为 0、资产 provenance/SHA/alpha、禁用机制与 console/page error 为 0。
- Playwright 从真实新游戏连续完成 G01→G02，以及合法 G01 存档继续、三场软失败、HOS/修复/提示、PWA 离线。
- 视觉包以 1366×768 和 1920×1080 成对覆盖边界、三场初始/中间/完成、危险/安全恢复、背包/证据/历史/档案、只读终点与离线状态。

## 风险

1. 正式美术包是设计母版而非独立运行时图层；本轮必须生产补齐并等待视觉验收，不能宣称直接提取。
2. SCN00 V2.1 正式状态行缺 S4/S6；仅通过已登记的运行时状态补齐，不回写正式源。
3. 磁力挂索没有正式道具 ID；必须使用内部 ID，不能误用未来磁力手套。
4. `ITM-G02-005` 将两段短线合并为一个正式条目；两个可独立拾取层使用绑定该父项的内部 ID。
5. 公开 Pages 在 PR 分支上的部署权限与环境规则可能受仓库设置影响；CI 会保留可部署 ZIP 和完整本地预览作为可审计备份。
