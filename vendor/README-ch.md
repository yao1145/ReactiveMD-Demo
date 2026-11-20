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
| `reactive-md-0.9.0-cf7bb81291b0.tgz` | `reactive-md` | `0.9.0` |
| `reactive-md-editor-0.2.0-c489c61e1846.tgz` | `reactive-md-editor` | `0.2.0` |
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

引擎 tarball 与 [reactive-md@0.9.0](https://www.npmjs.com/package/reactive-md/v/0.9.0) 的 npm 发布包一致。SHA256 为 `cf7bb81291b02bb687d7ec241551d6a4cc12d7ab823851a8cda83578178e3152`。

Editor 0.2.0 候选包基于 [4cb9816](https://github.com/yao1145/ReactiveMD-Editor/commit/4cb98167d04b3b168b19ae7b472a94dbd97cc28a) 构建。分析 Worker 打包了 Demo 锁定的同一份正式引擎。SHA256 为 `c489c61e1846c0e9410f7a8f14d53b2c7de646b6be70d993bb15e9348ee4cdbb`。

主题夹具由提交 `351b341` 构建，SHA256 为 `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`。
