# 本地主题

**中文** · [English](README.md)

本目录是站点的主题运行时。`vite.config.ts` 中的 `reactiveMd()` 会扫描 `theme/<名称>/`，内联其 CSS 并注册到编译器，编辑器、预览和离线导出因此直接渲染这里的文件。

`vendor/` 中的 `reactive-md-sci-fi-theme` tarball 是兼容性测试夹具。站点从不导入它，`src/main.tsx` 也不得导入：相关记录见 [vendor/README-ch.md](../vendor/README-ch.md)。

| 目录 | 主题名 | 文件 |
| --- | --- | --- |
| `sci-fi/` | `sci-fi` | `theme.json` 标识（`reactive-md/theme-sci-fi`、`sci-fi`、`1.0.0`），`theme.css` 入口及 `@import` 行，`assets/tokens.css`，`assets/components.css`，`assets/notch.css`，本目录的 `README.md` |

## 选择主题

文档按 `theme.json` 中的名称声明主题：

```markdown
<theme name="sci-fi">
```

编译时按名称匹配已发现的主题，并在输出容器上写入 `data-rmd-theme="sci-fi"`。未声明的文档使用默认主题。浅色方案为默认值；`data-color-scheme="dark"` 切换到 `assets/tokens.css` 中的深色 token。

## 添加主题

1. 新建 `theme/<名称>/theme.json`，写入 `id`、`name` 和 `version`。文档使用 `name`。
2. 新建入口样式 `theme.css`，用相对 `@import` 引入各部分。
3. 图片和字体使用相对 `url()` 路径。扫描会将其内联为 data URL，导出的文档保持离线可用。
4. 在示例中声明 `<theme name="<名称>">` 并运行 `npm test`。

扫描会内联本地 `@import` 目标和 `url()` 资源，本目录是构建读取的唯一来源。`tests/local-theme-directory.test.ts` 验证发现的标识、唯一的 `directory-theme/sci-fi.css` 资源和内联后的 CSS。`tests/directory-discovery.test.ts` 覆盖安装夹具路径，将 tarball 中的 CSS 复制到临时消费者主题。

要复用主题，把整个目录复制到另一项目的 `theme/<名称>/`。副本需要与本目录共存时，修改 `theme.json` 的 `id` 和 `name`。
