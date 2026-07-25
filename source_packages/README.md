# Issue #6 正式源包区

本目录是正式资料的可追溯入口，不是运行时资源目录。

- `originals-or-release-links/`：经大小与 SHA-256 双重校验的原始 ZIP，使用 Git LFS 保存；
- `manifests/source-packages.json`：原包版本、用途、来源、仓库路径和校验结果；
- `manifests/extracted-files.json`：每个全文/数据提取物到 ZIP 内原始路径的逐文件映射；
- `manifests/docx-extraction-stats.json`：DOCX OOXML 文本节点与 Markdown 捕获率；
- `manifests/substitution-map.json`：正式版与历史版替代关系；
- `manifests/missing-sources.json`：未发现或无法读取的正式资料，不允许静默补造；
- `manifests/sha256sums.txt`：已入库原包校验清单。

重新导入：

```powershell
C:\path\to\bundled\python.exe scripts/import_source_baseline.py `
  --repo . `
  --downloads C:\Users\<user>\Downloads
```

导入脚本只复制、校验、全文提取和建立索引，不开发玩法、角色美术或场景。

