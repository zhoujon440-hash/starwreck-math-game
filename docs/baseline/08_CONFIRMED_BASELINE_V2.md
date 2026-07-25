# 已确认基线 V2：源包导入事实

状态：Issue #6 导入事实源。本文记录“确认版本”和“当前实际可读取源包”的差异，
不把版本确认误写成文件已到位。

## 已校验并入库

| 范围 | 版本 | 结果 |
|---|---|---|
| 产品、教育、计划、门禁 | Issue #6指定版本 | 7份DOCX全文入库 |
| G02阶段计划与五册脚本 | G-S1与G-SCR指定版本 | 7份DOCX全文入库 |
| 人物 | V2.1补齐版 | 原包入LFS，71人物目录已建立 |
| 场景 | V1.0 | 原包入LFS，91项原始清单已提取 |
| 道具 | V3.0 | 原包入LFS，PROP-001—046原始清单已提取 |
| 机制 | V2.0 | 原包入LFS，MECH-001—047原始清单已提取 |
| UI | V2.0 | 原包入LFS，UI-001—083原始清单已提取 |
| G02—G13 HOPA | V2.0 | 12章DOCX全文入库，文本节点捕获率100% |
| G02/G03结构化母本 | V2.1独立包 | JSON/CSV逐字节提取 |
| HOPA架构与FX-001 | V1.0 | 2份全文与4张设计/生产母版已提取 |

## 已确认但源文件缺失

精确文件名、预期SHA、大小和影响见
`source_packages/manifests/missing-sources.json`。目前缺失：

- G01整合正式包 V3.0；
- G02—G13数据完整包 V2.1（现仅G02、G03独立包）；
- FX V2.0、DANGER V2.0；
- G-S2-D01 V1.0、G-S2-CHG-01 V1.0、G-CHAR-01 V1.0、G-ANIM-01 V1.0；
- G02开场边界 V2.2独立原文。

缺失项不以旧版、摘要、现有代码或生成内容替代。

## 目录事实

- G02—G13 HOPA脚本全文：`docs/story/G01-G13/G02.md`—`G13.md`；
- G01缺口：`docs/story/G01-G13/G01.md`；
- G01—G13数据状态：`data/source/index.json`；
- 71人物：`data/source/catalogs/characters-71.json`；
- 488资产：`data/source/catalogs/asset-catalog-488.json`；
- 原包、SHA与提取映射：`source_packages/manifests/`；
- 历史资料：`archive/legacy/`。

## 488资产口径

人物71＋场景91＋道具46＋FX41＋机制47＋危险76＋UI83＋G01新增33＝488。

FX V2和DANGER V2缺包时，索引只引用确认主清单。DANGER的76项由主清单明确的
32个基础设计加4种共享原型×11星球皮肤展开；G01的33项只建库存槽位，不生成
正式ID、名称或美术。所有美术索引均指向设计/生产母版，不等于运行时资产。

