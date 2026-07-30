# G02 旧屏幕谷垂直切片试玩

版本：`G02-SLICE-0.1.0`

公开试玩地址：<https://zhoujon440-hash.github.io/starwreck-math-game/>

本版本在 G01 Demo 的正式存档基础上，开放锈环星旧屏幕谷的前三个场景：

1. `SCN-G02-00《垃圾雨之前》`：在断卫星轴掩体后完成封存脉冲扫描。
2. `SCN-G02-01《五尾清算》`：使用磁力挂索救下阿铆，扫描并分析三类资源标签。
3. `SCN-G02-02《谁说这是无主之物》`：完成电视墙找物、三屏修复和借用档案恢复。

流程从 G01 的旧屏幕谷外缘交接进入，完成后停在
`SCN-G02-03A/B/C/D` 之前的只读能源搜索边界。该边界没有热点、找物、背包发放、
谜题或后续剧情。

## 操作

- 点击高清场景里的真实设施和物件推进调查。
- 找物目标拾取后会从近景图层消失并进入背包。
- 桌面端把背包物品拖到正确机关；触屏或鼠标也可先选道具再点目标。
- 错误使用不会消耗关键物，也不会改变正确进度。
- 危险操作进入最近安全节点；刷新仍停在安全节点，继续后恢复失败前进度。
- 三级提示依次提供方向、区域，并在第三级代为完成一个合法步骤。

## 存档与变量

本切片沿用 schema v2 本地存档，保留 G01 任务、证据、对白历史、角色档案和能力授权。
本阶段只允许完成四个正式变量：

- `g02_intro_scan_done`
- `g02_almao_rescued`
- `g02_resource_labels`
- `g02_archive_restored`

始终保持 `world_star_core_count=0`。磁力手套、豆包借电、五塔供能、管理员权限解除、
十二秒回路、G02星核、G02完成和G03均未开放。

## 本地验证

```bash
npm ci
npm run validate:g02-slice-01
npm run test:g02-slice-01
npm test
npm run build
npm run test:e2e
npm run test:pwa
npm run package:g02-slice-01
```

生产包输出为 `release/starwreck-g02-slice-0.1.0.zip`，解压后可部署到项目 Pages 根路径。
首次联网完整加载并由 Service Worker 接管后，可离线刷新继续。
