# 试用版二次整改实现与验收映射

版本：`STARWRECK-TRIAL-0.3.0`

## 十一场机制矩阵

| 顺序 | 场景 | 独立机制 `mechanicType` | 搜寻与组合前置 | 人物反馈 |
| --- | --- | --- | --- | --- |
| 1 | SCN-G01-00 拾光号熄灯 | `rotating-circuit` 旋转电路 | 手灯、保险丝与配电盒 | 星宇确认船尾回波 |
| 2 | SCN-G01-01 找回七码 | `signal-memory` 信号记忆 | 四组件与核心托架 | 七码自我介绍并发布任务 |
| 3 | SCN-G01-02 船上第一张任务单 | `task-order` 任务排序 | 清单与星图钥片 | 七码确认任务依赖 |
| 4 | SCN-G01-03 漏气的货舱 | `airflow-maze` 气流迷宫 | 四件维修物与压力表 | 七码确认压力证据 |
| 5 | SCN-G01-04 星图缺口 | `star-map-snap` 拖动旋转吸附 | 三片星图与坐标标记 | 七码辨认锈环星信号 |
| 6 | SCN-G01-05 垃圾雨航线 | `garbage-route` 路线规划 | 旁路板与短时窗口 | 七码确认安全节点 |
| 7 | SCN-G01-06 锈环星求救信号 | `waveform-tuning` 波形调谐 | 四件接收器校准组件 | 七码确认求救与能力边界 |
| 8 | SCN-G01-07 坠落之前 | `attitude-balance` 姿态平衡 | 三项基础能力与落点记录 | 七码确认自动存档 |
| 9 | SCN-G02-00 垃圾雨之前 | `pattern-decode` 规律解码 | 脉冲探针与样本 | 七码确认封存来源 |
| 10 | SCN-G02-01 五尾清算 | `crane-counterweight` 吊臂配重 | 挂索、配重与资源标签 | 阿铆获救，郑要求证据结算 |
| 11 | SCN-G02-02 谁说这是无主之物 | `borrow-use-return` 借用逻辑配对 | 三组屏幕键线 | 郑与阿铆补全归还记录 |

所有机制状态写入`GameSession.mechanicProgress`，使用`initial/error/partial/complete`四态。错误操作只增加错误计数，不清空已确认步骤；第三级提示只执行一个合法步骤。

## 人物与剧情融合

- 开场只显示“受损导航设备”，不显示七码姓名或人物卡。
- SCN-G01-01按“发现损坏→找零件→组合修复→信号记忆启动→自我介绍→星宇互动→发布当前任务”推进。
- `qima_identity_revealed`写入后且当前对白链结束，七码人物卡才会出现。
- 阿铆和郑同样由`almao_identity_revealed`、`zheng_identity_revealed`控制人物卡与档案。
- 十一场的进入理由、开场事件、主目标、S0—S6步骤、反馈、结果和下一场理由统一存于`src/data/trial/sceneExperiences.ts`。

## 场景回访

- `currentSceneId`表示正在查看的场景；`mainlineSceneId`表示当前主线任务。
- `unlockedSceneIds`限制地图入口；`completedSceneIds`记录完成状态。
- “上一场景”“场景地图”“返回当前任务”调用独立回访API，不执行首次进入副作用。
- 回访与刷新均保留物品、HOS、谜题、证据、人物卡、一次性对白和主线状态；G02后续场景仍不可达。

## 浅色界面

标题菜单、任务条、地图、档案、设置、人物卡、物品卡、背包与弹窗使用白底、浅灰边框、深色文字。场景背景和运行时物件资产没有重绘或替换。

