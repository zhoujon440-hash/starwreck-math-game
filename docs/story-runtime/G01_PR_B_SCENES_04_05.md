# G01 PR-B：SCN-G01-04—05 运行时说明

## 范围

本阶段只实现：

- SCN-G01-04《星图缺口》
- SCN-G01-05《垃圾雨航线》

SCN-G01-06只在SCN-G01-05完成面板中保留“锈环星求救信号”边界文字，没有场景定义、入口热点、求救信号、能力授权或剧情实现。未开发PR-C、Issue #10和G02玩法。

正式来源为 `PKG-G01-V3.0` 与 `data/source/g01/json/**`。运行时适配、正式ID、内部catalog ID、安全恢复和冻结变量集中登记在 `data/source/g01/pr-b/runtime-contract.json`。

## SCN-G01-04完整操作

1. 进入导航星图室，听取DLG-G01-0012—0013。
2. 调查HS-G01-0017破损星图台。
3. 在HOS-G01-004中找出星图碎片A/B/C和坐标标记；普通星图页、错误坐标标签保留。
4. 四件目标拾取后从近景独立消失并进入背包。
5. 将三个 `RUNTIME-*` 碎片子件分别拖到HS-G01-0018的三个运行时槽位；它们的正式父ID均为ITM-G01-010。
6. 错误碎片或坐标标记放到错误槽位时不消耗、不覆盖正确槽位、不推进状态。
7. 打开TUT-MECH-002近景，校准十二星门环。
8. DANGER-G01-003可在S1—S4触发；退回 `SCN-G01-04:star-map-console-safe`，刷新后仍在安全节点，继续后恢复失败前状态。
9. 仅在星门环校准证据已经取得后，调查HS-G01-0019执行受控分析，写入十二异常点和锈环星自删除信号。
10. 将ITM-G01-011拖到HS-G01-0020，锁定坐标并进入S6。

## SCN-G01-05完整操作

1. 进入驾驶舱，听取DLG-G01-0015—0016。
2. 依次点击HS-G01-0021安全节点A和HS-G01-0022安全节点B；未访问节点不会提前开放。
3. 在 `RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT` 取得ITM-G01-012旁路板。该热点为正式来源缺口适配，不冒充官方ID。
4. 将旁路板拖到HS-G01-0023，打开第三航段短时窗口。
5. 错误关键物放到旁路槽时不消耗、不推进。
6. DANGER-G01-004在S1—S4可触发；退回 `SCN-G01-05:route-safe-node`，保留路线段、物品、证据和正确步骤；刷新与继续均可恢复。
7. 窗口有效时点击HS-G01-0024确认安全落点，再锁定着陆航线进入S6。
8. 完成面板只显示SCN-G01-06边界，不允许进入后续运行时。

## 存档与冻结变量

schema v2保存当前场景、S0—S6、HOS、背包、已使用物、拼图、证据、路线、安全节点、失败前状态、角色状态和对话历史。发放行为幂等，刷新不重复发放。

每次提交与读档归一化均强制：

- `world_star_core_count=0`
- `g01_chapter_complete=false`
- `g01_handoff_to_g02=false`
- `ability_qima_search=false`
- `ability_analysis=false`
- `ability_pathfinding=false`
- `ability_teleport=false`
- `ability_shrink=false`
- `ability_clone=false`

搜寻、分析与路径规划只存在于当前场景的受控教程态，不写入永久能力授权。

## 运行时美术

两张场景背景均为3840×2160位图。目标物具有独立scene/inventory透明层；状态变化使用独立PNG图层。正式manifest、来源和SHA-256见：

- `data/source/g01/pr-b/runtime-art-manifest.json`
- `docs/art/G01_PR_B_RUNTIME_ASSET_PROVENANCE.json`
- `docs/art/G01_PR_B_RUNTIME_ASSET_SHA256.txt`

制作没有使用PR #5资产、第三方网络素材、纯色SVG、CSS几何道具、Emoji、网页图标或概念总览板直接放大。
