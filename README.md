# 星骸拾荒者：十二星门

当前可玩范围为 G01 序章八场完整 Demo：`SCN-G01-00`—`SCN-G01-07`，完成后停在
旧屏幕谷外缘的 G02 只读交接画面。试玩入口、安装与部署说明见
[`README_DEMO.md`](README_DEMO.md)，PR-C 运行时说明和双分辨率证据索引见
[`docs/story-runtime/G01_DEMO_SCENES_06_07.md`](docs/story-runtime/G01_DEMO_SCENES_06_07.md)
与 [`docs/review/G01_DEMO_VISUAL_ACCEPTANCE.md`](docs/review/G01_DEMO_VISUAL_ACCEPTANCE.md)。

这是《星骸拾荒者：十二星门》的正式开发仓库。

项目定位：面向小学高年级至初中阶段的公益数学HOPA（Hidden Object Puzzle Adventure）游戏。

- 技术路线：HTML5 / PWA / TypeScript
- 当前版本：`G01-DEMO-0.1.0`
- 公开试玩：<https://zhoujon440-hash.github.io/starwreck-math-game/>
- 主角：星宇
- 搭档：七码
- 十二星球：G02—G13

## Codex入口

1. 阅读 `AGENTS.md`
2. 阅读 `CODEX_START_HERE.md`
3. 执行 `tasks/TASK-001_G01正式HOPA重构.md`

## 核心原则

- 场景内不得显示大圆点调试热点。
- 找物对象必须嵌入场景画面。
- 背包道具使用后必须产生可见的场景状态变化。
- 不做战斗、血量、伤害、敌人AI或实时3D自由移动。
- 管理员冲突采用证据核验与权限解除。

当前仓库正在由Codex按G01正式HOPA任务推进。

## 当前可玩范围

本轮可以从 `SCN-G01-00《拾光号熄灯》` 连续游玩至
`SCN-G01-07《坠落之前》`：

1. 在断电领航舱中找到应急手灯；
2. 用手灯调查熔断配电盒；
3. 打开维修柜局部特写并完成画面找物；
4. 将临时保险丝放入背包；
5. 选择或拖拽保险丝到应急照明槽；
6. 合上保护开关，恢复照明并到达 S5；
7. 进入导航核心舱，确认七码离线并受损；
8. 在 `HOS-G01-002` 找回四件维修组件；
9. 校正芯片方向，按顺序拖拽组件完成托架修复；
10. 观看不可跳过的 booting，完成七码首次正式对白；
11. 查看七码档案和完整对话历史，并从本地存档恢复完成态；
12. 完成船上任务单、货舱漏气修复、星图拼图与垃圾雨航线；
13. 复原锈环星求救信号，依次授权七码搜寻、分析和寻路；
14. 完成近地轨道落点扫描和软失败恢复，停在旧屏幕谷外缘交接。

PWA 支持离线缓存、安装和本地自动存档。关键道具错误使用不消耗，提示分为方向、
区域、完成一步三级。G02 只保留交接画面，不开发热点、找物、背包、谜题或剧情流程。

PR #2 第二轮视觉整改后，维修柜关闭/打开使用两套正式手绘状态图；应急手灯和柜内目标物均缩放并融入环境杂物，拾取与读档后从独立图层消失。场景继续使用统一 `1672 × 941` 设计坐标。正式 UI 默认隐藏内部状态、schema 与开发验收信息；CI 会上传双分辨率全链路截图及仅供验收的固定设施热点校准图。

## 本地运行

```bash
npm ci
npm run dev
```

完整检查：

```bash
npm run check
npm run validate:character-story
npm run test:character-story
npm run test:e2e
```

## 实现资料

- `docs/implementation/G01_SCN-00实现说明.md`
- `docs/implementation/NEXT.md`
- `docs/screenshots/SCN-G01-00-1920x1080.png`
- `docs/screenshots/SCN-G01-00-1366x768.png`
- `docs/story-runtime/G01_CHARACTER_STORY_RUNTIME.md`
- `docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json`
- `art/README.md`
