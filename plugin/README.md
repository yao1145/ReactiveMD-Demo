# Local extension packages

**English** · [中文](README-ch.md)

This directory is the site's component runtime. `reactiveMd()` in `vite.config.ts` discovers every subdirectory, so `npm run dev`, `npm run preview`, `npm run build` and the offline export all run these files. Edit them here; the normal site build deploys the result.

The game packages installed from `vendor/` are compatibility fixtures for tests. The site never imports them. [vendor/README.md](../vendor/README.md) lists their versions, hashes and coverage.

| Directory | Tag | Files |
| --- | --- | --- |
| `tetris/` | `<tetris>` | `index.ts` default package export and notices, `manifests.ts` authored attributes, `components.tsx` React view, `tetris-engine.ts` board rules, `component.css`, `NOTICES.md` |
| `game-2048/` | `<game-2048>` | `index.ts` default package export and notices, `manifest.ts` authored attributes, `components.tsx` React view, `game-engine.ts` tile rules, `component.css`, `NOTICES.md` |

Discovery inlines local `@import` targets and `url()` assets, collects `component.css` as `directory-plugin/<name>.css`, and registers each manifest with the compiler, the editor catalog and the offline bundle. [extensions.ts](../extensions.ts) supplies the Games example metadata and a host export for tests; registration comes from this directory, not from that file.

## Add a component

1. Create `plugin/<name>/index.ts`. Export the package from `defineReactComponentPackage` as the default, and export `notices` when the directory carries third-party material.
2. Declare the authored attributes with `defineLocalComponent` from `reactive-md/sdk`, following `manifests.ts` or `manifest.ts`.
3. Implement the React view against `reactive-md/react` and put its styles in `component.css`.
4. Start `npm run dev`. Discovery picks up the directory and the editor insertion menu picks up the manifest's `authoring` block without a separate registration step.
5. Write an example that uses the tag and run `npm test`.

Capabilities decide where a component renders: `interactive`, `static`, `ssr` and `offline`. A package that omits `offline` produces an export diagnostic instead of a silently incomplete bundle. `tests/local-game-directories.test.ts` covers this directory path, including style collection and static SSR. The installed-package path is covered by `tests/installed-tetris.test.ts`, `tests/extension-host.test.tsx` and `tests/directory-discovery.test.ts`.

To reuse a component in another project, copy its directory to that project's `plugin/<name>/`. Change the manifest `id` when the copy must coexist with this one.
