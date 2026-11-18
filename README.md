# Reactive MD Demo

**English** · [中文](README-ch.md)

The Playground for Reactive MD: an editor, live preview, document library, HTML export and a set of bilingual example articles. The site's components and theme are local source under `plugin/` and `theme/`. The candidate `reactive-md` engine and `reactive-md-editor` package arrive as committed tarballs, so this repository builds without the engine source tree.

Live site: [yaozi.raricy.com](https://yaozi.raricy.com/).

## Requirements

- Node.js 22.12 or newer. CI uses Node 24.
- npm.

## Install and run

```sh
npm ci --legacy-peer-deps
npm run dev
```

Open `http://127.0.0.1:5173`. The embed example is at `/embed.html`.

The Workshop budget example is at `/?example=minimal-budget`. Switch component
modes in Developer tools and select PDF in the Export dialog. PDF uses the selected starting
values. With Playwright Chromium installed (`npx playwright install chromium`),
the local dev server downloads the PDF. The static site opens the browser print
dialog, where you can choose Save as PDF.

`npm ci` requires `package-lock.json`. On a fresh checkout without a lockfile, run `npm install --legacy-peer-deps` once and commit the result.

## Runtime and fixtures

| Path | Role | Loaded by |
| --- | --- | --- |
| `plugin/`, `theme/` | Product runtime extension source | `npm run dev`, `npm run build`, preview and export |
| `vendor/reactive-md-<version>-<hash>.tgz`, `vendor/reactive-md-editor-<version>-<hash>.tgz` | Candidate engine and editor snapshots | every build, test and preview |
| `vendor/reactive-md-tetris-package-*.tgz`, `vendor/reactive-md-game-2048-package-*.tgz`, `vendor/reactive-md-sci-fi-theme-*.tgz` | Compatibility fixtures | `tests/installed-tetris.test.ts`, `tests/extension-host.test.tsx`, `tests/directory-discovery.test.ts` |

The games and the theme that the site renders are the directories in [plugin/](plugin/README.md) and [theme/](theme/README.md). The installed game and theme tarballs verify that an npm consumer discovers and compiles those packages; the site imports none of them.

The engine and editor arrive as tarballs under `vendor/` (`reactive-md` 0.8.0, `reactive-md-editor` 0.1.0). [vendor/README.md](vendor/README.md) lists the full inventory, hashes and the update procedure; [docs/candidate-package-updates-en.md](docs/candidate-package-updates-en.md) records the current candidate procedure.

The sci-fi theme is discovered from `theme/sci-fi/theme.css`, so documents that declare
`<theme name="sci-fi">` render in the preview, the editor and the offline export.

Tetris and 2048 run from local source under `plugin/tetris/` and `plugin/game-2048/`. The committed game and theme tarballs are compatibility fixtures for the installed-package tests.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server on `127.0.0.1:5173` |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest unit and integration tests |
| `npm run test:browser:smoke` | One Chromium desktop and mobile smoke run |
| `npm run test:editor` | Editor scrolling, views and source navigation checks |
| `npm run test:toolbar` | Toolbar and component insertion checks |
| `npm run test:interactions` | Editor selection and interaction checks |
| `npm run test:export` | HTML and image export checks |
| `npm run test:runtime-extensions` | Local `plugin/` extensions and the offline export bundle |
| `npm run test:outline` | Document outline behavior |
| `npm run test:workbench` | Compact workbench layout |

Most browser scripts target `http://127.0.0.1:5173`; start `npm run dev` first, or set `DEMO_URL` to another running site. `test:browser:smoke`, `test:interactions` and `test:runtime-extensions` start their own Vite server. Scripts use Edge by default; set `PLAYWRIGHT_CHANNEL=chromium` to use the bundled browser. Reports and screenshots go to `artifacts/`.

```sh
npm run dev
DEMO_URL=http://127.0.0.1:5173 PLAYWRIGHT_CHANNEL=msedge npm run test:editor
```

## Content

- `content/examples/local/` contains the example articles shown in the Playground.
- `content/guides/` contains the English and Chinese user guide.
- `src/` contains the application: editor shell, preview, document library, export dialog and extension registration.
- `plugin/` holds the site's component source and `theme/` holds its theme source. Each directory has a README with the file inventory and the add-a-component or add-a-theme steps.
- `extensions.ts` keeps example metadata and a compatibility host export.

Example and guide files are ordinary Markdown sources imported with `?raw`. Edit them in place; the navigation titles and hints live in `src/content/examples.ts`.

## Add a theme or component

Vite uses `reactiveMd()`. Add `theme/<name>/theme.css` for a theme or a default package export in `plugin/<name>/index.ts` for a component. `component.css` and local CSS assets are collected automatically, and the site runs these directories directly. [plugin/README.md](plugin/README.md) and [theme/README.md](theme/README.md) list the existing files and the steps to add one. The end-to-end path from component definition to preview, SSR and export is in [extension authoring](docs/extension-authoring-en.md).

`tests/directory-discovery.test.ts` creates an independent directory-only consumer and checks serializable compiler/editor data, SSR and offline resources.

## Source layout

`src/` is grouped by feature. See [docs/source-layout-en.md](docs/source-layout-en.md) or [docs/source-layout-ch.md](docs/source-layout-ch.md) for each group, where new files belong, cross-group imports and the stable browser entries `src/main.tsx` and `src/embed.tsx`.

## Export assets

Exported HTML embeds the engine stylesheet, print stylesheet, notices, package version and standalone runtime. The engine publishes them through the `reactive-md/export-assets` entry, which maps each manifest id to its file. `vite.export-assets.ts` resolves that entry and exposes each file as a build-time string module. Keep this plugin registered in both `vite.config.ts` and `vitest.config.ts`.

## Editor styles

The editor package owns its styles:

```ts
import 'reactive-md-editor/styles.css';
```

The engine stylesheet remains:

```ts
import 'reactive-md/styles.css';
```

## Migration from the monorepo

See [docs/migration.md](docs/migration.md) for the import and path changes that turned `demo/` into this repository.

## Deployment

The site is a static build. `npm run build` writes `dist/`; `.github/workflows/site.yml` uploads that directory as a workflow artifact and stops there. Production deployment is a manual, versioned symlink switch documented in [AGENTS.md](AGENTS.md).
