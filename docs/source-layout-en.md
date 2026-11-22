# Source layout

**English** · [中文](source-layout-ch.md)

`src/` is grouped by feature area. This organization changes paths only: the application behavior, public APIs, dependencies, versions and build output stay the same. Entry files remain at the `src/` root.

## Entry points

| File | Role |
| --- | --- |
| `src/main.tsx` | Playground entry loaded by `index.html`. Imports the engine and editor styles, the app styles and `app/App`. |
| `src/reactive-md-vite.d.ts` | Vite client and virtual-module type declarations. |

`src/main.tsx` is the stable browser entry. `index.html` and the `vite.config.ts` build input refer to it by path.

## Groups

| Group | Files | Responsibility |
| --- | --- | --- |
| `app/` | `App.tsx`, `styles.css`, `author.css` | Playground shell. Composes the editor, preview, library, outline, dialogs and developer tools; holds application state and wiring. The stylesheets cover the page shell, workbench layout and authoring toolbar. |
| `documents/` | `document-library.ts`, `document-library-codec.ts`, `document-tree.tsx`, `document-tree.css`, `document-outline.tsx`, `document-outline.css`, `document-outline-model.ts`, `use-draft-persistence.ts`, `workspace-storage.ts` | Personal document library model and its versioned storage codec, folder/trash handling, example draft persistence, sidebar tree and the heading outline workspace. |
| `compilation/` | `use-local-compilation.ts`, `local-compile-worker.ts`, `preview-state.ts`, `diagnostics.ts`, `diagnostic-list.tsx`, `component-state-storage.ts` | Worker-backed local compilation hook, the compile worker entry, the transient preview trial session, diagnostic helpers and list, and saved component progress storage. |
| `images/` | `image-assets.ts`, `image-assets-panel.tsx`, `image-copy.ts`, `use-document-images.ts`, `example-images.ts` | Image validation and limits, IndexedDB storage, built-in example artwork, the image panel and its labels. |
| `export/` | `export-dialog.tsx`, `export-html.ts`, `export-pdf.ts` | Export dialog, shareable HTML generation, and the PDF download and browser-print helpers. |
| `preview/` | `local-preview.tsx`, `preview-fullscreen.tsx`, `preview-fullscreen.css` | Runtime-backed preview surface with runtime/session lifecycle, saved component progress and diagnostics; fullscreen preview toggle, native Fullscreen API handling and the viewport fallback overlay. |
| `network/` | `survey-contract.ts`, `survey-network.ts` | Survey example contract (endpoint paths, participant header and payload validation) and the development-only HTTP submit and SSE results client. |
| `streaming/` | `fake-stream.ts`, `streaming-sample.tsx`, `streaming-sample.css` | Deterministic streaming sample: tokens-per-second pacing, example or host-authored source, stale-result accounting, and a live streaming preview panel. |
| `content/` | `examples.ts`, `guide-examples.tsx`, `guide-view.tsx`, `guide-code.css` | Example catalog, the guide view and guide rendering, and guide code styles. Markdown sources stay in the top-level `content/examples/` and `content/guides/` directories. |
| `ui/` | `i18n.tsx`, `icons.tsx`, `use-editor-height.ts`, `use-scroll-container.ts` | Shared typed copy, the icon set and layout hooks. |
| `settings/` | `component-mode.ts`, `html-options.ts` | Component mode host selection and the HTML capability model. |
| `developer/` | `developer-tools.tsx`, `developer-tools.css` | Developer tools panel for runtime diagnostics and package inspection. |

## Where new files belong

- A feature change goes in the group that already owns the behavior. Put a helper beside the module that uses it.
- A shared presentational primitive or hook used by two or more groups goes in `ui/`.
- Document persistence and library operations go in `documents/`; compile scheduling, worker messages, diagnostics and component progress storage in `compilation/`; image validation and storage in `images/`; export rendering and PDF printing in `export/`; example and guide catalogs and the guide view in `content/`; capability switches and component modes in `settings/`; the survey contract and network client in `network/`; the streaming sample and pacing in `streaming/`.
- Add a new top-level group only for a real feature area. A single file belongs with its closest existing group.
- Markdown content stays outside `src/`; `src/content/` holds only the code that catalogs and renders it.

## Imports across groups

- Imports use direct relative paths: `./name` within a group, `../group/name` across groups. There are no source barrels or re-export indexes.
- `app/App.tsx` is the composition root and imports the feature groups it assembles. Feature groups import shared modules from `ui/` and `settings/` and the specific module they use. Feature groups do not import `app/`.
- When a file moves inside a group, update its own relative imports and every module that points at it.
- Engine and editor code stays behind package specifiers: `reactive-md`, `reactive-md/react`, `reactive-md/export`, `reactive-md/authoring`, `reactive-md/vite` and `reactive-md-editor`. The Demo uses the fixed vendor tarballs; it has no relative links into a sibling source tree.

## Styles

- Component CSS lives beside its component in the same group and is imported by that component: `document-tree.tsx` imports `./document-tree.css`, `developer-tools.tsx` imports `./developer-tools.css`.
- Page-wide styles are loaded from the entry because they apply across the shell and rendered documents: `app/styles.css` and `app/author.css`, plus `content/guide-code.css`.
- Engine and editor styles remain package imports: `reactive-md/styles.css` and `reactive-md-editor/styles.css`.

## Build anchors

`vite.config.ts` registers the React plugin, `reactiveMd({ includeMinimal: true })`, `exportAssets()`, `pdfExport()` and `surveyApi()`, with `index.html` as the build input. `reactiveMd()` discovers the component packages in `plugin/` and the theme in `theme/`. `vite.pdf-export.ts` serves the local `/__reactive-md/pdf` endpoint, which renders print-ready HTML through `reactive-md/pdf`. `vite.survey.ts` provides the loopback-only survey HTTP and SSE endpoints used by the network example. `vitest.config.ts` registers only the ReactiveMD and export-asset plugins; the PDF and survey plugins are dev-server only. The `extensions.ts` file at the repository root supplies the Games example metadata and a host export for tests.
