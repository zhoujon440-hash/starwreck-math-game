# Godot 子树规则

- 本子树使用 Godot 4.7.2-stable Standard 与 GDScript 2.0。
- 只导出 Windows x86_64；禁止 Web preset、WebView、HTML、DOM 或 TypeScript 运行时。
- 目标分辨率为 1920×1080，并兼容 1366×768。
- 游戏数据与脚本分离；剧情、线索、推论和机关参数由 Godot 侧 JSON/Resource 提供。
- 新增行为必须先写失败测试，再做最小实现并复测。
- 关键物品错误使用不得消耗，正确推理与正确机关进度必须可保存恢复。
- 本阶段仅实现 SCN-G01-00；不得加入 SCN-G01-01 gameplay 或后续场景。
- 交互必须发生在世界或原生推理工作台中，不得使用网页式表单、通用提交按钮或答案提示。

