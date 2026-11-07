# Reactive MD Demo

**中文** · [English](README.md)

Reactive MD 的 Playground：包含编辑器、实时预览、文档库、HTML 导出和一组双语示例文章。它从仓库内提交的 tarball 中加载候选版 `reactive-md` 引擎和 `reactive-md-editor` 包，因此本仓库无需引擎源码树即可构建。

在线站点：[yaozi.raricy.com](https://yaozi.raricy.com/)。

## 环境要求

- Node.js 22.12 或更高版本。CI 使用 Node 24。
- npm。

## 安装与运行

```sh
npm ci --legacy-peer-deps
npm run dev
```

打开 `http://127.0.0.1:5173`。嵌入示例位于 `/embed.html`。

`npm ci` 需要 `package-lock.json`。在没有 lockfile 的全新检出中，先运行一次 `npm install --legacy-peer-deps`，然后提交结果。

引擎和编辑器以 `vendor/` 下的 tarball 形式提供：

- `reactive-md` 0.8.0-next.0
- `reactive-md-editor` 0.1.0-next.0
- `reactive-md-sci-fi-theme` 1.0.0

科幻主题在 `extensions.ts` 中注册，因此声明 `<theme name="sci-fi">` 的文档可以在预览、编辑器与离线导出中正常渲染。

已提交的游戏包仍声明 `reactive-md` 的 peer 范围为 `^0.7.0`，而 Demo 运行的是 0.8 预发布版。请使用 `--legacy-peer-deps` 安装。Demo 使用它们公开的 React 入口，而这些入口调用的引擎 API 没有变化。

## 脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 在 `127.0.0.1:5173` 上运行 Vite 开发服务器 |
| `npm run build` | 类型检查并将静态站点构建到 `dist/` |
| `npm run preview` | 提供生产构建的预览服务 |
| `npm test` | Vitest 单元与集成测试 |
| `npm run test:browser:smoke` | 一次 Chromium 桌面端和移动端冒烟测试 |
| `npm run test:editor` | 编辑器滚动、视图和源码导航检查 |
| `npm run test:toolbar` | 工具栏与组件插入检查 |
| `npm run test:interactions` | 编辑器选区和交互检查 |
| `npm run test:export` | HTML 和图片导出检查 |
| `npm run test:extensions` | 已安装游戏包和离线 bundle 检查 |
| `npm run test:outline` | 文档大纲行为 |
| `npm run test:workbench` | 紧凑工作台布局 |

大多数浏览器脚本面向 `http://127.0.0.1:5173`；请先启动 `npm run dev`，或将 `DEMO_URL` 设为另一个正在运行的站点。`test:browser:smoke`、`test:interactions` 和 `test:extensions` 会自行启动 Vite 服务器。脚本默认使用 Edge；设置 `PLAYWRIGHT_CHANNEL=chromium` 可使用内置浏览器。报告和截图输出到 `artifacts/`。

```sh
npm run dev
DEMO_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=msedge npm run test:editor
```

## 内容

- `content/examples/local/` 存放 Playground 中展示的示例文章。
- `content/guides/` 存放英文和中文用户指南。
- `src/` 存放应用：编辑器外壳、预览、文档库、导出对话框和扩展注册。
- `extensions.ts` 注册 Tetris 和 2048 包。

示例和指南文件是通过 `?raw` 导入的普通 Markdown 源文件。就地编辑即可；导航标题和提示位于 `src/examples.ts`。

## 导出资源

导出的 HTML 内嵌引擎样式表、打印样式表、法律声明、包版本和独立运行时。这些文件随 `reactive-md` tarball 一起发布，但不是公开的子路径导出。`vite.export-assets.ts` 解析已安装包的根目录，并将每个文件暴露为构建期字符串模块。请在 `vite.config.ts` 和 `vitest.config.ts` 中都保留该插件的注册。

## 编辑器样式

编辑器包管理自己的样式：

```ts
import 'reactive-md-editor/styles.css';
```

引擎样式表仍为：

```ts
import 'reactive-md/styles.css';
```

## 从 monorepo 迁移

将 `demo/` 变成当前仓库的导入和路径改动，参见 [docs/migration-ch.md](docs/migration-ch.md)。

## 部署

站点是静态构建。`npm run build` 写入 `dist/`；`.github/workflows/site.yml` 将该目录作为 workflow artifact 上传，到此为止。生产部署是手动、带版本号的符号链接切换，详见 [AGENTS-ch.md](AGENTS-ch.md)。
