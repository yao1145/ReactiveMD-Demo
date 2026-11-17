# Extension authoring in the Demo

**English** · [中文](extension-authoring-ch.md)

This page covers the Demo repository side: put a component and a theme into local directories, restart the dev server, preview in the Playground, then export. The manifest, React implementation and tests belong to the engine side; follow the [extension author tutorial](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/extension-tutorial-en.md) and start from the [minimal-extension template](https://github.com/yao1145/ReactiveMD/tree/main/examples/minimal-extension).

The Demo Vite config already enables `reactiveMd()`. Runtime components come from `plugin/`, themes from `theme/`. You do not edit `vite.config.ts`, and a component that uses existing dependencies needs no reinstall.

## 1. Add a component

Create `plugin/<name>/` with an `index.ts` entry (`index.tsx`, `index.js`, `index.jsx`, `index.mts` and `index.mjs` are also accepted; only one entry per directory). The entry default-exports the component package:

```ts
// plugin/rating-card/index.ts
export { default } from './components';
```

`components.tsx` combines the manifest and implementations with `defineReactComponentPackage`:

```tsx
import { defineReactComponentPackage } from 'reactive-md/react';
import { ratingCard } from './manifest';

export default defineReactComponentPackage({
  ...ratingCard,
  render: RatingCard,
  renderStatic: RatingCardStatic,
});
```

Rules:

- The manifest and `render`/`renderStatic` are the same ones from the engine template. Split its `src/extension.tsx` into `manifest.ts` and `components.tsx`, then get Node/SSR checks and export passing in a standalone project before copying them here.
- `component.css` is collected automatically. Keep selectors inside `.local-document` and prefix them with the component name. Do not pass `css` to the factory as well; that creates a second style-resource identity.
- The entry can also export `notices`; offline export carries those attribution texts.
- To reuse a published package, re-export its public React entry, as `plugin/tetris/index.ts` does with `export { tetrisPackage as default } from 'reactive-md-tetris-package/react'`.

## 2. Add a theme

Create `theme/<name>/theme.css`. The directory name is the theme name; a document selects it with `<theme name="<name>">`. An optional `theme.json` declares `id`, `name`, `version`, `protocol` and `colorSchemes`:

```json
{ "id": "reactive-md/theme-paper", "name": "paper", "version": "1.0.0" }
```

Scope selectors to the theme root and write light and dark values under `[data-color-scheme="light"]` and `[data-color-scheme="dark"]`:

```css
[data-rmd-theme="paper"][data-color-scheme="light"] { --accent: #345678; }
[data-rmd-theme="paper"][data-color-scheme="dark"] { --accent: #abcdef; }
```

Put fonts and images in the theme's `assets/` directory. Relative CSS references are inlined at build time; remote URLs and paths outside the theme directory fail.

## 3. Restart and preview

```sh
npm run dev
```

Open `http://127.0.0.1:5173`. The dev server watches entries being added, removed or renamed; restart `npm run dev` if a new component does not appear. In the preview, confirm:

- `<rating-card ...>` renders and its binding stays in sync with built-in controls.
- The editor catalog shows the component title, description and insert template.
- `<theme name="paper">` switches the document visuals.

To add the component to the Playground article list, place a sample in `content/examples/local/` and register both language titles, hints and the section in `src/content/examples.ts`.

## 4. Export

Click the export button in the toolbar and choose HTML. Export uses the same discovered host as the preview, so implementations, resources, notices and the offline bundle come from one configuration.

Before committing, run:

```sh
npm test
npm run build
npm run test:export
npm run test:runtime-extensions
```

`test:export` checks HTML and image export; `test:runtime-extensions` checks the local `plugin/` directories and the exported offline bundle. Both start their own server and use Playwright; the [Demo README](../README.md) lists the environment requirements. Vitest covers the installed-tarball fixtures.

## 5. Installed-package fixtures

`plugin/` and `theme/` are the runtime sources. The tetris, 2048 and sci-fi tarballs in `package.json` and `vendor/` are compatibility fixtures for installed-package tests such as `tests/directory-discovery.test.ts` and `tests/installed-tetris.test.ts`; the page does not load extensions from them.

`extensions.ts` keeps example metadata and a compatibility `host` export. It is only needed when a project opts into the manual `reactiveMd({ extensions })` mode. Directory mode registers through `plugin/` and `theme/`.

The [vendor README](../vendor/README.md) lists the fixtures and the [Demo README](../README.md) documents the scripts; [directory discovery](https://github.com/yao1145/ReactiveMD/blob/main/docs/integration/directory-discovery-en.md) documents the discovery rules.

## Related documents

- [Extension author tutorial](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/extension-tutorial-en.md)
- [Minimal extension template](https://github.com/yao1145/ReactiveMD/tree/main/examples/minimal-extension)
- [Full component development contract](https://github.com/yao1145/ReactiveMD/blob/main/docs/development/component-development-reference-en.md)
- [Updating candidate packages](candidate-package-updates-en.md)
