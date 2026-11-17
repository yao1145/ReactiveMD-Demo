# 本地扩展包

**中文** · [English](README.md)

本目录是站点的组件运行时。`vite.config.ts` 中的 `reactiveMd()` 会扫描每个子目录，因此 `npm run dev`、`npm run preview`、`npm run build` 和离线导出都直接运行这里的文件。在此编辑，站点正常构建即可发布结果。

从 `vendor/` 安装的游戏包是兼容性测试夹具，站点从不导入它们。版本、哈希和覆盖范围见 [vendor/README-ch.md](../vendor/README-ch.md)。

| 目录 | 标签 | 文件 |
| --- | --- | --- |
| `tetris/` | `<tetris>` | `index.ts` 默认包导出与 notices，`manifests.ts` 声明属性，`components.tsx` React 视图，`tetris-engine.ts` 棋盘规则，`component.css`，`NOTICES.md` |
| `game-2048/` | `<game-2048>` | `index.ts` 默认包导出与 notices，`manifest.ts` 声明属性，`components.tsx` React 视图，`game-engine.ts` 方块规则，`component.css`，`NOTICES.md` |

扫描会内联本地 `@import` 与 `url()` 资源，将 `component.css` 收集为 `directory-plugin/<名称>.css`，并把每个 manifest 注册到编译器、编辑器目录和离线 bundle。[extensions.ts](../extensions.ts) 提供 Games 示例元数据和供测试使用的 host 导出；注册来自本目录，不来自该文件。

## 添加组件

1. 新建 `plugin/<名称>/index.ts`。默认导出 `defineReactComponentPackage` 创建的包；目录包含第三方材料时同时导出 `notices`。
2. 用 `reactive-md/sdk` 的 `defineLocalComponent` 声明属性，参照 `manifests.ts` 或 `manifest.ts`。
3. 使用 `reactive-md/react` 实现 React 视图，样式放入 `component.css`。
4. 启动 `npm run dev`。扫描会发现该目录，编辑器插入菜单会读取 manifest 的 `authoring` 块，无需额外注册。
5. 编写使用该标签的示例并运行 `npm test`。

能力声明决定组件的渲染位置：`interactive`、`static`、`ssr` 和 `offline`。缺少 `offline` 的包会在导出时产生诊断，而不会悄悄生成残缺的 bundle。`tests/local-game-directories.test.ts` 覆盖本目录路径，包括样式收集与静态 SSR。安装包路径由 `tests/installed-tetris.test.ts`、`tests/extension-host.test.tsx` 和 `tests/directory-discovery.test.ts` 覆盖。

要在其他项目中复用组件，把整个目录复制到该项目的 `plugin/<名称>/`。副本需要与本目录共存时，修改 manifest 的 `id`。
