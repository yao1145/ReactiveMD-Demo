# Vendor 包

**中文** · [English](README.md)

Demo 通过 tarball 安装的依赖都放在本目录。引擎和编辑器快照服务于所有构建；游戏与主题包是兼容性测试夹具，只有测试会加载。

| Tarball | 角色 | 加载方 |
| --- | --- | --- |
| `reactive-md-<版本>-<哈希>.tgz` | 锁定的引擎包 | `npm run dev`、`npm run build`、`npm test` |
| `reactive-md-editor-<版本>-<哈希>.tgz` | 锁定的编辑器包 | `npm run dev`、`npm run build`、`npm test` |
| `reactive-md-tetris-package-<版本>-<哈希>.tgz` | 兼容性夹具 | `tests/installed-tetris.test.ts`、`tests/extension-host.test.tsx`、`tests/directory-discovery.test.ts` |
| `reactive-md-game-2048-package-<版本>-<哈希>.tgz` | 兼容性夹具 | `tests/directory-discovery.test.ts` |
| `reactive-md-sci-fi-theme-<版本>-<哈希>.tgz` | 兼容性夹具 | `tests/directory-discovery.test.ts` |

站点渲染的是 [plugin/](../plugin/README-ch.md) 与 [theme/](../theme/README-ch.md) 中的本地扩展源码，产品路径不导入这三个夹具 tarball。`tests/local-game-directories.test.ts` 和 `tests/local-theme-directory.test.ts` 验证本地目录无需它们即可提供组件和主题。

## 清单

| 文件 | 包 | 版本 |
| --- | --- | --- |
| `reactive-md-0.9.0-3a33c4e81f05.tgz` | `reactive-md` | `0.9.0` |
| `reactive-md-editor-0.2.0-7cc2ae5e80f4.tgz` | `reactive-md-editor` | `0.2.0` |
| `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |
| `reactive-md-tetris-package-0.1.0-fc1fa620038f.tgz` | `reactive-md-tetris-package` | `0.1.0` |
| `reactive-md-game-2048-package-0.1.0-ce931218c317.tgz` | `reactive-md-game-2048-package` | `0.1.0` |

文件名包含 SHA256 前缀；`package-lock.json` 记录完整的 npm integrity 值。在 `package.json` 中使用确切的 vendor 文件名，包内容变化时同步更新 lockfile。旧构建归档在本地 `archive/`，该目录被 `.gitignore` 忽略，不会提交，也不会上传。

## 安装夹具的测试覆盖

- `tests/installed-tetris.test.ts` 从 `node_modules` 解析 `reactive-md-tetris-package/react`，检查已构建入口、类型声明、许可证、notices 与 CSS，同时检查 `^0.8.0-next.0` peer 范围、不含 `src/`，以及 lockfile integrity 与 tarball 字节一致。
- `tests/extension-host.test.tsx` 将已安装的 Tetris 包组合进 React host，并渲染静态 SSR 标记。
- `tests/directory-discovery.test.ts` 从临时 `plugin/` 目录再导出已安装的 Tetris 与 2048 入口，用已安装主题 CSS 构建主题，然后检查虚拟 host、离线 bundle，以及消费者无需注册模块。

游戏包声明 `reactive-md` peer 范围 `^0.8.0-next.0` 和 React peer 范围 `^19.0.0`。安装使用 `npm ci --legacy-peer-deps`；在没有 lockfile 的检出中使用 `npm install --legacy-peer-deps`。

## 更新 tarball

在包所属仓库中构建，使用带版本号和内容哈希的文件名复制到这里，更新 `package.json` 中的 `file:` 路径并重新生成 lockfile。当前的引擎与编辑器更新流程见 [docs/candidate-package-updates-ch.md](../docs/candidate-package-updates-ch.md)。

引擎 tarball 是包含流式编译和独立作者能力的 0.9.0 候选包。SHA256 为 `3a33c4e81f05c20e8f792189741d53c1d96a74accbb6e67e3c39110a4d127731`。

Editor 0.2.0 候选包的分析 Worker 使用同一份引擎。SHA256 为 `7cc2ae5e80f4ab54c5ca41b2996467697654369af6305f9cd697f166429569ab`。

主题夹具由提交 `351b341` 构建，SHA256 为 `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`。
