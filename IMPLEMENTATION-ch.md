# 实现与验证记录

**中文** · [English](IMPLEMENTATION.md)

> monorepo 时期的历史记录。当前的安装、构建、测试和部署命令见 [README-ch.md](README-ch.md) 和 [AGENTS-ch.md](AGENTS-ch.md)。指向 `../docs/` 和 `examples/local/` 的链接描述的是早期仓库布局。

## 当前发布：0.4.0 / local-draft-2

当前源码整合了只读计算、格式化、数组与有界数据表、建议式校验、作者工具、可移植参数状态、HTML 导出和依赖感知渲染。[语法规范](../docs/reference/local-interaction-syntax-en.md)、[兼容性说明](../docs/compatibility/compatibility-en.md) 和 [发布检查清单](../docs/development/releasing-en.md) 描述了当前的约定。

在仓库根目录运行 `npm run verify:release` 执行发布门禁。它会构建包和 demo，在仓库外的消费者中检查实际 tarball，并使用受管预览服务器运行浏览器检查。生成的报告应放在被忽略的 artifact 目录中。以下结果是带日期的历史记录；当前的就绪状态来自一次新的门禁运行。线上站点部署的 commit 记录在其 `release.json` 中。

## 历史本地评审：0.4.0 / local-draft-2（2026-10-23）

本次检出新增十个组件名称（共 43 个）、经检查的 todo 样式、组件颜色和共享的表/图选择。全部 43 个组件分布在原有的六个双语场景中，并新增九个编辑器插入模板（共 34 个）。独立的新交互和组件参考导航项已移除；旧书签会解析到 Functions 和 Forms。语法和迁移记录在 [new components](../docs/reference/local-components-v2-en.md)。

三个 Claude Code 会话在各自独立的文件范围内实现了编译器/运行时、控件/导航和可视选择。协调者审查了改动并修复集成问题，包括顺序无关的锚点冲突、行内内容校验、小数区间边界、坐标草稿重置和匿名步骤状态。本节记录实现与本地验证。线上站点在 release.json 中标识其部署的 commit；下面的部署记录描述的是更早的一次发布。

本次评审的验证：

- 核心测试套件和 Demo 套件通过；包含新的核心、渲染器、可视和集成验收用例。
- 构建、组件一致性、公开包、离线打包安装/types/SSR 和文档链接检查通过。
- Edge 检查覆盖 35 种容器布局、全部七个导航项在 375/768/1440px 下的两种语言、现有本地控件和文档可用性，以及桌面端/移动端编辑器插入。
- `verify-v2.mjs` 检查六个场景和边界情况，覆盖指针/键盘输入、隐藏跳转反馈、焦点、todo 样式、前景/强调色、重置、小数坐标边界，以及表格搜索/排序/分页后的共享选择。它以 375px 和桌面宽度捕获每个场景的英文/中文、浅色/深色截图，浏览器运行时无异常。
- 构建仍保留关于 JavaScript chunk 超过 500 kB 的既有警告。SSR hydration 和屏幕阅读器可用性尚未人工验证。

浏览器报告和截图位于被忽略的 `demo/artifacts/` 目录。本地 Vite 服务监听 `http://127.0.0.1:5173`；它使用当前工作区的库构建。生产部署使用带版本号的发布目录和原子站点符号链接切换，并保留上一个发布用于回滚。

## 历史本地交互评审（2026-10-22）

Playground 已切换到 `local-draft-1`，并直接加载 `examples/local/` 中的 12 个文档。十一个正常示例运行，诊断示例则故意失败并禁用交互。作者语法见 [local interaction specification](../docs/reference/local-interaction-syntax-en.md)；公开入口见 [integration guide](../docs/integration/local-integration-en.md)。

| 模块 | 实现 |
| --- | --- |
| 标签与 Markdown | `src/local/parser.ts`：隔离代码和数学区域、嵌套容器、属性、表格转义和原始源码位置 |
| 表达式 | `src/local/expression.ts`：严格类型、短路求值、内置函数、插值和执行预算 |
| 编译与状态 | `src/local/schema.ts`、`compiler.ts`、`runtime.ts`：33 个组件、前向与共享绑定、初始值约束、局部错误和原子重置 |
| LaTeX | `src/local/math.ts`：真实函数求值、分段函数、执行预算和不连续点细分；`math-display.ts`、`math-view.tsx`：KaTeX HTML/MathML 排版、mhchem、共享诊断和内置字体 |
| React | `src/local/LocalDocumentView.tsx`：输入草稿、IME 组合输入、隐藏状态、计时器暂停、错误恢复和跨实例唯一 DOM ID |
| 可视化 | `src/local/visuals.tsx`：表格、五种图表、函数曲线、时间线、自动布局图和键盘读数 |

主 agent 通过 `claude-code-subagent` 并行委派了七个实现任务，覆盖解析、表达式、数学、编译运行时、基础组件、可视化和 Playground 集成。主 agent 审查了实际代码，修复集成问题，并运行了全部测试和浏览器检查。任务和会话记录保存在被忽略的 `.tasks/local-syntax/` 目录。

本轮通过：

- `npm test`：16 个测试文件，201 个测试。
- `npm run build:demo`：核心类型检查、语言包和 Playground 构建。
- `npm run test:demo`：15 个公开包和示例测试。
- `npm run test:package`：核心无 React 运行时依赖、公开入口、全部示例和应用样式边界。
- `npm run test:docs`：文档链接和导航锚点。
- `demo/scripts/verify-local-browser.mjs`：Edge 中 38 项检查，包括 12 个示例、输入草稿、IME 组合输入、隐藏清单、条件求值错误恢复、计时器暂停、表格排序和分页、375px 布局，以及两个 StrictMode 实例的独立状态和唯一 DOM ID。运行时异常和意外外部请求均为 0。

浏览器报告位于 `demo/artifacts/local-browser-results.json`，截图以 `local-` 开头。检查将 `DEMO_URL` 指向本轮启动的本地测试服务器。构建保留了一个大 chunk 体积警告；未做按需 chunk 拆分。

## 历史云服务器部署（2026-10-22）

本次部署中，本地模式替换了[线上 demo](https://yaozi.raricy.com/)。服务器通过 `ssh rocky2-ts` 访问；站点目录为 `/opt/reactive-md`，`site` 符号链接已切换到 `releases/20261022-1400-local-draft-1`。上一个发布 `releases/20261021-235541` 被保留用于回滚。复用了现有的 Caddy、证书和容器配置。

上传包、入口点和所有新资源的 SHA256 校验通过。服务器上的 IPv6 HTTPS 返回了新版本；通过临时 SSH 隧道，全部 38 项线上浏览器检查在真实域名和正常证书校验下通过。当前客户端直接公网连接超时，因此该检查不代表当前网络的直接公网访问已恢复。报告保存在本地 `demo/artifacts/deployed-browser-results.json`，发布记录位于 `.tasks/deploy/`。
