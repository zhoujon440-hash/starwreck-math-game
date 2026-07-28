# P0-B 基线完整性报告

核对日期：2026-07-28。

## 门禁覆盖

| 范围 | 当前结果 |
| --- | --- |
| 汇总规则 | 630 条，正式基线全部通过 |
| 正式源 | 19 项；机器清单与 SHA 清单严格同集合、同路径、同 SHA；`missing_required=[]`、`missing_count=0` |
| 提取物 | 351 项；每项原包、ZIP/DOCX 内部条目、内部条目 SHA、输出路径及输出 SHA 均按实际字节复核 |
| 替代关系 | 状态白名单、当前正式源/确认规则、历史定位和被替代资料执行层隔离均受检 |
| 人物与资产 | 71 人、488 资产、五类正式编号连续性、内部/官方 ID 和母版/运行时成熟度分离均受检 |
| 章节边界 | G01 为序章、星核为 0；G02 V2.2 有效开场；G02—G13 各自唯一 `+1` 星核状态变化和最终 12 颗累计受检 |
| HOPA Schema | 10 个模块 Schema + 1 个 MasterData Schema；提示等级只允许正式 1/2/3 等价枚举 |
| 三级提示 | 77 个“场景 ID＋机关/任务”组逐组要求方向、区域、完成一步恰好三级且顺序固定 |
| 关键道具 | 160 个正式关键物/不可错误消耗物逐个要求错误热点或反馈、保留背包、不改正确进度和不消耗 |
| 危险恢复 | 76 个正式 DANGER 项逐个要求安全恢复节点、保留关键物/证据/正确步骤/机关进度且允许重试 |
| 技术与旧名 | 扫描 `src`、`config`、`schemas`、当前执行文档、普通测试、包与运行时配置；排除正式源全文、legacy、冲突报告和负向 fixture |
| 负向测试 | 27 个破坏 fixture；Node 测试共 31 项通过；每个破坏均以非零退出码和明确规则 ID 失败 |

## 本轮新增严格规则

- `SOURCE-SHA-LIST-FORMAT-UNIQUE`
- `SOURCE-SHA-LIST-EXACT-MATCH`
- `SOURCE-EXTRACTED-ENTRY-BYTE-INTEGRITY`
- `SOURCE-SUBSTITUTION-REFERENTIAL-INTEGRITY`
- `SOURCE-SUPERSEDED-ISOLATED`
- `HOPA-HINT-EXACT-THREE-ORDERED`
- `HOPA-CRITICAL-ITEM-WRONG-USE-CONTRACT`
- `HOPA-DANGER-SOFT-FAILURE-RECOVERY`
- `STORY-STAR-CORE-CONTRACT-COVERAGE`
- `STORY-STAR-CORE-STATE-TRANSITION`
- `STORY-STAR-CORE-TWELVE-CUMULATIVE`
- 扩大后的 `TECH-FORBIDDEN-CURRENT-EXECUTION`

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
