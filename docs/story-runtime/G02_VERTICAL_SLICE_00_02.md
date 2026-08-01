# G02垂直切片：SCN-G02-00—02运行时说明

## 边界与来源

实现基线为 `main@648ad396ea02f5d519f8ab9699c63486ba405720`。版本优先级是：

1. `G02_OPENING_BOUNDARY_V2.2`
2. G02 V2.1 MasterData、JSON和CSV
3. G02 HOPA V2.0
4. G02五册冻结脚本V1.0

V2.2已经把垃圾雨航线教学移入G01，因此G02交接只执行一次落点进入动作；
SCN-G02-00不重复航线教学。正式资料没有给磁力挂索独立物品ID，也没有补齐SCN00
的S4/S6，因此相关运行时适配使用`RUNTIME-*`，`official_id=null`并绑定正式父项。

## SCN-G02-00《垃圾雨之前》

1. 从`G02-BOUNDARY`点击外缘通道，播放DLG-G02-0001—0002。
2. 调查`HS-G02-0001`断卫星轴，进入磁性碎片风掩体。
3. 调查`HS-G02-0002`锁定封存脉冲，打开局部扫描近景。
4. 观察两组高脉冲与中间低谷，通过间隔、增益和取样窗控制完成3—2—3取样；没有文字答案按钮。
5. 只有复核成功才写入`EVD-G02-001`和`g02_intro_scan_done=true`。
6. AUTO-G02-001保存后进入旧屏幕谷外场。

`DANGER-004`在S1—S4可触发软失败，恢复节点为
`SCN-G02-00:satellite-axle-cover`。失败不会凭空生成脉冲证据。

## SCN-G02-01《五尾清算》

1. 观察吊臂和阿铆，播放DLG-G02-0003—0004；磁力挂索幂等发放一次。
2. 把挂索拖到`HS-G02-0003`并确认受力，救下阿铆。
3. 救援完成才写入`g02_almao_rescued=true`并播放DLG-G02-0005—0006。
4. 分别扫描`HS-G02-0005/0006/0007`，取得私人、公共供暖、废弃三类证据。
5. 三类真实证据齐全后，把双环磨损、三路接头和断裂边缘标签拖入对应实体资源槽；错误槽保留已正确归位的标签。
6. AUTO-G02-002保存后进入旧电视墙。

`HS-G02-0004`只记录未来磁力手套边界，不发放或授权磁力手套。
`DANGER-002`在S1/S2回到`SCN-G02-01:old-screen-valley-safe`。

## SCN-G02-02《谁说这是无主之物》

1. 调查`HS-G02-0011`打开正式HOS-G02-001近景，播放DLG-G02-0007。
2. 找到三枚电源键、两段短线和镜面屏片；目标拾取后从独立RGBA图层消失。
3. 用电源键A和短线A恢复主屏A，用电源键B和短线B恢复主屏B。
4. 根据斜向磨损用电源键C恢复主屏C。
5. 错误物品不消耗、不改变进度；镜面屏片保留给只读边界后的正式分支。
6. 读取三屏档案，播放DLG-G02-0008—0009，写入
   `EVD-G02-005`和`g02_archive_restored=true`。
7. AUTO-G02-003保存后回到旧屏幕谷安全区，显示四组待确认路线的能量信号。

`DANGER-001`在S2—S4回到`SCN-G02-02:tv-wall-safe`，保留HOS、背包、
屏幕修复步骤和已取得证据。

## 结束状态

安全区没有热点或迁移，只以世界内叙事显示四组能量信号并等待七码确认路线。结束时：

- G01完成与交接变量保持`true`；
- `g02_intro_scan_done=true`；
- `g02_almao_rescued=true`；
- `g02_resource_labels=3`；
- `g02_archive_restored=true`；
- 三项基础能力保持授权；
- 三项高级能力保持锁定；
- `g02_magnetic_glove_owned=false`；
- `g02_admin_unlocked=false`；
- `g02_chapter_complete=false`；
- `world_star_core_count=0`。

运行时资产见`data/source/g02/slice-01/runtime-art-manifest.json`，来源、生产方法与SHA
见`docs/art/G02_SLICE_01_RUNTIME_ASSET_PROVENANCE.json`和
`docs/art/G02_SLICE_01_RUNTIME_ASSET_SHA256.txt`。
