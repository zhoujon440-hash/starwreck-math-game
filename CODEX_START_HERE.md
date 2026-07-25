# Codex Start Here

## 当前阶段

先完成P0-A正式源包导入与版本事实源建立。开始任何玩法、角色、场景或剧情开发前，
必须先读取`docs/plan/CODEX_MASTER_PLAN_V2.0.md`、Issue #4、当前阶段Issue和
`docs/baseline/08_CONFIRMED_BASELINE_V2.md`。

## 开始方式

1. 阅读 `AGENTS.md`。
2. 阅读`docs/plan/CODEX_MASTER_PLAN_V2.0.md`和当前Issue。
3. 读取`docs/baseline/00_SOURCE_OF_TRUTH.md`—`08_CONFIRMED_BASELINE_V2.md`。
4. 用`source_packages/manifests/`核对原包、SHA、替代关系和缺失项。
5. 未通过当前阶段验收，不得开始后续Issue。

## 被否定的旧方案

禁止继续采用：
- 可见圆点热点；
- 纯色SVG占位场景；
- 场景里直接写物品名称；
- 按钮网格式找物；
- 物品使用后没有场景变化；
- 管理后台或PPT式页面。

## P0-A交付

- 正式原包或可验证LFS/Release位置；
- DOCX全文Markdown与JSON/CSV结构化提取；
- 版本、用途、替代关系、SHA和ZIP内原始路径；
- G01—G13脚本/数据可用性索引；
- 71人物与488资产初始目录；
- legacy隔离与精确缺失清单；
- 独立Pull Request。
