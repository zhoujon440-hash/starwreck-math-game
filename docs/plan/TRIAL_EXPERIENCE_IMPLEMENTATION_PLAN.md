TRIAL EXPERIENCE IMPLEMENTATION PLAN READY

# 试用版新玩家体验实施计划

## 现状盘点

- 开发基线为 `main` 提交 `3ef331ecbd3019b22894445d5dc2c206413e09ad`，开发分支为 `codex/trial-experience-shell-v1`。
- 现有运行时已经覆盖 G01 `SCN-G01-00—07`、G01→G02 交接与 G02 `SCN-G02-00—02`，但打开网址会直接进入场景，缺少面向普通玩家的标题页、故事引导和统一资料入口。
- 剧情存档为 schema v2，本轮保持原键和数据结构兼容；UI已看状态与设置使用独立元数据，不写入剧情变量。
- 当前可进入背包的正式物品共 25 件：G01 SCN00=2、SCN01=4、SCN02=2、SCN03=4、SCN04=4、SCN05=1、SCN06=1；G02 SCN01=1、SCN02=6。

## 信息架构与页面流程

1. 标题页：继续游戏、新游戏、章节选择、故事档案、设置、制作人员，以及按浏览器能力显示的安装和全屏入口。
2. 新游戏：故事背景六张卡片 → G01章节介绍 → 正式运行时；跳过仅跳过展示，不授予剧情进度。
3. 继续游戏：从schema v2旧存档恢复，不重复强制背景引导或一次性对白。
4. G01→G02：首次进入显示前情回顾和G02当前任务介绍，之后可从档案主动回看。
5. 游戏内档案：世界、章节、人物、物品、证据、对白；未解锁内容使用世界内语言，不暴露内部编号。
6. 设置：字体大小、对白速度、减弱动画、全屏、双重确认重置。

## 数据模型与兼容

- `GameSession.schemaVersion=2`、正式剧情变量、物品、证据、能力和checkpoint保持不变。
- 新增 `starwreck:ui-meta:v1`：`introSeen`、`g02RecapSeen`、人物卡/物品卡已看集合，以及真实生效的显示设置。
- 旧存档首次打开时直接进入标题页；继续按钮读取旧存档摘要；旧进度不会重复发物品、证据或能力。
- 损坏剧情存档或UI元数据均安全回退到标题页，不白屏；重置仅清除本机进度和已看记录，不删除PWA缓存。

## 文案与资产来源

- 世界与章节：`docs/story/G01-G13/G01.md`、`docs/story/G01-G13/G02.md`、`docs/story-runtime/`内已确认运行时说明。
- 人物：既有角色数据与已验收的星宇、七码、阿铆、郑运行时立绘。
- 物品：G01/G02正式 `ItemDefinition`、场景运行时合同及已登记图标。
- 本轮只对已验收运行时图进行裁切、暗角和UI叠层，不新增或重绘人物身份，不使用PR #5、第三方图片、Emoji或未登记生成素材。
- 详细逐条映射记录在 `docs/story-runtime/TRIAL_EXPERIENCE_COPY_MAPPING.md`。

## 测试矩阵

- 单元/语义：标题页、UI元数据、旧存档、人物4人、背包物品25件完整字段、正式文案与锁定边界。
- E2E：无存档、全新游戏、引导跳过、G01/G02旧存档继续、人物卡、物品卡、档案、设置、覆盖确认、双重重置、损坏存档、正式界面禁用开发文字、控制台零错误。
- PWA：在线预热后离线打开标题页并继续本机存档。
- 视觉：1366×768与1920×1080的标题、引导、章节、人物、物品、档案、设置与继续游戏成对证据；新游戏和旧存档继续提供视频与trace。
- 回归：保留并运行来源、基线、角色、剧情、G01 PR-A/PR-B/Demo、G02 Slice、Build、Playwright与PWA全部既有门禁。

## 预计文件清单

- UI：`src/ui/TitleScreen.ts`、`StoryIntro.ts`、`CharacterIntroCard.ts`、`ItemDetailCard.ts`、`ArchiveView.ts`、`SettingsView.ts`、`TrialExperienceApp.ts`。
- 数据：`src/data/trial/story.ts`、`characters.ts`、`items.ts`；元数据：`src/game/uiMetaSave.ts`。
- 接入：`src/main.ts`、`src/ui/GameView.ts`、`src/styles.css`、`src/game/save.ts`。
- 质量与交付：专属validator、正向/负向测试、E2E/PWA、`Trial Experience Gate`、部署工作流、生产打包脚本、README与验收文档。

## 范围冻结与风险

- 不实现 `SCN-G02-03A/B/C/D`、磁力手套、五塔供能、管理员权限、星核、G02后续剧情或G03。
- 不建立联网账号系统，不放置无效音频设置。
- 主要风险为现有长流程E2E需要适配标题页入口，以及分支Pages试玩部署需要等待GitHub Actions完成；两项均纳入专属门禁。
