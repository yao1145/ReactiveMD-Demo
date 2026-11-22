# Reactive MD Demo

**中文** · [English](README.md)

Reactive MD 的 Playground 提供编辑器、实时预览、文档库、HTML 和 PDF 导出及双语示例。站点组件和主题位于 `plugin/` 和 `theme/`。构建使用 `vendor/` 中锁定的引擎和编辑器 tarball。

在线站点：[yaozi.raricy.com](https://yaozi.raricy.com/)。

## 添加主题或组件

Vite 启用 `reactiveMd()`。主题放入 `theme/<名称>/theme.css`；组件在 `plugin/<名称>/index.ts` 默认导出组件包。`component.css` 与本地 CSS 资源自动收集，站点直接运行这些目录。各目录的文件清单与添加步骤见 [plugin/README-ch.md](plugin/README-ch.md) 与 [theme/README-ch.md](theme/README-ch.md)。从组件定义到预览、SSR 与导出的完整路径见[扩展编写指南](docs/extension-authoring-ch.md)。`extensions.ts` 保留示例元数据与供测试使用的兼容 host 导出。

独立消费者测试 `tests/directory-discovery.test.ts` 验证编译与编辑器数据、SSR 及离线资源。

## 环境要求

- Node.js 22.12 或更高版本。CI 使用 Node 24。
- npm。

## 安装与运行

```sh
npm ci --legacy-peer-deps
npm run dev
```

打开 `http://127.0.0.1:5173`。

打开 `/?example=minimal-budget` 试用工作坊预算示例。在「开发者工具」中切换默认与精简组件，在「导出」对话框中选择 PDF。PDF 使用所选起始值。本地服务安装 Chromium 后可直接下载 PDF，安装命令为 `npx playwright install chromium`。静态站点打开浏览器打印窗口，可在其中另存为 PDF。

`npm ci` 需要 `package-lock.json`。在没有 lockfile 的全新检出中，先运行一次 `npm install --legacy-peer-deps`，然后提交结果。

引擎和编辑器以 `vendor/` 下的 tarball 形式提供（`reactive-md` 0.9.1、`reactive-md-editor` 0.2.0）。参阅[包清单与哈希](vendor/README-ch.md)和[候选包更新流程](docs/candidate-package-updates-ch.md)。

科幻主题从 `theme/sci-fi/theme.css` 自动发现，因此声明 `<theme name="sci-fi">` 的文档可以在预览、编辑器与离线导出中正常渲染。

俄罗斯方块与 2048 运行 `plugin/tetris/`、`plugin/game-2048/` 下的本地源码。仓库内提交的游戏与主题 tarball 是安装包测试使用的兼容性夹具。

## 运行时与测试夹具

| 路径 | 角色 | 加载方 |
| --- | --- | --- |
| `plugin/`、`theme/` | 产品运行时扩展源码 | `npm run dev`、`npm run build`、预览与导出 |
| `vendor/reactive-md-<版本>-<哈希>.tgz`、`vendor/reactive-md-editor-<版本>-<哈希>.tgz` | 锁定的引擎和编辑器包 | 所有构建、测试与预览 |
| `vendor/reactive-md-tetris-package-*.tgz`、`vendor/reactive-md-game-2048-package-*.tgz`、`vendor/reactive-md-sci-fi-theme-*.tgz` | 兼容性测试夹具 | `tests/installed-tetris.test.ts`、`tests/extension-host.test.tsx`、`tests/directory-discovery.test.ts` |

站点渲染的游戏与主题来自 `plugin/` 与 `theme/` 中的目录。安装的游戏与主题 tarball 用于验证 npm 消费者能发现并编译这些包，站点不导入它们。

## 脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 在 `127.0.0.1:5173` 上运行 Vite 开发服务器 |
| `npm run build` | 类型检查并将静态站点构建到 `dist/` |
| `npm run preview` | 提供生产构建的预览服务 |
| `npm test` | Vitest 单元与集成测试 |
| `npm run test:watch` | Vitest 监听模式 |
| `npm run test:browser:smoke` | 一次 Chromium 桌面端和移动端冒烟测试 |
| `npm run test:browser` | 先运行编辑器滚动检查，再运行导出检查（`test:editor` + `test:export`） |
| `npm run test:editor` | 编辑器滚动、视图和源码导航检查 |
| `npm run test:toolbar` | 工具栏与组件插入检查 |
| `npm run test:toolbar:compact` | 紧凑工具栏检查 |
| `npm run test:interactions` | 编辑器选区和交互检查 |
| `npm run test:export` | HTML 和图片导出检查 |
| `npm run test:capabilities` | 通过预览与 HTML 导出验证文档级创作能力与脚本隔离（未设置 `DEMO_URL` 时自行启动 Vite 服务器） |
| `npm run test:runtime-extensions` | 站点本地 `plugin/` 扩展与离线导出 bundle |
| `npm run test:outline` | 文档大纲行为 |
| `npm run test:workbench` | 紧凑工作台布局 |
| `npm run test:preview:actions` | 全屏预览操作检查 |
| `npm run test:preview:slider` | 预览滑块命中目标检查 |

大多数浏览器脚本面向 `http://127.0.0.1:5173`；请先启动 `npm run dev`，或将 `DEMO_URL` 设为另一个正在运行的站点。`test:browser:smoke`、`test:interactions` 和 `test:runtime-extensions` 会自行启动 Vite 服务器。大多数浏览器脚本默认使用 Edge；`test:browser:smoke` 使用内置 Chromium。设置 `PLAYWRIGHT_CHANNEL` 可覆盖两者的默认值。报告和截图输出到 `artifacts/`。

```sh
npm run dev
DEMO_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=msedge npm run test:editor
```

## 内容

- `content/examples/local/` 存放 Playground 中展示的示例文章。
- `content/guides/` 存放英文和中文用户指南。
- `src/` 按功能存放应用代码：应用外壳、文档、编译、预览、导出、图片、网络、流式示例、内容、设置、开发者工具和通用界面。各目录见[源码结构](docs/source-layout-ch.md)。
- `plugin/` 存放站点运行的组件源码，`theme/` 存放主题源码。
- `extensions.ts` 保留示例元数据与供测试使用的兼容 host 导出。

示例和指南文件是通过 `?raw` 导入的普通 Markdown 源文件。就地编辑即可；导航标题和提示位于 `src/content/examples.ts`。

## 导出资源

导出的 HTML 内嵌引擎样式表、打印样式表、法律声明、包版本和独立运行时。引擎通过 `reactive-md/export-assets` 入口公开这些文件，并将每个 manifest id 映射到对应文件。`vite.export-assets.ts` 解析该入口，将每个文件暴露为构建期字符串模块。请在 `vite.config.ts` 和 `vitest.config.ts` 中都保留该插件的注册。

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

将 `demo/` 变成当前仓库的导入和路径改动，参见[扩展编写指南](docs/extension-authoring-ch.md#6-从-monorepo-迁移宿主代码)。

## 部署

站点是静态构建。`npm run build` 写入 `dist/`；`.github/workflows/site.yml` 将该目录作为 workflow artifact 上传，到此为止。生产部署由维护者手动执行带版本号的符号链接切换。

## 本地联网问卷

运行 `npm run dev`，打开[联网问卷](http://127.0.0.1:5173/?example=network-survey)。两个计票面板共享一条 SSE 连接，票数保存在当前开发服务进程内。运行 `node scripts/verify-network-survey.mjs` 可验证首次响应丢失后重试只计一票，以及最后一个面板隐藏后连接关闭。

生产站点可以预览这份示例，提交与实时计票需要本地开发服务。
