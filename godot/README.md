# STARWRECK Godot SCN-G01-00 Windows Review Build

这是《星骸拾荒者：十二星门》的 Windows 原生单关技术样板，只包含 `SCN-G01-00 · 拾光号熄灯`。

运行 `starwreck-godot-scn-g01-00.exe` 后选择“新游戏”。玩家需要找到应急手灯、用光束调查 7 条现场线索、在线索板建立 `supports / contradicts / supersedes` 关系并形成 4 项推论，再操作配电箱的 B 支路隔离拉杆、备用保险丝槽、A↔C 耦合旋钮和总保护开关。

本关承接小说 V3.1 中拾光号通过应龙“不完美。可修正。准予远航。”认证、离开百工星环的情节：进近零号地球时，封锁光网的外部冲击由 B 支路灌入。玩家必须用 Rev.3 复检记录取代星宇旧有的 B→C 快修习惯，在复电后保留来自同一方向的两条冲突信号；较弱信号的发送者仍标记为 `UNKNOWN`。

- 目标：Windows 10/11 x86_64。
- 引擎：Godot 4.7.2-stable Standard。
- 不需要浏览器、Node、npm 或网络连接。
- 没有 Web export、WebView 或 HTML/DOM 运行时。
- 本样板在供电恢复、两条船尾信号完成分离后停在 `SCN-G01-00 / SLICE_COMPLETE`，不包含 SCN-G01-01 gameplay。

本地验证：

```bash
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --script res://tests/runtime_smoke.gd
godot --path godot --editor
godot --headless --path godot --export-release "Windows Desktop" ../release/starwreck-godot-scn-g01-00.exe
```

