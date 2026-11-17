# 在 Demo 中编写扩展

**中文** · [English](extension-authoring-en.md)

本页讲 Demo 仓库这一侧的接入：把组件和主题放进本地目录，重启开发服务器，在 Playground 中预览，再导出。扩展的 manifest、React 实现和测试写在引擎侧，完整流程见[扩展作者教程](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/extension-tutorial-ch.md)，最小可运行模板见 [examples/minimal-extension](https://github.com/yao1145/ReactiveMD/tree/main/examples/minimal-extension)。

Demo 的 Vite 已启用 `reactiveMd()`，运行期组件来自 `plugin/`，主题来自 `theme/`。不需要改 `vite.config.ts`；组件只使用现有依赖时也不需要重新安装。

## 1. 放入组件

新建 `plugin/<名称>/`，入口是 `index.ts`（也接受 `index.tsx`、`index.js`、`index.jsx`、`index.mts`、`index.mjs`，同一目录只能有一个入口）。入口默认导出组件包：

```ts
// plugin/rating-card/index.ts
export { default } from './components';
```

`components.tsx` 用 `defineReactComponentPackage` 把 manifest 与实现合成一个包：

```tsx
import { defineReactComponentPackage } from 'reactive-md/react';
import { ratingCard } from './manifest';

export default defineReactComponentPackage({
  ...ratingCard,
  render: RatingCard,
  renderStatic: RatingCardStatic,
});
```

规则：

- manifest、`render`/`renderStatic` 与引擎模板相同；把模板的 `src/extension.tsx` 拆成 `manifest.ts` 与 `components.tsx`，先在独立项目跑通 Node/SSR 检查和导出，再复制进来。
- `component.css` 会被自动收集，选择器写在 `.local-document` 内，使用组件前缀。不要在工厂里再传 `css`，否则样式资源会出现两个身份。
- 入口还可以导出 `notices`，离线导出会带上这些署名文本。
- 需要复用已发布的包时，入口直接转发它的公开 React 入口，例如 `plugin/tetris/index.ts` 的 `export { tetrisPackage as default } from 'reactive-md-tetris-package/react'`。

## 2. 放入主题

新建 `theme/<名称>/theme.css`。目录名就是主题名，文档用 `<theme name="<名称>">` 选择。可选 `theme.json` 声明 `id`、`name`、`version`、`protocol` 和 `colorSchemes`：

```json
{ "id": "reactive-md/theme-paper", "name": "paper", "version": "1.0.0" }
```

CSS 选择器限制在自己的主题根节点内，深浅模式分别写在 `[data-color-scheme="light"]` 与 `[data-color-scheme="dark"]` 下：

```css
[data-rmd-theme="paper"][data-color-scheme="light"] { --accent: #345678; }
[data-rmd-theme="paper"][data-color-scheme="dark"] { --accent: #abcdef; }
```

字体和图片放在主题目录的 `assets/`，CSS 中的相对引用会在构建期内联；远程 URL 和超出主题目录的路径会报错。

## 3. 重启并预览

```sh
npm run dev
```

打开 `http://127.0.0.1:5173`。开发服务器会监听入口增删和重命名；新组件没有出现时重启一次 `npm run dev`。预览中确认：

- 文档里写 `<rating-card ...>` 能渲染，绑定与内置控件同步。
- 编辑器目录中出现组件的标题、说明和插入模板。
- 文档写 `<theme name="paper">` 后视觉切换生效。

要把它放进 Playground 的文章列表，把示例写入 `content/examples/local/`，并在 `src/content/examples.ts` 登记中英文标题、提示和分区。

## 4. 导出

在工具栏点击导出按钮，选择 HTML。导出与预览共用发现到的 host，因此组件实现、资源、notices 和离线 bundle 都来自同一份配置。

提交前运行：

```sh
npm test
npm run build
npm run test:export
npm run test:runtime-extensions
```

`test:export` 检查 HTML 与图片导出；`test:runtime-extensions` 检查本地 `plugin/` 目录和离线导出 bundle。两者都会自行启动服务器并使用 Playwright，环境要求见 [Demo README](../README-ch.md)。已安装 tarball 夹具由 Vitest 用例覆盖。

## 5. 与已安装包夹具的区别

`plugin/` 和 `theme/` 是运行期来源。`package.json` 与 `vendor/` 中的 tetris、2048、sci-fi tarball 只作为安装包兼容测试夹具，供 `tests/directory-discovery.test.ts`、`tests/installed-tetris.test.ts` 等测试使用，页面不从这里加载扩展。

`extensions.ts` 仅保留样例元数据和兼容 `host` 导出；只有显式使用 `reactiveMd({ extensions })` 手动模式时才需要它。目录模式的注册位置就是 `plugin/` 和 `theme/`。

夹具清单见 [vendor/README-ch.md](../vendor/README-ch.md)，完整说明见 [Demo README](../README-ch.md)；目录规则见引擎文档[按目录接入](https://github.com/yao1145/ReactiveMD/blob/main/docs/integration/directory-discovery-ch.md)。

## 相关文档

- [扩展作者教程](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/extension-tutorial-ch.md)
- [最小扩展模板](https://github.com/yao1145/ReactiveMD/tree/main/examples/minimal-extension)
- [组件插件完整开发契约](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/component-development-reference-ch.md)
- [更新候选安装包](candidate-package-updates-ch.md)
