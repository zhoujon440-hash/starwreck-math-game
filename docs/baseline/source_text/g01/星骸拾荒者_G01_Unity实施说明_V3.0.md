---
source_package: PKG-G01-V3.0
source_entry: "星骸拾荒者_G01序章全量补齐与G01-G13整合正式包_V3.0/03_G01_Unity数据级脚本/星骸拾荒者_G01_Unity实施说明_V3.0.docx"
source_sha256: 321c807106b04a11df70d42b5857d185f5742921a7d5ab7e31a82a2a912139e6
source_bytes: 37700
table_count: 0
version: V3.0
purpose: "G01 V3.0正式包补充规范全文"
extraction: full_text_and_tables_from_ooxml
runtime_asset: false
---

《星骸拾荒者》G01序章
Unity实施说明 V3.0

# 一、实现范围

G01提供8个场景、32个热点、4个找物场景、14个道具、24条对话、55个场景状态、15条三级提示、8个自动存档和25个程序变量。

# 二、必须复用的通用系统

HotspotService

InventoryService

DialogueService

SceneStateService

HintService

SaveService

AbilityAuthorization

QuestFlowService

# 三、教学机制

TUT-MECH-001基础维修顺序：点击、找物、背包拖拽、组合和错误反馈。

TUT-MECH-002星图校准：找物、拼图、证据分析和目标锁定。

TUT-MECH-003垃圾雨航线：地图、安全节点、时间窗口和软失败。

# 四、能力授权

G01结束只开放七码搜寻、分析、寻路；瞬移、缩小、复制体保持false，并由AbilityAuthorization在错误尝试时返回未授权提示。

# 五、G02交接

G01结尾写入g01_handoff_to_g02与g01_chapter_complete。G02加载时先校验这两个变量，再进入SCN-G02-00修订后的旧屏幕谷外缘交接场景。

# 六、验收

首次游玩20—30分钟完成。

关键道具错误使用不消耗。

关闭游戏后可从最近自动存档恢复。

教学提示可升级，独立机制可跳过。

主角名称和存档字段仅使用星宇。

G01完成后world_star_core_count仍为0。
