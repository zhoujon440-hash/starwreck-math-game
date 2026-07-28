# P0-B 基线完整性报告

## 门禁覆盖

| 范围 | 结果 |
| --- | --- |
| 汇总规则 | 325 条，当前基线全部通过 |
| 正式源文件 | 19 项；文件名、字节数、SHA、仓库路径、提取溯源和缺失 0 受检 |
| 人物目录 | 71 项；内部/官方 ID、星宇、七码 `EDU-0077`、设计母版与运行时状态分离受检 |
| 资产目录 | 488 项；8 个域数量、正式 ID 唯一性与 PROP/FX/MECH/DANGER/UI 连续性受检 |
| 章节 | G01—G13 剧情与结构化数据 13/13；场景引用、角色、目标、下一场景受检 |
| 边界 | G01 8 场景、完成与交接标记、星核为 0；G02 V2.2 有效开场与不重复序章受检 |
| HOPA Schema | 10 个模块 Schema + 1 个 MasterData Schema |
| HOPA 语义 | S0—S6、错误使用不消耗、安全恢复位置、三级提示和章节内引用受检 |
| 技术路线 | HTML5/PWA + Vite + TypeScript；当前运行时代码禁用路线受检 |
| 负向破坏测试 | 14/14，每项独立启动校验器并断言非零退出码、规则 ID、实际值、期望值、来源和人工处理建议 |

## Schema 清单

1. `scene-flow.schema.json`
2. `hotspots.schema.json`
3. `hidden-objects.schema.json`
4. `inventory-flow.schema.json`
5. `dialogue.schema.json`
6. `scene-state.schema.json`
7. `hints.schema.json`
8. `save-recovery.schema.json`
9. `variables.schema.json`
10. `asset-mapping.schema.json`
11. `master-data.schema.json`

Schema 对必填字段、允许字段、ID 格式和 S0—S6 枚举执行校验；跨模块引用、章节边界、星核、提示层级与道具消耗规则由语义校验器补充。

## 负向测试清单

| 编号 | 破坏 | 必须失败的规则 |
| --- | --- | --- |
| NEG-01 | 删除一个 PROP | `CAT-ASSET-PROP-CONTINUITY` |
| NEG-02 | 重复一个 FX | `CAT-ASSET-FX-CONTINUITY` |
| NEG-03 | 改错七码官方 ID | `CAT-CHAR-NO-FAKE-OFFICIAL-ID` |
| NEG-04 | 用旧名替换星宇 | `CAT-CHAR-XINGYU-IDENTITY` |
| NEG-05 | G01 世界星核改为 1 | `STORY-G01-STAR-CORE-ZERO` |
| NEG-06 | 删除 G01→G02 交接标记 | `STORY-G01-HANDOFF` |
| NEG-07 | G02 重复序章教学 | `STORY-G02-EFFECTIVE-OPENING` |
| NEG-08 | 注入非法 S7 | `HOPA-SCHEMA-SCENE-STATE` |
| NEG-09 | 错用关键物时消耗 | `HOPA-WRONG-CRITICAL-NOT-CONSUMED` |
| NEG-10 | 删除安全恢复位置 | `HOPA-SCHEMA-SAVE-RECOVERY` |
| NEG-11 | 把设计母版标成运行时资产 | `CAT-ASSET-MATURITY-SEPARATION` |
| NEG-12 | 把当前运行时改为 Unity | `TECH-RUNTIME-HTML5-PWA` |
| NEG-13 | 在当前执行代码注入 Boss 实现 | `TECH-FORBIDDEN-CURRENT-EXECUTION` |
| NEG-14 | 修改正式源 SHA | `SOURCE-MANIFEST-SHA-SIZE` |

负向样例只在内存快照中执行，不写入正式基线文件。

## 本地与 CI 命令

```text
npm run validate:sources
npm run validate:baseline
npm run test:baseline
npm test
npm run build
npm run test:e2e
```

独立工作流 `.github/workflows/baseline-gate.yml` 会拉取 Git LFS 对象并顺序执行以上全部门禁。任何步骤失败都会阻止合并。
