# G01 PR-C 实施计划

状态：实施中  
Issue：[#9](https://github.com/zhoujon440-hash/starwreck-math-game/issues/9)  
计划记录：[PR-C IMPLEMENTATION PLAN READY](https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5128562403)  
基线：`deded324ca71a5ccd65be4a45108aa01e7277ac4`

## 范围

- 实现 `SCN-G01-06《锈环星求救信号》`。
- 实现 `SCN-G01-07《坠落之前》`。
- 完成 G01 到 G02“旧屏幕谷外缘”的只读交接边界。
- 交付 `G01-DEMO-0.1.0`、PWA、公开试玩部署、生产 ZIP、全流程自动化与视觉证据。
- 不实现任何 G02 热点、找物、背包、谜题或剧情流程。

## 正式来源

- `docs/story/G01-G13/G01.md`
- `data/source/g01/json/`
- `data/source/g01/csv/`
- `data/source/g01/master/星骸拾荒者_G01拾光号坠落之前_Unity数据级制作脚本_V3.0.xlsx`
- `data/source/catalogs/asset-catalog-488.json`
- `docs/baseline/06_G01_G02_BOUNDARY.md`

SCN06 的正式 HOS 和三级提示记录缺失。实现只使用 `RUNTIME-*` 适配 ID，
并分别绑定正式 `HS-G01-0025`、`ITM-G01-013`、`FX-G01-005` 与 Issue #9
授权，不修改或伪造正式 JSON/CSV ID。

## 实施顺序

1. 制作并登记 SCENE-G01-007/008、SCN06 找物层、能力授权片、状态层和近景。
2. 建立 SCN06 数据契约，完成波形找物、解析机关与搜寻→分析→寻路顺序授权。
3. 建立 SCN07 数据契约，完成落点扫描、危险软失败、最近安全节点和最终交接。
4. 将 SCN00—07 串成不可跳场景的完整流程。
5. 补齐新游戏、继续、清档、试玩说明、任务/证据记录和异常退出恢复。
6. 配置 GitHub Pages、生产 ZIP、PWA离线验证和 Demo 说明。
7. 增加 PR-C Gate、Demo Gate、正向/负向测试、全流程 Playwright 与双分辨率证据。

## 冻结断言

- `world_star_core_count` 始终为 `0`。
- `g01_chapter_complete` 与 `g01_handoff_to_g02` 只在 SCN07 正式完成时变为 `true`。
- `ability_qima_search`、`ability_analysis`、`ability_pathfinding` 按顺序开放并持久化。
- `ability_teleport`、`ability_shrink`、`ability_clone` 保持 `false`。
- 关键物错误使用不消耗；危险失败不丢失证据、能力和正确步骤。
- 不使用 PR #5、第三方素材、CSS/SVG占位或未经登记的生成式素材。
