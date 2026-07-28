# 星宇与七码运行时资产验收记录

状态：等待项目负责人视觉验收。

## 自动检查

- 星宇固定文件 5/5；
- 七码固定文件 9/9；
- 14 个主文件均为 2048×2048 RGBA PNG；
- 每个文件均同时包含透明与非透明像素；
- 状态哈希不重复；
- 正式来源包、包内路径和 SHA-256 可验证；
- 设计板继续标记为 `runtime_asset=false`；
- 仅本轮 14 个透明输出标记为 `runtime_asset=true`；
- EDU-0077、角色数量、状态数量与目录边界受自动门禁保护。

## 视觉材料

- [星宇 5 状态](character-assets/xingyu_5_states.png)
- [七码 9 状态](character-assets/qima_9_states.png)
- [星宇母版对照](character-assets/xingyu_master_comparison.png)
- [七码母版对照](character-assets/qima_master_comparison.png)
- [深色边缘检查](character-assets/transparent_edge_dark.png)
- [浅色边缘检查](character-assets/transparent_edge_light.png)
- [1366×768 双角色预览](character-assets/character_preview_1366x768.png)
- [1920×1080 双角色预览](character-assets/character_preview_1920x1080.png)

双分辨率页面截图由 Playwright 生成并提交到同目录，同时由 CI 上传 artifact。截图明确标注“非最终剧情UI”；本验收页不接入正式剧情、对白或场景。

## 人工验收关注点

1. 星宇五状态身份、服装、比例、材料和装备一致；
2. 七码九状态机身、天线、机械臂、轮足与配色一致；
3. 深浅背景无白底、棋盘格、标题、网格或水印；
4. 50%、75%、100%、150% 缩放仍能辨认关键特征；
5. 1366×768 与 1920×1080 预览不裁断主体；
6. 状态差异来自局部表情/屏幕/姿态，不依赖文字标签伪装。
