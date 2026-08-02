# 《星骸拾荒者：十二星门》正式试用版

版本：`STARWRECK-TRIAL-0.2.0`

公开试玩地址：<https://zhoujon440-hash.github.io/starwreck-math-game/>

本版本把 G01 完整序章与 G02 旧屏幕谷 `SCN-G02-00—02` 整合为面向普通玩家的正式试用体验。打开网址后先进入标题页，可开始新游戏、继续本机存档、回顾故事和查看人物、物品、证据及对白档案。

## 试玩范围

1. G01 `SCN-G01-00—07`：从拾光号断电到安全抵达旧屏幕谷外缘。
2. G01→G02交接：前情回顾与当前任务介绍。
3. G02 `SCN-G02-00—02`：封存脉冲调查、阿铆救援与旧电视墙档案恢复。
4. 完成后停在四组能量信号前的安全边界；没有 `SCN-G02-03A/B/C/D` 或后续章节玩法。

## 玩家入口

- 无存档时“继续游戏”不可用；选择“新游戏”先播放可控制的六张故事卡。
- 有存档时标题页显示最近场景、时间和进度；“继续游戏”恢复schema v2本机存档，不重复正式一次性奖励。
- 章节选择只能查看已经合法解锁的章节。
- 故事档案包含世界、章节、人物、25件背包物品、证据和对白。
- 设置可调整字体、对白速度、减弱动画和全屏；重置存档需要双重确认。
- 首次联网完整载入后，PWA可离线进入标题页并继续本机进度。

## 部署

生产包为 `release/starwreck-trial-0.2.0.zip`。解压后将文件部署到项目 Pages 根路径；包内保留本说明。SHA-256记录在 `release/starwreck-trial-0.2.0.sha256`。

## 本地验证

```bash
npm ci
npm run validate:trial-experience
npm run test:trial-experience
npm test
npm run build
npm run test:e2e
npm run test:pwa
npm run package:trial-experience
```

完整验收还会执行来源、基线、角色、剧情、G01各阶段及G02 Slice既有门禁。本PR只等待PMO和项目负责人试玩验收，不会自行合并或启动后续章节。
