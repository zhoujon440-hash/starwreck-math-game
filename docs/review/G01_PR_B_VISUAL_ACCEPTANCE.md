# G01 PR-B视觉验收索引

## 生成方式

`tests-e2e/g01-pr-b.spec.ts` 在1366×768与1920×1080两个Playwright项目中运行同一真实流程。截图写入：

`test-results/g01-pr-b-visual/<分辨率>/`

G01 PR-B Gate上传artifact：

`g01-pr-b-visual-acceptance-<run_number>`

## 每个分辨率的成对证据

每个Playwright分辨率均生成相同的29张证据：

1. `01-scn04-initial.png`：星图室初始态。
2. `02-scn04-dialogue-0013-after-star-map-start.png`：DLG-G01-0013只在启动星图机制后出现。
3. `03-scn04-hos-initial-nonblank.png`：HOS-G01-004完整、非空拾取前画面。
4. `04-scn04-hos-items-inventory.png`：拾取后物件消失并进入背包。
5. `05-scn04-wrong-use-nonconsume.png`：坐标标记错误使用不消耗。
6. `06-scn04-fragments-embedded.png`：三碎片嵌入。
7. `07-scn04-hint-level3-before-step.png`：SCN04三级提示前。
8. `08-scn04-hint-level3-completed-calibration-step.png`：三级提示实际完成TUT-MECH-002一步。
9. `09-scn04-evidence-analysis.png`：取得证据后的受控分析。
10. `10-scn04-complete.png`：坐标锁定与场景完成。
11. `11-dialogue-history.png`：对话历史。
12. `12-character-profile.png`：角色档案。
13. `13-scn05-initial.png`：垃圾雨驾驶舱初始态。
14. `14-scn05-wrong-route-a-before.png`：节点A错误路线前。
15. `15-scn05-wrong-route-a-one-step-back.png`：节点A碰撞仅撤销本次尝试。
16. `16-scn05-dialogue-0015-after-route-open.png`：DLG-G01-0015只在打开航线后出现。
17. `17-scn05-wrong-route-b-before.png`：节点B错误路线前。
18. `18-scn05-wrong-route-b-one-step-back-node-a-kept.png`：节点B碰撞后节点A仍保留。
19. `19-scn05-hint-level3-before-step.png`：SCN05三级提示前。
20. `20-scn05-hint-level3-completed-node-b.png`：三级提示实际完成节点B。
21. `21-scn05-bypass-inventory.png`：旁路板进入背包。
22. `22-scn05-wrong-use-nonconsume.png`：错误关键物不消耗。
23. `23-scn05-dialogue-0016-only-after-bypass-install.png`：DLG-G01-0016只在旁路片成功安装后出现。
24. `24-scn05-real-window-countdown-open.png`：真实12秒窗口及可见倒计时。
25. `25-scn05-countdown-remaining-restored-after-refresh.png`：刷新后按持久化截止时间恢复剩余秒数。
26. `26-scn05-countdown-auto-expired-safe-node.png`：倒计时自动到期并进入安全节点。
27. `27-scn05-expired-safe-node-persists-after-refresh.png`：已到期存档刷新后仍在安全节点。
28. `28-scn05-resume-latest-valid-step-bypass-kept.png`：继续后回到旁路重启步骤，已安装旁路保持。
29. `29-scn05-complete-boundary.png`：安全落点、完成刷新与SCN-G01-06边界。

## 自动视觉断言

- HOS-G01-004四件目标的热点中心与位图中心误差小于2px。
- 两个分辨率运行完全相同的拾取、背包、错误使用、拼图、错误路线、倒计时、自动到期、刷新、继续和完成流程。
- 拾取后的图层不可见。
- DLG-G01-0013、0015、0016分别绑定真实动作，且不存在提前串播。
- 两个错误航线均为正式运行时可操作热点，错误只撤销本次尝试。
- 倒计时不是隐藏测试热点驱动；测试只缩短持久化截止时间以覆盖真实自动到期路径。
- SCN04/05三级提示均通过引擎动作实际完成一个合法步骤。
- SCN-G01-05完成刷新后，边界文字仍存在。
- 浏览器console error与page error均为0。
- 最终存档验证三项冻结进度变量与六项永久能力变量。

视觉artifact只包含运行时截图与报告，不向正式游戏开启热点调试框。
