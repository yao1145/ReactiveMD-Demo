# 更新候选安装包

**中文** · [English](candidate-package-updates-en.md)

Demo 基于 `vendor/` 中已提交的 tarball 构建：引擎、编辑器、科幻主题和两个游戏包。旧的 `update:demo-*` 脚本属于 monorepo，本仓库没有这些命令；`package.json` 中也没有 `update:*` 条目。更新候选包的工作分两步：在所属仓库构建产物，在 Demo 检出中替换依赖。

## 步骤

1. **在所属仓库构建。** 引擎在 `ReactiveMD` 中运行 `npm run check`，它同时执行打包消费者边界检查。编辑器在 `ReactiveMD-Editor` 中运行 `npm run check`。主题和游戏包使用各自的构建脚本。
2. **打包。** 在所属仓库运行 `npm pack`，得到 `<name>-<version>.tgz`。引擎和编辑器的 `prepack` 是 `npm run build && npm run notices`，因此从干净的检出开始打包并让它完成构建。
3. **计算哈希。** `sha256sum <name>-<version>.tgz`（PowerShell：`Get-FileHash <file> -Algorithm SHA256`）。
4. **按内容前缀重命名。** 改为 `<name>-<version>-<sha256 前 12 位十六进制>.tgz`，例如 `reactive-md-0.8.0-63e6e77341c5.tgz`。前缀只标识内容，重命名不会改变哈希。
5. **移出旧文件。** 把被替换的 tarball 归档到 `vendor/archive/`（已被 Git 忽略），再把新 tarball 复制到 `vendor/`。
6. **更新依赖路径。** 指向精确的 vendor 文件名：`"reactive-md": "file:vendor/reactive-md-0.8.0-63e6e77341c5.tgz"`。`reactive-md-editor`、`reactive-md-sci-fi-theme`、`reactive-md-tetris-package` 和 `reactive-md-game-2048-package` 同样处理。
7. **重新生成锁文件。** 运行 `npm install --legacy-peer-deps`，它会在新路径旁记录 tarball 的 `sha512` integrity。不要手工修改 `integrity` 值。
8. **按锁文件安装。** 切换候选包时先删除 `node_modules`，再运行 `npm ci --legacy-peer-deps`。完整性不匹配会导致安装失败，这正是校验的目的。
9. **核对已安装的包。** 运行 `node -e "console.log(require('./node_modules/reactive-md/package.json').version)"`；引擎再加 `node -e "import('reactive-md/export-assets').then(m => console.log(m.listExportAssets().protocol))"`。两者都应报告刚打包的候选版本。
10. **运行受影响的检查。** 引擎：在引擎仓库运行 `npm run check`；安装到本仓库后运行 `npm test`、`npm run build`、`npm run test:export` 和 `npm run test:runtime-extensions`。编辑器：在编辑器仓库运行 `npm run check`，然后在本仓库运行 `npm run test:editor`、`npm run test:toolbar`、`npm run test:interactions`。主题或游戏包：`npm test`（安装包夹具）和 `npm run test:runtime-extensions`（站点运行时）。涉及全站改动时最后运行 `npm run build`。
11. **记录结果。** 在 `vendor/README.md` 与 `vendor/README-ch.md` 中更新候选包表格和末尾段落，写明版本、所属仓库 commit、构建内容和 SHA256。

## 引擎导出资源

`vite.export-assets.ts` 导入 `reactive-md/export-assets`，因此引擎候选包必须发布该子路径及其声明文件。缺少该入口的候选包会在 Vite 加载 `vite.config.ts` 和 `vitest.config.ts` 时失败。插件把虚拟模块 `virtual:reactive-md-assets/base-css`、`print-css`、`notices`、`package-json` 和 `runtime` 映射到清单 id，通过 `resolveExportAsset` 与 `readExportAsset` 读取文件，并用 `addWatchFile` 登记解析出的文件，使编辑后触发重新构建。
