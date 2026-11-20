# Vendor packages

**English** · [中文](README-ch.md)

Every dependency the Demo installs from a tarball lives here. The engine and editor snapshots serve every build. The game and theme packages are compatibility fixtures that only the tests load.

| Tarball | Role | Loaded by |
| --- | --- | --- |
| `reactive-md-<version>-<hash>.tgz` | pinned engine package | `npm run dev`, `npm run build`, `npm test` |
| `reactive-md-editor-<version>-<hash>.tgz` | pinned editor package | `npm run dev`, `npm run build`, `npm test` |
| `reactive-md-tetris-package-<version>-<hash>.tgz` | compatibility fixture | `tests/installed-tetris.test.ts`, `tests/extension-host.test.tsx`, `tests/directory-discovery.test.ts` |
| `reactive-md-game-2048-package-<version>-<hash>.tgz` | compatibility fixture | `tests/directory-discovery.test.ts` |
| `reactive-md-sci-fi-theme-<version>-<hash>.tgz` | compatibility fixture | `tests/directory-discovery.test.ts` |

The site renders the local extension source in [plugin/](../plugin/README.md) and [theme/](../theme/README.md). No product path imports the three fixture tarballs. `tests/local-game-directories.test.ts` and `tests/local-theme-directory.test.ts` check that the local directories supply the components and the theme without them.

## Inventory

| File | Package | Version |
| --- | --- | --- |
| `reactive-md-0.9.0-dba5ed514f91.tgz` | `reactive-md` | `0.9.0` |
| `reactive-md-editor-0.2.0-c489c61e1846.tgz` | `reactive-md-editor` | `0.2.0` |
| `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |
| `reactive-md-tetris-package-0.1.0-fc1fa620038f.tgz` | `reactive-md-tetris-package` | `0.1.0` |
| `reactive-md-game-2048-package-0.1.0-ce931218c317.tgz` | `reactive-md-game-2048-package` | `0.1.0` |

Filenames include a SHA256 prefix; `package-lock.json` records the full npm integrity value. Use the exact vendor filenames in `package.json` and update the lockfile whenever package contents change. Older builds are archived locally under `archive/`. That directory is git-ignored, so it is neither committed nor uploaded.

## Installed fixture coverage

- `tests/installed-tetris.test.ts` resolves `reactive-md-tetris-package/react` from `node_modules` and checks the built entry, declarations, license, notices and CSS. It also checks the `^0.8.0-next.0` peer range, the absence of `src/`, and the lockfile integrity against the tarball bytes.
- `tests/extension-host.test.tsx` composes the installed Tetris package into a React host and renders static SSR markup.
- `tests/directory-discovery.test.ts` re-exports the installed Tetris and 2048 entries from a temporary `plugin/` directory and builds a theme from the installed theme CSS. It then checks the virtual host, the offline bundle and the absence of a registration module.

The game packages declare a `reactive-md` peer range of `^0.8.0-next.0` and a React peer range of `^19.0.0`. Install with `npm ci --legacy-peer-deps`, or `npm install --legacy-peer-deps` on a checkout without a lockfile.

## Update a tarball

Build the package in its own repository, copy the output here with the versioned, content-addressed filename, update the `file:` path in `package.json` and regenerate the lockfile. [docs/candidate-package-updates-en.md](../docs/candidate-package-updates-en.md) records the current engine and editor procedure.

The engine candidate is built on the [reactive-md@0.9.0](https://www.npmjs.com/package/reactive-md/v/0.9.0) release plus the streaming source compilation work at [94cd24c](https://github.com/yao1145/ReactiveMD/commit/94cd24c): `sourcePhase`, result `status`, `transientDiagnostics`, and the matching scheduler, Worker and React changes. It was packed from `dist-library/` at that commit. SHA256 is `dba5ed514f91b344a7e0e5855ad1a7d796d6c969241584c67802b557a7f9a4b2`.

The Editor 0.2.0 candidate was built from [4cb9816](https://github.com/yao1145/ReactiveMD-Editor/commit/4cb98167d04b3b168b19ae7b472a94dbd97cc28a). Its analysis Worker bundles the published [reactive-md@0.9.0](https://www.npmjs.com/package/reactive-md/v/0.9.0) engine, so it does not include the streaming changes above. SHA256 is `c489c61e1846c0e9410f7a8f14d53b2c7de646b6be70d993bb15e9348ee4cdbb`.

The theme fixture was built from commit `351b341` and has SHA256 `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`.
