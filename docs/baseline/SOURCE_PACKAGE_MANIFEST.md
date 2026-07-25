# 官方源资料包清单与校验值

以下文件是项目负责人持有的正式源包。大体积美术包后续使用Git LFS或GitHub Release保存，不允许普通提交拆散后失去版本信息。Codex在对应原包未可访问前，不得自行生成替代美术。

| 文件 | 大小（字节） | SHA-256 | 状态 |
|---|---:|---|---|
| 星骸拾荒者_人物形象设计全集_V2.1_补齐版.zip | 74253878 | `a31f21fbe0348be6ff1b9f7b21f53715ccf9dccf59d487cda2296fa4fdd0fceb` | 待Git LFS/Release上传 |
| 星骸拾荒者_场景美术设计全集_V1.0.zip | 47905077 | `731cc680ee98eba1bf27474d4d613476dbbe02ca7fff7dfb1beb4b2bb0595de0` | 待Git LFS/Release上传 |
| 星骸拾荒者_道具美术正式包_V3.0.zip | 31998862 | `f712245f25945b234fd73d794b3ff6d6be39744da3a56324a34706ee85f6aa2d` | 待Git LFS/Release上传 |
| 星骸拾荒者_技能与装备效果HOPA正式包_V2.0.zip | 30540605 | `882e933ca90917c37a6cd3c88d5988a2ce0ce8c6dbaf1d86e5f29102290ee5e1` | 待Git LFS/Release上传 |
| 星骸拾荒者_机制可视化HOPA正式包_V2.0.zip | 39204379 | `de7367d1ec06f97d3b8cca3c671ca9680f522f714929997d4a60fd9af1678b2f` | 待Git LFS/Release上传 |
| 星骸拾荒者_危险视觉HOPA正式包_V2.0.zip | 61745430 | `981d9069efbc7627d4d64dbabd5795acb85f2a4098d9061ba7717d924669181b` | 待Git LFS/Release上传 |
| 星骸拾荒者_界面美术HOPA正式包_V2.0.zip | 49547246 | `827d4262dcf68acf50abdbe77a63192c78cc7b44bf588b389bcbdc612e1d537a` | 待Git LFS/Release上传 |
| 星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0.zip | 2901474 | `85a20020d471e6dc77454b90e9d7792216db2555aef4e44fa729862ae9ddc043` | 内容已提取到Codex基线包，原包待归档 |
| 星骸拾荒者_G02-G13全章节HOPA实施脚本_V2.0.zip | 762114 | `f8b9d6f628cac99e5ba799d9cac2f630c45650cf0489dad548de31f569e7eb35` | 内容已提取到Codex基线包，原包待归档 |
| 星骸拾荒者_G02-G13_Unity数据级制作脚本完整包_V2.1.zip | 1112954 | `4db2cbb67e688aa7b55b5fe509f38377577e25a2259df3011c105f7c52c59708` | 内容已转换为引擎无关脚本基线，原包待归档 |

## 已入仓的小型基线包

`source_packages/星骸拾荒者_Codex脚本与架构基线包_V1.0.zip`

该包用于Codex当前基线导入，包含G01—G13脚本Markdown、G01完整JSON/CSV、整合说明、G02边界、HOPA架构来源及SHA-256清单。

## 使用原则

1. SHA-256不一致的同名文件视为不同版本，必须停止导入并报告。
2. 设计板是生产事实源，不等于运行时透明资产。
3. 原包未上传前，Codex可以完成文本、数据、索引和冲突审计，但不得开始角色/场景美术生产。
4. 大文件上传完成后，必须把Release/LFS地址和提交SHA补写到本表。
