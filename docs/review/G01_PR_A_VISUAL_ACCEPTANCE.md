# G01 PR-A 视觉验收索引

CI 工作流 `G01 PR-A Gate` 上传 artifact：
`g01-pr-a-visual-acceptance-<run_number>`。

artifact 包含两个目录：

- `test-results/g01-pr-a-visual/1366x768/`
- `test-results/g01-pr-a-visual/1920x1080/`

每个分辨率包含：

1. `01-scn02-initial.png`：中控任务台完整场景
2. `02-scn02-task-screen-dialogue.png`：任务屏与正式对白
3. `03-scn02-clues-collected.png`：线索拾取后独立消失
4. `04-scn02-map-closeup.png`：船内地图近景
5. `05-scn02-dependency-puzzle.png`：任务依赖小游戏
6. `06-scn02-map-unlocked.png`：星图钥片正确使用
7. `07-scn02-task-chain-complete.png`：SCN-G01-02 完成态
8. `08-scn03-initial.png`：漏气货舱完整场景
9. `09-scn03-hos-initial.png`：HOS-G01-003 初始态
10. `10-scn03-hos-complete-inventory.png`：HOS 完成与背包
11. `11-scn03-pressure-closeup.png`：压力表近景小游戏
12. `12-scn03-patch-installed.png`：金属补片状态层
13. `13-scn03-soft-failure-safe-node.png`：危险软失败安全节点
14. `14-scn03-repress-dialogue.png`：复压与正式对白
15. `15-scn03-complete.png`：SCN-G01-03 完成态

Playwright 同时断言：

- 线索/HOS 视觉物件中心与热点中心在两个分辨率一致
- 找到后图层消失
- 错误使用不消耗
- 真实桌面拖拽完成正确使用
- 刷新后消失、背包、谜题、证据和安全节点一致
- 软失败不回滚补片等正确步骤
- `world_star_core_count=0`
- G01 完成与 G02 交接变量为 false
- 浏览器控制台错误为 0
