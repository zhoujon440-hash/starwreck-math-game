# G01 PR-B：SCN-G01-04—05 运行时说明

## 范围

本阶段只实现：

- SCN-G01-04《星图缺口》
- SCN-G01-05《垃圾雨航线》

SCN-G01-06只在SCN-G01-05完成面板中保留“锈环星求救信号”边界文字，没有场景定义、入口热点、求救信号、能力授权或剧情实现。未开发PR-C、Issue #10和G02玩法。

正式来源为 `PKG-G01-V3.0` 与 `data/source/g01/json/**`。运行时适配、正式ID、内部catalog ID、安全恢复和冻结变量集中登记在 `data/source/g01/pr-b/runtime-contract.json`。

## SCN-G01-04完整操作

1. 进入导航星图室，只触发DLG-G01-0012；该对白首次不可跳过且不会串播0013。
2. 调查HS-G01-0017破损星图台，开始星图机制后才触发DLG-G01-0013。
3. 在HOS-G01-004中找出星图碎片A/B/C和坐标标记；普通星图页、错误坐标标签保留。
4. 四件目标拾取后从近景独立消失并进入背包。
5. 将三个 `RUNTIME-*` 碎片子件分别拖到HS-G01-0018的三个运行时槽位；它们的正式父ID均为ITM-G01-010。
6. 错误碎片或坐标标记放到错误槽位时不消耗、不覆盖正确槽位、不推进状态。
7. 打开TUT-MECH-002近景，校准十二星门环。
8. DANGER-G01-003的S1—S4安全恢复契约保留；调试触发器仅在 `DEBUG_UI=true` 时提供，不进入正式界面。
9. 仅在星门环校准证据已经取得后，调查HS-G01-0019执行受控分析，写入十二异常点和锈环星自删除信号。
10. 将ITM-G01-011拖到HS-G01-0020，锁定坐标并进入S6。

## SCN-G01-05完整操作

1. 进入驾驶舱时不自动播放路线对白。第一次点击HS-G01-0021打开航线时才触发DLG-G01-0015。
2. 节点A、B各有一个登记在runtime contract中的 `RUNTIME-*` 碰撞分支。选择错误路线只撤销当前尝试：节点A阶段保持S0；节点B阶段保持已确认的节点A，不重置物品、证据或整个场景。
3. 正确依次点击HS-G01-0021安全节点A和HS-G01-0022安全节点B；未访问节点不会提前开放。
4. 在 `RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT` 取得ITM-G01-012旁路板。该热点为正式来源缺口适配，不冒充官方ID。
5. 将旁路板拖到HS-G01-0023。成功安装时才触发DLG-G01-0016，并持久化窗口开始时间与12秒截止时间。
6. 错误关键物放到旁路槽时不消耗、不推进。
7. 正式界面显示剩余秒数；到期自动进入 `SCN-G01-05:route-safe-node`。刷新使用同一截止时间计算剩余时间，已到期存档会直接恢复到安全节点。
8. 从安全节点继续时进入S3的旁路重启步骤。`RUNTIME-HS-G01-05-REOPEN-WINDOW`复用已安装旁路板，不重复发放物品，也不把过期S4恢复成仍开放窗口。
9. 窗口有效时点击HS-G01-0024确认安全落点，再锁定着陆航线进入S6。
10. 完成面板只显示SCN-G01-06边界，不允许进入后续运行时。

## 提示与checkpoint

- SCN-G01-04的S1、S2、S3三级提示分别完成一次找物、一次碎片安装和TUT-MECH-002校准。
- SCN-G01-05的S0—S5关键阶段三级提示分别执行当前唯一合法的下一步。
- 两场均仅将S0、S2、S5、S6写入rollback checkpoint；S1、S3、S4仍写入普通自动存档，因此刷新保持当前临时状态，主动回退则返回最近的持久checkpoint。

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
