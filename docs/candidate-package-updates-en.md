# Updating candidate packages

**English** · [中文](candidate-package-updates-ch.md)

The Demo builds against committed tarballs in `vendor/`: the engine, the editor, the sci-fi theme and the two game packages. This document replaces older instructions that ran `update:demo-*` scripts. Those scripts belonged to the monorepo and do not exist here; `package.json` has no `update:*` entry, so the work happens in the owning repository plus the Demo checkout.

When updating the engine and editor together, pin the engine tarball in the editor first and rebuild its analysis Worker. Then pin the same engine bytes and the resulting editor tarball in the Demo. If the engine published to npm has a different integrity value, rebuild the editor against the published engine before updating the pair here.

## Procedure

1. **Build in the owning repository.** Engine: `npm run check` in `ReactiveMD` (it also runs the packed-consumer boundary check). Editor: `npm run check` in `ReactiveMD-Editor`. Theme and game packages: their own build script.
2. **Pack.** In the owning repository run `npm pack`. The output is `<name>-<version>.tgz`. The engine and editor define `prepack` as `npm run build && npm run notices`, so pack from a clean tree and let it build.
3. **Hash.** `sha256sum <name>-<version>.tgz` (PowerShell: `Get-FileHash <file> -Algorithm SHA256`).
4. **Rename with a content prefix.** Rename to `<name>-<version>-<first-12-hex-of-sha256>.tgz`, for example `reactive-md-0.8.0-63e6e77341c5.tgz`. The prefix only identifies content; renaming does not change the hash.
5. **Move the old tarball out.** Archive the replaced file under `vendor/archive/` (git-ignored). Copy the new tarball into `vendor/`.
6. **Update the dependency path.** Point the entry at the exact vendor filename: `"reactive-md": "file:vendor/reactive-md-0.8.0-63e6e77341c5.tgz"`. The same applies to `reactive-md-editor`, `reactive-md-sci-fi-theme`, `reactive-md-tetris-package` and `reactive-md-game-2048-package`.
7. **Regenerate the lockfile.** Run `npm install --legacy-peer-deps`. This records the tarball's `sha512` integrity next to the new path. Never hand-edit `integrity` values.
8. **Install from the lockfile.** Remove `node_modules` when switching candidates, then run `npm ci --legacy-peer-deps`. An integrity mismatch fails the install, which is the intended check.
9. **Verify the installed package.** `node -e "console.log(require('./node_modules/reactive-md/package.json').version)"` and, for the engine, `node -e "import('reactive-md/export-assets').then(m => console.log(m.listExportAssets().protocol))"`. Both must report the candidate you just packed.
10. **Run the affected checks.** Engine: `npm run check` in the engine repository; after installing here, run `npm test`, `npm run build`, `npm run test:export` and `npm run test:runtime-extensions`. Editor: its `npm run check`, then `npm run test:editor`, `npm run test:toolbar` and `npm run test:interactions` here. Theme or game packages: `npm test` for the installed fixtures and `npm run test:runtime-extensions` for the site runtime. Finish with `npm run build` for site-wide changes.
11. **Record the result.** Update the candidate table and the trailing paragraph in `vendor/README.md` and `vendor/README-ch.md` with version, owning-repository commit, build description and SHA256.

## Engine export assets

`vite.export-assets.ts` imports `reactive-md/export-assets`, so an engine candidate must publish that subpath with declarations. A candidate without it fails while Vite loads `vite.config.ts` and `vitest.config.ts`. The plugin maps the virtual modules `virtual:reactive-md-assets/base-css`, `print-css`, `notices`, `package-json` and `runtime` onto the manifest ids through `resolveExportAsset` and `readExportAsset`, and registers each resolved file with `addWatchFile` so edits rebuild the export.
