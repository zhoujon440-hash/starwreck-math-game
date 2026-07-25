# 官方源资料包清单与校验值

状态以`source_packages/manifests/source-packages.json`为机器事实源。可获得的大包已使用
Git LFS保存；缺失包不得由旧版或生成内容代替。

| 文件 | 大小（字节） | SHA-256 | 状态 |
|---|---:|---|---|
| 星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip | 74253878 | `a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb` | 已校验，Git LFS |
| 星骸拾荒者_场景美术设计全集_V1.0.zip | 47905077 | `731cc680ee98eba1bf27474d4d613476dbbe02ca7fff7dfb1beb4b2bb0595de0` | 已校验，Git LFS |
| 星骸拾荒者_道具美术正式包_V3.0.zip | 31998862 | `f712245f25945b234fd73d794b3ff6d6be39744da3a56324a34706ee85f6aa2d` | 已校验，Git LFS |
| 星骸拾荒者_技能与装备效果HOPA正式包_V2.0.zip | 30540605 | `882e933ca90917c37a6cd3c88d5988a2ce0ce8c6dbaf1d86e5f29102290ee5e1` | 缺失 |
| 星骸拾荒者_机制可视化HOPA正式包_V2.0.zip | 39204379 | `de7367d1ec06f97d3b8cca3c671ca9680f522f714929997d4a60fd9af1678b2f` | 已校验，Git LFS |
| 星骸拾荒者_危险视觉HOPA正式包_V2.0.zip | 61745430 | `981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b` | 缺失 |
| 星骸拾荒者_界面美术HOPA正式包_V2.0.zip | 49547246 | `827d4262dcf68acf50abdbe77a63192c78cc7b44bf588b389bcbdc612e1d537a` | 已校验，Git LFS |
| 星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0.zip | 2901474 | `85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043` | 缺失；旧Codex包损坏 |
| 星骸拾荒者_G02-G13全章节HOPA实施脚本_V2.0.zip | 762114 | `f8b9d6f628cac99e5ba799d9cac2f630c45650cf0489dad548de31f569e7eb35` | 已校验，Git LFS及全文 |
| 星骸拾荒者_G02-G13_Unity数据级制作脚本完整包_V2.1.zip | 1112954 | `4db2cbb67e688aa7b55b5fe509f38377577e25a2259df3011c105f7c52c59708` | 完整包缺失；仅G02/G03独立包已导入 |

## 损坏包处理

旧`星骸拾荒者_Codex脚本与架构基线包_V1.0.zip`只有11626字节，SHA为
`1594cefcc551d1c6f5bc6cd86081ec81d621e0bcbb141540e5434e1bb5e39343`，
缺少ZIP中央目录结束记录，已移入`archive/legacy/corrupt/`，其中任何局部内容
均未用作正式资料。

## 使用原则

1. SHA-256不一致的同名文件视为不同版本，必须停止导入并报告。
2. 设计板是生产事实源，不等于运行时透明资产。
3. 缺失原包只登记缺口，不得由旧版、摘要或生成内容补齐。
4. Git LFS路径和逐文件状态见`source_packages/manifests/source-packages.json`。
