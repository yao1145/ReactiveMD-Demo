# Demo 扩展包

**中文** · [English](README.md)

Demo 从本目录中已提交的 npm tarball 安装 Tetris 和 2048。文件名包含 SHA256 前缀；`package-lock.json` 记录完整的 npm integrity 值。安装使用各包已构建的 JavaScript、类型声明、CSS 和法律声明，因此全新检出无需先构建示例。

同一目录还包含 Demo 所构建依赖的引擎、编辑器与参考主题快照：

| 文件 | 包 | 版本 |
| --- | --- | --- |
| `reactive-md-0.8.0-63e6e77341c5.tgz` | `reactive-md` | `0.8.0` |
| `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz` | `reactive-md-editor` | `0.1.0` |
| `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |

旧构建归档在本地 `archive/` 目录。该目录被 `.gitignore` 忽略，不会提交，也不会上传。

在各自仓库中构建新的引擎、编辑器或主题 tarball，使用带版本号的文件名复制到这里，更新 `package.json` 并重新生成 lockfile。游戏包保留各自的源码仓库；发布新游戏构建时，以同样方式替换其 tarball。

使用 `npm ci --legacy-peer-deps` 安装（在没有 lockfile 的检出中使用 `npm install --legacy-peer-deps`）。已提交的游戏 tarball 仍声明 `reactive-md` 的 peer 范围为 `^0.7.0`，而此 Demo 运行 `0.8.0` 引擎。Demo 使用的游戏运行时 API 没有变化。

候选 tarball 文件名包含 SHA256 前缀。在 package.json 中使用确切的 vendor 文件名；每当包内容变化时，更新这些路径和 lockfile integrity。

当前引擎候选为 `reactive-md-0.8.0-63e6e77341c5.tgz`，由引擎 `main` 分支提交 `f79e30b` 构建（h5/h6 标题字阶通过 `--text-h5`/`--text-h6` 实现，未定义时回退到 0.83em/0.75em）。SHA256 为 `63e6e77341c5ffab1c5fa8e603ddc824c150d2ac2f5dffd268f22aa9ec3536b8`。编辑器候选为 `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz`，由编辑器 `main` 分支提交 `8b1405f` 构建（chrome 字体 reset 收窄作用域，不再泄漏进内嵌文档控件）。SHA256 为 `54d6cdc3ebf03de552d20daa1e023c0e0717ea44a444cfe2ac772a73e9f5ebc8`。主题候选为 `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz`，由主题仓库 `master` 提交 `351b341` 构建（在 SF-01 机器文本层级之上新增 h5/h6 字阶）。SHA256 为 `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`。
