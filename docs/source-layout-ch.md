# 源码结构

**中文** · [English](source-layout-en.md)

`src/` 按功能划分目录。这次整理只调整路径：应用行为、公开 API、依赖、版本和构建产物保持不变。入口文件仍位于 `src/` 根目录。

## 入口

| 文件 | 作用 |
| --- | --- |
| `src/main.tsx` | Playground 入口，由 `index.html` 加载。引入引擎与编辑器样式、应用样式和 `app/App`。 |
| `src/reactive-md-vite.d.ts` | Vite 客户端与虚拟模块的类型声明。 |

`src/main.tsx` 是稳定的浏览器入口。`index.html` 与 `vite.config.ts` 的构建输入都按路径引用它。

## 目录

| 目录 | 文件 | 职责 |
| --- | --- | --- |
| `app/` | `App.tsx`、`styles.css`、`author.css` | Playground 外壳。组合编辑器、预览、文档库、大纲、对话框和开发者工具，保存应用状态并负责连接。样式表覆盖页面外壳、工作台布局和创作工具栏。 |
| `documents/` | `document-library.ts`、`document-library-codec.ts`、`document-tree.tsx`、`document-tree.css`、`document-outline.tsx`、`document-outline.css`、`document-outline-model.ts`、`use-draft-persistence.ts`、`workspace-storage.ts` | 个人文档库模型及其带版本号的存储编解码、文件夹与回收站处理、示例草稿持久化、侧栏文档树和标题大纲工作区。 |
| `compilation/` | `use-local-compilation.ts`、`local-compile-worker.ts`、`preview-state.ts`、`diagnostics.ts`、`diagnostic-list.tsx`、`component-state-storage.ts` | 基于 Worker 的本地编译 hook、编译 Worker 入口、临时预览会话、诊断辅助函数与列表，以及组件进度存储。 |
| `images/` | `image-assets.ts`、`image-assets-panel.tsx`、`image-copy.ts`、`use-document-images.ts`、`example-images.ts` | 图片校验与限额、IndexedDB 存储、内置示例图片、图片面板及其文案。 |
| `export/` | `export-dialog.tsx`、`export-html.ts`、`export-pdf.ts` | 导出对话框、可分享 HTML 的生成，以及 PDF 下载与浏览器打印辅助函数。 |
| `preview/` | `local-preview.tsx`、`preview-fullscreen.tsx`、`preview-fullscreen.css` | 由运行时驱动的预览界面，负责运行时会话生命周期、组件进度和诊断；以及预览全屏开关、原生 Fullscreen API 处理和视口回退覆盖层。 |
| `network/` | `survey-contract.ts`、`survey-network.ts` | 联网问卷示例的契约（端点路径、参与者请求头和载荷校验），以及仅在开发环境使用的 HTTP 提交与 SSE 结果客户端。 |
| `streaming/` | `fake-stream.ts`、`streaming-sample.tsx`、`streaming-sample.css` | 确定性的流式示例：按每秒 token 数播放、示例或宿主源码、过期结果统计，并提供实时流式预览面板。 |
| `content/` | `examples.ts`、`guide-examples.tsx`、`guide-view.tsx`、`guide-code.css` | 示例目录、指南页面与指南渲染，以及指南代码样式。Markdown 源文件仍位于顶层 `content/examples/` 和 `content/guides/`。 |
| `ui/` | `i18n.tsx`、`icons.tsx`、`use-editor-height.ts`、`use-scroll-container.ts` | 共享的中英文文案类型、图标集和布局 hook。 |
| `settings/` | `component-mode.ts`、`html-options.ts` | 组件模式的宿主选择与 HTML 能力模型。 |
| `developer/` | `developer-tools.tsx`、`developer-tools.css` | 用于运行时诊断和包信息查看的开发者工具面板。 |

## 新文件放在哪里

- 功能改动放在已拥有该行为的目录，辅助模块与其调用者放在一起。
- 被两个或更多目录使用的展示组件或 hook 放入 `ui/`。
- 文档持久化和文档库操作放入 `documents/`；编译调度、Worker 消息、诊断和组件进度存储放入 `compilation/`；图片校验与存储放入 `images/`；导出渲染与 PDF 打印放入 `export/`；示例与指南目录及指南页面放入 `content/`；能力开关与组件模式放入 `settings/`；问卷契约与网络客户端放入 `network/`；流式示例与播放节奏放入 `streaming/`。
- 只有真正的功能区域才新建顶层目录。单个文件放入最接近的现有目录。
- Markdown 内容留在 `src/` 之外；`src/content/` 只存放编排和渲染这些内容的代码。

## 跨目录导入

- 导入使用直接的相对路径：同目录用 `./name`，跨目录用 `../group/name`。源码中没有 barrel 或再导出索引。
- `app/App.tsx` 是组合入口，导入它装配的各功能目录。功能目录从 `ui/` 和 `settings/` 导入共享模块以及自己用到的具体模块。功能目录不导入 `app/`。
- 文件在目录内移动时，同时更新它自身的相对导入和所有引用它的模块。
- 引擎和编辑器代码继续通过包名导入：`reactive-md`、`reactive-md/react`、`reactive-md/export`、`reactive-md/authoring`、`reactive-md/vite` 和 `reactive-md-editor`。Demo 使用固定的 vendor tarball，不通过相对路径连接兄弟源码树。

## 样式

- 组件样式与组件同目录，并由该组件导入：`document-tree.tsx` 导入 `./document-tree.css`，`developer-tools.tsx` 导入 `./developer-tools.css`。
- 页面级样式由入口加载，因为它们作用于整个外壳和渲染出的文档：`app/styles.css`、`app/author.css` 和 `content/guide-code.css`。
- 引擎和编辑器样式继续通过包名导入：`reactive-md/styles.css` 和 `reactive-md-editor/styles.css`。

## 构建锚点

`vite.config.ts` 注册 React 插件、`reactiveMd({ includeMinimal: true })`、`exportAssets()`、`pdfExport()` 和 `surveyApi()`，并以 `index.html` 作为构建输入。`reactiveMd()` 发现 `plugin/` 中的组件包与 `theme/` 中的主题。`vite.pdf-export.ts` 提供本地 `/__reactive-md/pdf` 端点，通过 `reactive-md/pdf` 渲染供打印的 HTML。`vite.survey.ts` 提供联网问卷示例使用、仅限本机回环的 HTTP 与 SSE 端点。`vitest.config.ts` 只注册 ReactiveMD 与导出资源插件；PDF 与问卷插件仅在开发服务器中生效。仓库根目录的 `extensions.ts` 提供 Games 示例元数据和供测试使用的 host 导出。
