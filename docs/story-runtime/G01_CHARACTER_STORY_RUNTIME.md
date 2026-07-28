# G01 角色剧情运行时

本分支从合并提交 `716a7dc90c8b2fb2a2310174a3df34ba515f1fd5` 开始，只处理 Issue #3。

## 已实现

- 星宇和七码的身份、正式编号、头像状态、运行时路径与来源集中在 `src/data/characters/`。
- 正式对白 `DLG-G01-0001`—`DLG-G01-0006` 由数据加载器读取，不在视图组件中硬编码台词。
- `DialogueRunner` 负责节点推进和变量写入；`DialogueHistory` 负责去重历史；`CharacterPortrait` 只从角色数据解析正式头像。
- schema v2 存档保存当前场景、场景状态、对白节点、已读节点、历史、角色状态、档案解锁、热点、找物、机关、提示和交接变量。
- SCN-G01-00 已接入星宇正式头像、开场对白、角色档案和对话历史；原找物、背包、拖拽、提示、读档与安全节点逻辑保持可玩。

## 正式数据适配

对白文本、场景 ID、触发条件和 G01 交接边界来自：

- `data/source/g01/json/对话脚本.json`
- `data/source/g01/json/热点清单.json`
- `data/source/g01/json/找物清单.json`
- `data/source/g01/json/背包道具流转.json`
- `data/source/g01/json/场景状态机.json`
- `data/source/g01/json/三级提示.json`
- `data/source/g01/json/程序变量.json`

运行时补充的 `speaker_id`、头像状态、节点链接和布尔开关只承担适配职责，不改写正式台词、触发语义或章节边界。

## 当前阻断

SCN-G01-01 的正式运行时场景和关键道具图层不足，详细证据见
`docs/review/G01_SCN01_FORMAL_ART_BLOCKER.md`。在获得可用正式素材前：

- 不制作 CSS 或纯色占位道具；
- 不自行生成场景或道具；
- 不把设计总览板称为运行时场景；
- 不实现或展示 SCN-G01-02 内容；
- PR 保持 Draft，不发布 READY。
