# G01 PR-A 合并后纠正报告

纠正依据：Issue #9 项目负责人评论
[`5115004680`](https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5115004680)。

范围只包含已合并 PR-A 的 SCN-G01-02、SCN-G01-03、相关状态/存档、测试、
工作流和视觉证据。没有开发 SCN-G01-04/05，没有启动 PR-B、PR-C、Issue #10
或 G02。

## P0 纠正

1. `GameSession` 新增持久化 `activeRuntimeNodeId` 与 `safeRecovery`。
2. S1—S4 软失败进入独立
   `SCN-G01-03:cargo-safety-door` 子状态，保存失败前状态；刷新保持安全节点，
   继续后恢复原进度。
3. 软失败不创建证据。漏气证据仅在调查 `HS-G01-0013` 后产生，压力证据仅在
   完成测压校准后产生。
4. 恢复节点不开放失败前热点；物品、HOS、谜题、证据、正确步骤、历史与档案
   原样保留，不重复发放。
5. 旧的“仅弹层”存档会迁移为持久化安全节点；与已完成动作不一致的提前证据
   会被移除。
6. `HS-G01-0012` 保留正式“星图室门”语义；货舱入口改为
   `RUNTIME-HS-G01-02-CARGO-ENTRY`，冲突与优先级写入运行时适配清单。
7. 截图函数等待全部图片、CSS 背景和字体解码，1920×1080 HOS 不再空白。

## 自动化证据

- S1、S2、S3、S4 各有独立单元测试和 E2E。
- 每阶段验证安全节点持久化、刷新、继续恢复、证据时序、全进度保留和不重复
  发放。
- 双分辨率各 45 张运行时截图。
- `world_star_core_count=0`。
- `g01_chapter_complete=false`。
- `g01_handoff_to_g02=false`。
