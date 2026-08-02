# 试用版文案来源映射

版本：`STARWRECK-TRIAL-0.2.0`

本文件记录体验层文案的正式依据。运行时只做中性概述，不新增世界事实，不改变冻结剧情。

| 体验内容 | 运行时数据 | 正式来源 |
| --- | --- | --- |
| 十二星门、拾荒航行、拾光号危机、锈环星求救 | `src/data/trial/story.ts` | `docs/story/G01-G13/G01.md`、`docs/story/G01-G13/G02.md` |
| G01序章介绍与目标 | `src/data/trial/story.ts` | `docs/story-runtime/G01_CHARACTER_STORY_RUNTIME.md`、`README_DEMO.md` |
| G01 SCN02—07回顾 | `src/data/trial/story.ts` | `docs/story-runtime/G01_PR_A_SCENES_02_03.md`、`G01_PR_B_SCENES_04_05.md`、`G01_DEMO_SCENES_06_07.md` |
| G02 SCN00—02介绍与目标 | `src/data/trial/story.ts` | `docs/story/G01-G13/G02.md`、`docs/story-runtime/G02_VERTICAL_SLICE_00_02.md` |
| 星宇、七码、阿铆、郑人物资料 | `src/data/trial/characters.ts` | `src/data/characters/index.ts`、G01/G02正式运行时资料 |
| G01/G02全部25件背包物品 | `src/data/trial/items.ts` | 各场景 `ItemDefinition`、正式场景合同、已登记物品图标 |
| 已取得证据与对白历史 | `src/ui/ArchiveView.ts` | schema v2 `GameSession.evidenceIds`、`dialogueHistory` |

## 文案边界

- 人物关系只描述当前试玩中已经出现的事实。
- 物品“观察提示”不会直接给出谜题完整答案。
- 锁定内容使用“尚未取得记录”“等待路线确认”等世界内语言。
- 正式界面不显示schema、runtime ID、切片、验收、门禁或开发范围。
- `SCN-G02-03A/B/C/D`及之后没有运行时入口、内容或预告式玩法说明。
