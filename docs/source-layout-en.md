# Source layout

**English** · [中文](source-layout-ch.md)

`src/` is grouped by feature area. This organization changes paths only: the application behavior, public APIs, dependencies, versions and build output stay the same. Entry files remain at the `src/` root.

## Entry points

| File | Role |
| --- | --- |
| `src/main.tsx` | Playground entry loaded by `index.html`. Imports the engine and editor styles, the app styles and `app/App`. |
| `src/embed.tsx` | Embed entry loaded by `embed.html`. Renders independent in-memory documents. |
| `src/reactive-md-vite.d.ts` | Vite client and virtual-module type declarations. |

These three paths are stable anchors. `index.html`, `embed.html`, the `vite.config.ts` build inputs and the Vitest setup refer to them by path.

## Groups

| Group | Files | Responsibility |
| --- | --- | --- |
| `app/` | `App.tsx`, `styles.css`, `author.css` | Playground shell. Composes the editor, preview, library, outline, dialogs and developer tools; holds application state and wiring. The stylesheets cover the page shell, workbench layout and authoring toolbar. |
| `documents/` | `document-library.ts`, `document-tree.tsx`, `document-tree.css`, `document-outline.tsx`, `document-outline.css`, `document-outline-model.ts` | Personal document library model, folder/trash handling, sidebar tree and the heading outline workspace. |
| `compilation/` | `use-local-compilation.ts`, `local-compile-worker.ts`, `preview-state.ts` | Worker-backed local compilation hook, the compile worker entry and the transient preview trial session. |
| `images/` | `image-assets.ts`, `image-assets-panel.tsx`, `image-copy.ts`, `use-document-images.ts` | Image validation and limits, IndexedDB storage, the image panel and its labels. |
| `export/` | `export-dialog.tsx`, `export-html.ts` | Export dialog and shareable HTML generation. |
| `content/` | `examples.ts`, `guide-examples.tsx`, `guide-code.css` | Example catalog, guide rendering and guide code styles. Markdown sources stay in the top-level `content/examples/` and `content/guides/` directories. |
| `ui/` | `i18n.tsx`, `icons.tsx`, `use-editor-height.ts`, `use-scroll-container.ts` | Shared typed copy, the icon set and layout hooks. |
| `settings/` | `html-options.ts`, `html-compatibility.tsx` | HTML capability model and its controls. |
| `developer/` | `developer-tools.tsx`, `developer-tools.css` | Developer tools panel for runtime diagnostics and package inspection. |

## Where new files belong

- A feature change goes in the group that already owns the behavior. Put a helper beside the module that uses it.
- A shared presentational primitive or hook used by two or more groups goes in `ui/`.
- Document persistence and library operations go in `documents/`; compile scheduling and worker messages in `compilation/`; image validation and storage in `images/`; export rendering in `export/`; example and guide catalogs in `content/`; capability switches in `settings/`.
- Add a new top-level group only for a real feature area. A single file belongs with its closest existing group.
- Markdown content stays outside `src/`; `src/content/` holds only the code that catalogs and renders it.

## Imports across groups

- Imports use direct relative paths: `./name` within a group, `../group/name` across groups. There are no source barrels or re-export indexes.
- `app/App.tsx` is the composition root and imports the feature groups it assembles. Feature groups import shared modules from `ui/` and `settings/` and the specific module they use. Feature groups do not import `app/`.
- When a file moves inside a group, update its own relative imports and every module that points at it.
- Engine and editor code stays behind package specifiers: `reactive-md`, `reactive-md/react`, `reactive-md/export`, `reactive-md/authoring`, `reactive-md/vite` and `reactive-md-editor`. The Demo uses the fixed vendor tarballs; it has no relative links into a sibling source tree.

## Styles

- Component CSS lives beside its component in the same group and is imported by that component: `document-tree.tsx` imports `./document-tree.css`, `developer-tools.tsx` imports `./developer-tools.css`.
- Page-wide styles are loaded from the entries because they apply across the shell and rendered documents: `app/styles.css` and `app/author.css` from both entries, `content/guide-code.css` from `main.tsx`.
- Engine and editor styles remain package imports: `reactive-md/styles.css` and `reactive-md-editor/styles.css`.

## Build anchors

`vite.config.ts` registers the React plugin, `reactiveMd({ extensions: './extensions.ts' })` and `exportAssets()`, with `index.html` and `embed.html` as build inputs. `vitest.config.ts` registers the same ReactiveMD and export-asset plugins. The `extensions.ts` file at the repository root registers the Tetris and 2048 packages.
