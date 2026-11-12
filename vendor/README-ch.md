# Demo 扩展包

**中文** · [English](README.md)

Demo 从本目录中已提交的 npm tarball 安装 Tetris 和 2048。文件名包含 SHA256 前缀；`package-lock.json` 记录完整的 npm integrity 值。安装使用各包已构建的 JavaScript、类型声明、CSS 和法律声明，因此全新检出无需先构建示例。

同一目录还包含 Demo 所构建依赖的引擎、编辑器与参考主题快照：

| 文件 | 包 | 版本 |
| --- | --- | --- |
| `reactive-md-0.8.0-next.0.tgz` | `reactive-md` | `0.8.0-next.0` |
| `reactive-md-editor-0.1.0-next.0.tgz` | `reactive-md-editor` | `0.1.0-next.0` |
| `reactive-md-sci-fi-theme-1.0.0.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |

在各自仓库中构建新的引擎、编辑器或主题 tarball，使用带版本号的文件名复制到这里，更新 `package.json` 并重新生成 lockfile。游戏包保留各自的源码仓库；发布新游戏构建时，以同样方式替换其 tarball。

使用 `npm ci --legacy-peer-deps` 安装（在没有 lockfile 的检出中使用 `npm install --legacy-peer-deps`）。已提交的游戏 tarball 仍声明 `reactive-md` 的 peer 范围为 `^0.7.0`，而此 Demo 运行 `0.8.0-next.0` 引擎。Demo 使用的游戏运行时 API 没有变化。

候选 tarball 文件名包含 SHA256 前缀。在 package.json 中使用确切的 vendor 文件名；每当包内容变化时，更新这些路径和 lockfile integrity。

当前引擎候选为 `reactive-md-0.8.0-next.0-259f70cbf559.tgz`，基于引擎提交 `6e6a93f` 及本轮未提交的 UI 修订，包含函数独立缩放、正方形网格、顶层 tooltip、按钮对比度、Jump 样式统一与选项动效，并移除 Jump 按钮下划线。SHA256 为 `259f70cbf5590ef8673bfdd459d8db8882e12d65c29ae1fc5f3fe1ba743bf5ce`；安装使用已构建包，不引用同级源码。
