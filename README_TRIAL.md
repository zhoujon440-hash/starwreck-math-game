# 《星骸拾荒者：十二星门》Web 功能原型（已冻结）

> 路线状态：本 Web/Vite 版本仅保留为内容与功能验证原型，不再作为正式游戏体验继续扩展。新的正式技术验证位于 `godot/`，目标为 Godot 4.7.2 Windows x86_64 原生单关样板。

版本：`STARWRECK-TRIAL-0.4.0`

公开试玩地址：<https://zhoujon440-hash.github.io/starwreck-math-game/>

本版本把 G01 完整序章与 G02 旧屏幕谷 `SCN-G02-00—02` 整合为面向普通玩家的正式试用体验。打开网址后先进入标题页，可开始新游戏、继续本机存档、回顾故事和查看人物、物品、证据及对白档案。

## 试玩范围

1. G01 `SCN-G01-00—07`：从拾光号断电到安全抵达旧屏幕谷外缘。
2. G01→G02交接：前情回顾与当前任务介绍。
3. G02 `SCN-G02-00—02`：封存脉冲调查、阿铆救援与旧电视墙档案恢复。
4. 完成后停在四组能量信号前的安全边界；没有 `SCN-G02-03A/B/C/D` 或后续章节玩法。

## 玩家入口

- 无存档时“继续游戏”不可用；选择“新游戏”先播放可控制的六张故事卡。
- 有存档时标题页显示最近场景、时间和进度；“继续游戏”恢复本机存档，不重复正式一次性奖励。
- 场景右上角的小型半透明HUD提供“上一场景”“场景地图”和“返回当前任务”；正式游玩不显示全宽网页顶栏。回访不会改变主线、重复物品或重播一次性对白。
- 十一个正式场景各使用一种独立小游戏，均保留初始、错误、部分完成和完成状态。
- 小游戏直接位于场景设备坐标上：正确动作实时吸附并自动判定，错误拖放弹回，不打开中央表单式面板，也不使用通用提交/重置按钮。
- 正式身份在启动前完全隐藏，设备完成修复与启动后才自我介绍为七码、与星宇互动并发布当前任务；人物卡随后进入档案。
- 标题、任务、档案、设置、人物卡、物品卡和弹窗统一使用白色浅色界面外壳，场景原画保持不变。
- 章节选择只能查看已经合法解锁的章节。
- 故事档案包含世界、章节、人物、25件背包物品、证据和对白。
- 设置可调整字体、对白速度、减弱动画和全屏；重置存档需要双重确认。
- 首次联网完整载入后，PWA可离线进入标题页并继续本机进度。

## 部署

生产包为 `release/starwreck-trial-0.4.0.zip`。解压后将文件部署到项目 Pages 根路径；包内保留本说明。打包器固定ZIP条目顺序、时间和权限，同一源码可在Windows与Linux得到相同文件；SHA-256记录在 `release/starwreck-trial-0.4.0.sha256`。

## 本地验证

```bash
npm ci
npm run validate:trial-experience
npm run test:trial-experience
npm run validate:game-feel
npm run test:game-feel
npm test
npm run build
npm run test:e2e
npm run test:pwa
npm run package:trial-experience
```

完整验收还会执行来源、基线、角色、剧情、G01各阶段及G02 Slice既有门禁。本PR只等待PMO和项目负责人试玩验收，不会自行合并或启动后续章节。

## 正式源镜像

Actions不再依赖仓库Git LFS带宽。十九项正式源和三项legacy隔离原件使用固定Release镜像恢复：

- Release：<https://github.com/zhoujon440-hash/starwreck-math-game/releases/tag/source-baseline-mirror-v1>
- 机器清单：`source_packages/manifests/formal-source-mirror.json`
- 整包SHA-256：`600573f9c1a4cd712349f177fc3deb09dd1ca0d3e46c323ed9bd16cf127a8f50`

恢复脚本先校验整包大小、SHA-256和精确条目集合，再校验每个输出文件；验证失败会直接阻断工作流，既有来源完整性门禁不会被跳过。

