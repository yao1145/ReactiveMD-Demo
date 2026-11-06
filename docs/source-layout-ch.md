# 源码结构

**中文** · [English](source-layout-en.md)

`src/` 按功能划分目录。这次整理只调整路径：应用行为、公开 API、依赖、版本和构建产物保持不变。入口文件仍位于 `src/` 根目录。

## 入口

| 文件 | 作用 |
| --- | --- |
| `src/main.tsx` | Playground 入口，由 `index.html` 加载。引入引擎与编辑器样式、应用样式和 `app/App`。 |
| `src/embed.tsx` | 嵌入页入口，由 `embed.html` 加载。渲染相互独立的内存文档实例。 |
| `src/reactive-md-vite.d.ts` | Vite 客户端与虚拟模块的类型声明。 |

这三个路径是稳定锚点。`index.html`、`embed.html`、`vite.config.ts` 的构建输入和 Vitest 配置都按路径引用它们。

## 目录

| 目录 | 文件 | 职责 |
| --- | --- | --- |
| `app/` | `App.tsx`、`styles.css`、`author.css` | Playground 外壳。组合编辑器、预览、文档库、大纲、对话框和开发者工具，保存应用状态并负责连接。样式表覆盖页面外壳、工作台布局和创作工具栏。 |
| `documents/` | `document-library.ts`、`document-tree.tsx`、`document-tree.css`、`document-outline.tsx`、`document-outline.css`、`document-outline-model.ts` | 个人文档库模型、文件夹与回收站处理、侧栏文档树和标题大纲工作区。 |
| `compilation/` | `use-local-compilation.ts`、`local-compile-worker.ts`、`preview-state.ts` | 基于 Worker 的本地编译 hook、编译 Worker 入口和临时预览会话。 |
| `images/` | `image-assets.ts`、`image-assets-panel.tsx`、`image-copy.ts`、`use-document-images.ts` | 图片校验与限额、IndexedDB 存储、图片面板及其文案。 |
| `export/` | `export-dialog.tsx`、`export-html.ts` | 导出对话框和可分享 HTML 的生成。 |
| `content/` | `examples.ts`、`guide-examples.tsx`、`guide-code.css` | 示例目录、指南渲染和指南代码样式。Markdown 源文件仍位于顶层 `content/examples/` 和 `content/guides/`。 |
| `ui/` | `i18n.tsx`、`icons.tsx`、`use-editor-height.ts`、`use-scroll-container.ts` | 共享的中英文文案类型、图标集和布局 hook。 |
| `settings/` | `html-options.ts`、`html-compatibility.tsx` | HTML 能力模型及其开关控件。 |
| `developer/` | `developer-tools.tsx`、`developer-tools.css` | 用于运行时诊断和包信息查看的开发者工具面板。 |

## 新文件放在哪里

- 功能改动放在已拥有该行为的目录，辅助模块与其调用者放在一起。
- 被两个或更多目录使用的展示组件或 hook 放入 `ui/`。
- 文档持久化和文档库操作放入 `documents/`；编译调度和 Worker 消息放入 `compilation/`；图片校验与存储放入 `images/`；导出渲染放入 `export/`；示例与指南目录放入 `content/`；能力开关放入 `settings/`。
- 只有真正的功能区域才新建顶层目录。单个文件放入最接近的现有目录。
- Markdown 内容留在 `src/` 之外；`src/content/` 只存放编排和渲染这些内容的代码。

## 跨目录导入

- 导入使用直接的相对路径：同目录用 `./name`，跨目录用 `../group/name`。源码中没有 barrel 或再导出索引。
- `app/App.tsx` 是组合入口，导入它装配的各功能目录。功能目录从 `ui/` 和 `settings/` 导入共享模块以及自己用到的具体模块。功能目录不导入 `app/`。
- 文件在目录内移动时，同时更新它自身的相对导入和所有引用它的模块。
- 引擎和编辑器代码继续通过包名导入：`reactive-md`、`reactive-md/react`、`reactive-md/export`、`reactive-md/authoring`、`reactive-md/vite` 和 `reactive-md-editor`。Demo 使用固定的 vendor tarball，不通过相对路径连接兄弟源码树。

## 样式

- 组件样式与组件同目录，并由该组件导入：`document-tree.tsx` 导入 `./document-tree.css`，`developer-tools.tsx` 导入 `./developer-tools.css`。
- 页面级样式由入口加载，因为它们作用于整个外壳和渲染出的文档：两个入口都加载 `app/styles.css` 与 `app/author.css`，`main.tsx` 另外加载 `content/guide-code.css`。
- 引擎和编辑器样式继续通过包名导入：`reactive-md/styles.css` 和 `reactive-md-editor/styles.css`。

## 构建锚点

`vite.config.ts` 注册 React 插件、`reactiveMd({ extensions: './extensions.ts' })` 和 `exportAssets()`，并以 `index.html`、`embed.html` 作为构建输入。`vitest.config.ts` 注册相同的 ReactiveMD 与导出资源插件。仓库根目录的 `extensions.ts` 注册 Tetris 和 2048 包。
