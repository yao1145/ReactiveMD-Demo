# 从 monorepo 迁移

**中文** · [English](migration.md)

本仓库曾是 ReactiveMD monorepo 中的 `demo/`。现在它基于已安装的包构建，并拥有自己的内容、配置和工作流。

## 依赖

用带版本号的 tarball 替换 workspace 链接：

```json
{
  "dependencies": {
    "reactive-md": "file:vendor/reactive-md-0.8.0-next.0.tgz",
    "reactive-md-editor": "file:vendor/reactive-md-editor-0.1.0-next.0.tgz"
  }
}
```

游戏包保留其现有的 vendor tarball。使用 `--legacy-peer-deps` 安装，因为这些包仍声明 `reactive-md` 的 peer 范围为 `^0.7.0`。

## 编辑器导入

编辑器是独立包：

| 之前 | 之后 |
| --- | --- |
| `reactive-md/editor` | `reactive-md-editor` |
| `reactive-md/editor/styles.css` | `reactive-md-editor/styles.css` |
| `reactive-md/editor/codemirror` | `reactive-md-editor/codemirror` |
| `reactive-md/editor/codemirror/styles.css` | `reactive-md-editor/codemirror/styles.css` |

引擎导入保持不变：

```ts
import { compileLocal } from 'reactive-md';
import { LocalDocumentView } from 'reactive-md/react';
import { reactiveMd } from 'reactive-md/vite';
```

## 样式

两个样式表都在应用入口加载：

```ts
import 'reactive-md/styles.css';
import 'reactive-md-editor/styles.css';
```

引擎样式表覆盖文档组件。编辑器样式表覆盖 CodeMirror 框架、gutter、工具栏和视图栏。

## 内容路径

父级引用不再解析。Demo 现在拥有它所渲染的文件：

| 之前 | 之后 |
| --- | --- |
| `../../examples/local/...` | `../content/examples/local/...` |
| `../../docs/guides/local-guide-*.md` | `../content/guides/local-guide-*.md` |

`src/examples.ts` 使用 `?raw` 导入示例源码。`src/App.tsx` 导入两个指南源码。测试和浏览器脚本通过相对于 `tests/` 或 `scripts/` 的路径变量读取相同文件。

指南页脚显示 `content/guides/local-guide-en.md` 和 `content/guides/local-guide-ch.md`。

## TypeScript

`tsconfig.json` 是独立的。它不再继承 monorepo 根配置，也没有指回引擎源码的 `paths` 别名。模块解析使用已安装包的导出：

```json
{
  "moduleResolution": "Bundler",
  "types": ["vite/client", "node"]
}
```

## 导出产物

`src/export-html.ts` 以前从 `../../dist-library/` 和 `../../dist-standalone/` 导入生成的文件。这些父级路径在这里不存在。引擎现在暴露明确的公开资源导出。

`vite.export-assets.ts` 解析公开的引擎导出，并将其暴露为字符串模块：

| 虚拟模块 | 包文件 |
| --- | --- |
| `virtual:reactive-md-assets/base-css` | `reactive-md/styles.css` |
| `virtual:reactive-md-assets/print-css` | `reactive-md/print.css` |
| `virtual:reactive-md-assets/notices` | `reactive-md/notices` |
| `virtual:reactive-md-assets/package-json` | `reactive-md/package.json` |
| `virtual:reactive-md-assets/runtime` | `reactive-md/assets/standalone.js` |

插件在 `vite.config.ts` 和 `vitest.config.ts` 中均已注册。

## Vite 插件顺序

保持 `reactiveMd({ extensions: './extensions.ts' })` 和 `exportAssets()` 一起注册：

```ts
plugins: [react(), reactiveMd({ extensions: './extensions.ts' }), exportAssets()]
```

`reactiveMd` 负责宿主和 bundle 虚拟模块、依赖排除和 React 去重。`exportAssets` 只提供原始引擎产物。

## 测试与浏览器检查

Vitest 保留文章、渲染、导出、文档库和编辑器集成套件。浏览器检查按用途分组：

- `test:editor`：滚动、视图和源码导航。
- `test:toolbar`：工具栏操作。
- `test:interactions`：选区和编辑器交互探测。
- `test:export`：HTML 和图片导出。
- `test:extensions`：已安装的游戏包。
- `test:browser:smoke`：一次桌面端和移动端宽度的 Chromium 检查。

大多数浏览器脚本面向 `http://127.0.0.1:5173` 或 `DEMO_URL` 上运行的站点；`test:browser:smoke`、`test:interactions` 和 `test:extensions` 会自行启动 Vite 服务器。`PLAYWRIGHT_CHANNEL=chromium` 选择内置浏览器。

## CI 与部署

`ci.yml` 在 Node 24 上安装、测试和构建。`site.yml` 构建并将 `dist/` 作为 artifact 上传。生产部署仍是 [AGENTS-ch.md](../AGENTS-ch.md) 中描述的手动带版本号符号链接切换。
