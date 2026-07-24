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

本轮已完成 `SCN-G01-00《拾光号熄灯》`：

1. 在断电领航舱中找到应急手灯；
2. 用手灯调查熔断配电盒；
3. 打开维修柜局部特写并完成画面找物；
4. 将临时保险丝放入背包；
5. 选择或拖拽保险丝到应急照明槽；
6. 合上保护开关，恢复照明并到达 S5；
7. 进入 S6 下一场景交接点，但不提前制作后续场景。

PWA 支持离线缓存和本地自动存档。关键道具错误使用不消耗，提示分为方向、区域、短暂高亮三级。

PR #2 第一轮整改后，可拾取物均为独立透明图层；场景使用统一 `1672 × 941` 设计坐标，拾取、读档和双分辨率热点位置保持一致。CI 会上传覆盖 S0、S1、S2、S3、S5 的视觉验收 artifact。

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
- `docs/implementation/NEXT.md`
- `docs/screenshots/SCN-G01-00-1920x1080.png`
- `docs/screenshots/SCN-G01-00-1366x768.png`
- `art/README.md`
