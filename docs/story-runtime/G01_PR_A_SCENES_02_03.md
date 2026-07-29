# G01 PR-A：SCN-G01-02 / SCN-G01-03 运行时实现

## 范围

本 PR 只实现：

- `SCN-G01-02`《船上第一张任务单》
- `SCN-G01-03`《漏气的货舱》

`SCN-G01-04` 仅保留下一场景边界。PR-A 不写入
`g01_chapter_complete=true` 或 `g01_handoff_to_g02=true`，并在保存、迁移和
每次状态提交时把 `world_star_core_count` 固定为 `0`。

唯一阶段授权为 Issue #9 评论
[`5114041966`](https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5114041966)；
编码前计划为评论
[`5114127141`](https://github.com/zhoujon440-hash/starwreck-math-game/issues/9#issuecomment-5114127141)。

## 正式来源与适配边界

正式剧情入口为 `docs/story/G01-G13/G01.md`。运行时逐项查询：

- `data/source/g01/json/G01_MasterData.json`
- `场景流程.json`
- `热点清单.json`
- `找物清单.json`
- `背包道具流转.json`
- `对话脚本.json`
- `场景状态机.json`
- `三级提示.json`
- `存档与恢复.json`
- `程序变量.json`
- `资产映射.json`

机器可查的适配与缺口说明在
`data/source/g01/pr-a/runtime-adapter.json`。其中：

- SCN-G01-02 正式数据没有 HOS 行，因此实现为基于正式热点和关键物名称的
  场景内线索搜寻，不伪造正式 HOS 编号。
- SCN-G01-02 正式数据没有三级提示行，因此提示只登记为
  `runtime_adapter_for_formal_gap`，不回写正式源。
- SCN-G01-03 的“复压钥”是 `HOS-G01-003` 正式目标名称，但没有独立正式道具
  编号，因此使用 `RUNTIME-ITM-G01-REPRESS-KEY` 且 `official_id=null`。

## SCN-G01-02 完整操作

1. 在中控任务台调查任务屏，触发 `DLG-G01-0007`。
2. 在完整场景里观察并拾取维修清单和星图钥片；物件独立消失并进入背包。
3. 打开船内地图局部近景，确认已探索与未探索舱段。
4. 打开任务屏近景，按“测量货舱压力 → 封堵外壳裂口 → 启动货舱复压”
   完成依赖排序。
5. 将维修清单错误拖到地图台，验证道具不消耗、状态不改变。
6. 将星图钥片拖到地图台，解锁货舱路径。
7. 将维修清单拖到归档槽，写入首条任务链并触发 `DLG-G01-0008`。
8. 进入 SCN-G01-03；不会打开 SCN-G01-04。

场景按 S0—S6 保存。`AUTO-G01-003` 的运行时映射包含已找到线索、背包、
地图/任务日志状态、依赖谜题、热点记录、对白历史及当前场景。

## SCN-G01-03 完整操作

1. 从安全舱门进入，调查裂口并触发 `DLG-G01-0009`。
2. 在 90 秒氧压安全窗中打开应急工具箱近景。
3. 在 `HOS-G01-003` 中找到密封胶带、金属补片、压力表和复压钥；普通胶带、
   破压力表及环境杂物保留。
4. 把密封胶带错误拖到压力表接口，验证不消耗、不改变进度。
5. 把压力表拖到接口；正式规则要求“不消耗”，所以压力表保留在背包。
6. 在压力表近景依次隔离外舱读数、读取压差、锁定安全时间窗，并保存测压证据。
7. 把胶带错误拖到补片槽，验证不消耗。
8. 安装金属补片。
9. 在修补完成前触发氧压临界或等待安全窗归零，执行危险软失败。
10. 在安全门确认关键物、HOS 消失状态、测压证据、压力表校准及已安装补片均保留。
11. 刷新浏览器，确认仍处于同一安全恢复节点且不重复发放物品。
12. 从保留进度重新进入，覆盖密封胶带。
13. 将复压钥拖到右侧阀门，恢复压力并触发 `DLG-G01-0011`。
14. 到达 S6 完成态；只展示后续舱段边界。

危险回退不加载旧的整场 checkpoint。它只设置
`g01_scn03_safe_recovery_active=true` 并保存当前会话，因此已经确认的正确步骤
不会回滚。恢复时重启 90 秒安全窗，继续当前 S 状态。

## 运行时美术

正式目录目标：

- `SCENE-G01-003` 中控任务台与船内地图
- `SCENE-G01-004` 货舱裂口（漏气/复压）
- `PROP-G01-006` 金属补片
- `PROP-G01-007` 密封胶带
- `PROP-G01-008` 压力表
- `DANGER-G01-002` 货舱氧压下降
- `FX-G01-003` 货舱复压

设计源没有可直接用于浏览器的 16:9 背景和全部独立透明层。根据阶段授权，
新增资产全部标为 `project_owner_authorized_runtime_production`。生产源保存在
`art/runtime-production/g01/pr-a/source/`，确定性构建脚本为
`scripts/build_g01_pr_a_runtime_art.py`。

来源、生产方式、禁止来源声明和所有 runtime SHA-256：

- `docs/art/G01_PR_A_RUNTIME_ASSET_PROVENANCE.json`
- `docs/art/G01_PR_A_RUNTIME_ASSET_SHA256.txt`
- `data/source/g01/pr-a/scn-g01-02-art-manifest.json`
- `data/source/g01/pr-a/scn-g01-03-art-manifest.json`

没有使用 PR #5 美术、第三方网络素材、纯色 SVG、CSS 场景几何、Emoji、网页
图标或设计总览板直接放大，也没有修改星宇或七码设计。

## 校验和测试

- `npm run build:g01-pr-a-art`
- `npm run validate:g01-pr-a`
- `npm run test:g01-pr-a`
- 全部来源、基线、人物、剧情、Vitest、Build 和 Playwright 门禁

PR-A 校验覆盖来源/SHA、37 个运行时文件、6 个关键物、4 组三级提示、危险
恢复字段、正式编号/内部编号边界、禁止范围及 8 个负向破坏用例。Playwright
在 1366×768 和 1920×1080 各运行完整两场流程并检查浏览器控制台错误。

## 尚存风险

- 新运行时美术属于项目负责人授权生产，仍需在 PR 视觉 artifact 中最终验收。
- SCN-G01-02 的 HOS 和提示正式源缺口只能由运行时适配层承接；未来若正式包补齐，
  应以新正式数据替换适配项，而不是修改现有正式源。
- 复压钥尚无正式道具编号；在正式编号发布前必须继续保持
  `official_id=null`。
- 氧压倒计时采用本地设备时间；系统时间发生大幅跳变会立即触发或延后软失败，
  但不会破坏已保存的关键物、证据和正确进度。
