# 星骸拾荒者：十二星门

这是《星骸拾荒者：十二星门》的正式开发仓库。

项目定位：面向小学高年级至初中阶段的公益数学HOPA（Hidden Object Puzzle Adventure）游戏。

- 技术路线：HTML5 / PWA / TypeScript
- 当前目标：G01《拾光号：坠落之前》正式HOPA垂直切片
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

当前连续可玩两个正式场景：

1. `SCN-G01-00《拾光号熄灯》`：在断电领航舱完成找物、维修柜特写、背包拖拽与照明恢复。
2. `SCN-G01-01《找回七码》`：进入导航核心舱，找到四件修复部件，清理并装回核心，完成线路校准，恢复七码。

角色和剧情演出由独立内容数据驱动，支持左右立绘、表情切换、打字机、自动播放、首次关键剧情保护、对话历史、角色介绍与档案解锁。七码按
`offline → damaged → booting → normal` 完成正式出场。PWA 会保存当前场景、对白位置、角色状态、HOPA、背包和谜题进度；G01 的
`world_star_core_count` 始终为 `0`。

其余六个 G01 场景仅有经过校验的剧情节点和关闭入口，尚未制作玩法。

## 本地运行

```bash
npm ci
npm run dev
```

完整检查：

```bash
npm run check
npm run test:e2e
```

## 实现资料

- `docs/implementation/G01_SCN-00实现说明.md`
- `docs/implementation/G01角色与剧情系统说明.md`
- `docs/story/G01八场剧情结构.md`
- `docs/story/SCN-G01-00对白表.md`
- `docs/story/SCN-G01-01对白表.md`
- `docs/characters/星宇角色说明.md`
- `docs/characters/七码角色说明.md`
- `docs/implementation/NEXT.md`
- `docs/screenshots/G01-character-story-1366x768.png`
- `docs/screenshots/G01-character-story-1920x1080.png`
- `docs/screenshots/G01-qima-booting-1366x768.png`
- `docs/screenshots/G01-first-conversation-1920x1080.png`
- `docs/screenshots/G01-character-profiles-1920x1080.png`
- `art/README.md`
