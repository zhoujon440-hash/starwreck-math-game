# G01 PR-B视觉验收索引

## 生成方式

`tests-e2e/g01-pr-b.spec.ts` 在1366×768与1920×1080两个Playwright项目中运行同一真实流程。截图写入：

`test-results/g01-pr-b-visual/<分辨率>/`

G01 PR-B Gate上传artifact：

`g01-pr-b-visual-acceptance-<run_number>`

## 每个分辨率的成对证据

1. `01-scn04-initial.png`：星图室初始态。
2. `02-scn04-hos-initial.png`：HOS-G01-004拾取前。
3. `03-scn04-hos-items-inventory.png`：拾取后物件消失并进入背包。
4. `04-scn04-wrong-use-nonconsume.png`：坐标标记错误使用不消耗。
5. `05-scn04-fragments-embedded.png`：三碎片嵌入。
6. `06-scn04-calibrated.png`：十二星门环校准。
7. `07-scn04-safe-node.png`：数据毛刺进入安全节点。
8. `08-scn04-safe-node-refresh.png`：刷新后仍在安全节点。
9. `09-scn04-evidence-analysis.png`：取得证据后的受控分析。
10. `10-scn04-complete.png`：坐标锁定与场景完成。
11. `11-dialogue-history.png`：对话历史。
12. `12-character-profile.png`：角色档案。
13. `13-scn05-initial.png`：垃圾雨驾驶舱初始态。
14. `14-scn05-node-a.png`：第一安全节点。
15. `15-scn05-bypass-inventory.png`：旁路板进入背包。
16. `16-scn05-wrong-use-nonconsume.png`：错误关键物不消耗。
17. `17-scn05-window-open.png`：旁路安装与短时窗口。
18. `18-scn05-window-failure-safe-node.png`：窗口失败回安全节点。
19. `19-scn05-safe-node-refresh.png`：刷新后安全节点仍存在。
20. `20-scn05-complete-boundary.png`：安全落点、S6刷新与SCN-G01-06边界。

## 自动视觉断言

- HOS-G01-004四件目标的热点中心与位图中心误差小于2px。
- 两个分辨率运行完全相同的拾取、背包、错误使用、拼图、软失败、刷新、继续和完成流程。
- 拾取后的图层不可见。
- SCN-G01-05完成刷新后，边界文字仍存在。
- 浏览器console error与page error均为0。
- 最终存档验证三项冻结进度变量与六项永久能力变量。

视觉artifact只包含运行时截图与报告，不向正式游戏开启热点调试框。
