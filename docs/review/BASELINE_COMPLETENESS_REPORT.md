# P0-B 基线完整性报告

核对日期：2026-07-28。

## 门禁覆盖

| 范围 | 当前结果 |
| --- | --- |
| 汇总规则 | 634 条，正式基线全部通过 |
| 正式源 | 19 项；机器清单与 SHA 清单严格同集合、同路径、同 SHA；`missing_required=[]`、`missing_count=0` |
| 提取物 | 351 项；每项原包、ZIP/DOCX 内部条目、内部条目 SHA、输出路径及输出 SHA 均按实际字节复核 |
| 替代关系 | 状态白名单、当前正式源/确认规则、历史定位和被替代资料执行层隔离均受检 |
| 人物与资产 | 71 人、488 资产、五类正式编号连续性、内部/官方 ID、母版/运行时成熟度、八域真实来源及 488/488 唯一正式行语义均受检 |
| 章节边界 | G01 为序章、星核为 0；G02 V2.2 有效开场；G02—G13 各自唯一 `+1` 星核状态变化和最终 12 颗累计受检 |
| HOPA Schema | 10 个模块 Schema + 1 个 MasterData Schema；提示等级只允许正式 1/2/3 等价枚举 |
| 三级提示 | 77 个“场景 ID＋机关/任务”组逐组要求方向、区域、完成一步恰好三级且顺序固定 |
| 关键道具 | 160 个正式关键物/不可错误消耗物逐个要求错误热点或反馈、保留背包、不改正确进度和不消耗 |
| 危险恢复 | 76 个正式 DANGER 项逐个要求安全恢复节点、保留关键物/证据/正确步骤/机关进度且允许重试 |
| 技术与旧名 | 扫描 `src`、`public`、`config`、`schemas`、当前执行文档、普通测试、包与运行时配置；按路径和语义放行明确禁止语句，排除正式源全文、legacy、冲突/替代记录和负向 fixture |
| 负向测试 | 46 个破坏 fixture；Node 基线测试共 52 项通过；每个破坏均以非零退出码和明确规则 ID、资产、字段、实际值、期望值及来源失败 |

## 本轮新增严格规则

- `SOURCE-SHA-LIST-FORMAT-UNIQUE`
- `SOURCE-SHA-LIST-EXACT-MATCH`
- `SOURCE-EXTRACTED-ENTRY-BYTE-INTEGRITY`
- `SOURCE-SUBSTITUTION-REFERENTIAL-INTEGRITY`
- `SOURCE-SUPERSEDED-ISOLATED`
- `CAT-ASSET-MULTI-SOURCE-PROVENANCE`
- `CAT-ASSET-SOURCE-DIVERSITY`
- `CAT-ASSET-DERIVED-CATALOG-PROVENANCE`
- `CAT-ASSET-FORMAL-ROW-CONTENT`
- `CAT-ASSET-FORMAL-ROW-UNIQUE`
- `HOPA-HINT-EXACT-THREE-ORDERED`
- `HOPA-CRITICAL-ITEM-WRONG-USE-CONTRACT`
- `HOPA-DANGER-SOFT-FAILURE-RECOVERY`
- `STORY-STAR-CORE-CONTRACT-COVERAGE`
- `STORY-STAR-CORE-STATE-TRANSITION`
- `STORY-STAR-CORE-TWELVE-CUMULATIVE`
- 扩大后的 `TECH-FORBIDDEN-CURRENT-EXECUTION`

冻结文档中的明确规则已恢复：`AGENTS.md`、`docs/baseline/00_SOURCE_OF_TRUTH.md`、`01_VERSION_PRIORITY.md`、`03_GLOBAL_FROZEN_RULES.md`、`07_CODEX_PREDEVELOPMENT_GATE.md`、`docs/baseline/characters/CHAR-001_XINGYU.md` 和 `tasks/TASK-001_G01正式HOPA重构.md` 均保留原有明确禁用措辞；扫描器不再通过改写规则文本规避匹配。

## 488 资产八域来源

| 域 | 数量 | 正式来源 |
| --- | ---: | --- |
| character | 71 | `PKG-CHARACTERS-V2.1` |
| scene | 91 | `PKG-SCENES-V1.0` |
| prop | 46 | `PKG-PROPS-V3.0` |
| mechanism | 47 | `PKG-MECH-V2.0` |
| ui | 83 | `PKG-UI-V2.0` |
| fx | 41 | `PKG-FX-V2.0` |
| danger | 76 | `PKG-DANGER-V2.0` |
| g01_addition | 33 | `PKG-G01-V3.0` |

`asset-catalog-488.csv`、`asset-catalog-488.json` 和 `master-workbook-counts.json` 均登记为八源派生目录；每个输入引用真实 ZIP 内条目和条目 SHA，且每个资产保留域级来源，不再共享人物 XLSX 来源。

三个派生目录同时登记 `field_authority_map`、`generated_by`、`mapping_version=formal-row-authority-v1` 和 `registry_reference_role=cross_check_only`。校验器会打开八个正式包中的 CSV/XLSX，以 `formal_row_id` 定位唯一行并比较显式映射字段。当前结果为 488/488 唯一定位、0 项内容偏差；旧登记表与正式清单的 267 条差异完整保存在 `ASSET_REGISTRY_VS_FORMAL_CATALOG_DIFF.md`。

DANGER 逐行门禁只比较 V2.0 正式 CSV 实际存在的八个语义列，不用默认值补造该表不存在的风险预兆或恢复列；76 项安全恢复、证据/关键物/正确步骤保留和重试能力仍由独立 HOPA 契约门禁覆盖。

## 负向测试清单

| 编号 | 破坏 |
| --- | --- |
| NEG-01—03 | 删除 PROP、重复 FX、伪造七码官方 ID |
| NEG-04—07 | 当前角色旧名、G01 星核、G01→G02 交接、G02 重复序章 |
| NEG-08—11 | 非法 S7、单个关键物错误消耗、清空安全节点、母版伪装运行时资产 |
| NEG-12—14 | 当前 Unity、普通执行代码 Boss 实现、正式源 SHA 被改 |
| NEG-15—18 | 当前 Markdown 旧名、Schema 当前 Unity、普通测试 Boss 实现、配置当前 Unity |
| NEG-19—21 | 三级提示缺第二级、重复第一级、顺序错误 |
| NEG-22—24 | 危险恢复不保留关键物、不保留证据、不保留已完成正确步骤 |
| NEG-25—27 | 删除一章星核变化、改错一章变化值、重复计算一颗星核 |
| NEG-28—32 | 场景错接人物包、FX 错接人物 XLSX、G01 危险项错接全局 DANGER 包、全部来源 SHA 相同、删除单项来源条目 |
| NEG-33—34 | 当前任务要求战斗实现、V2.1 声称可直接导入当前引擎 |
| NEG-35—42 | SCN/PROP/MECH/UI/FX 的名称、状态或范围被改错，以及旧登记表字段污染正式字段 |
| NEG-43—46 | 正式行重复、目录缺少正式项、目录多出未知 ID、来源路径正确但名称不匹配 |

负向 fixture 只修改加载后的内存快照；测试不会写回正式基线文件。测试前后由 Git 工作区状态复核。

## 全量命令

```text
npm run validate:sources
npm run validate:baseline
npm run test:baseline
npm test
npm run build
npm run test:e2e
```

独立 `.github/workflows/baseline-gate.yml` 与常规 CI、Source Import Integrity 共同构成合并门禁。
