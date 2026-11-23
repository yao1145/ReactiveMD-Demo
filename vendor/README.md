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
| `reactive-md-0.9.2-2675f8860abf.tgz` | `reactive-md` | `0.9.2` |
| `reactive-md-editor-0.2.1-a703894489d5.tgz` | `reactive-md-editor` | `0.2.1` |
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

The engine 0.9.2 candidate adds bounded observability, complete export report codes, scoped diagnostics, retry ownership and safe fallback scheduling. It is a prepared candidate, not a published release. SHA256 is `2675f8860abf7f8ae70ac81389120f2524c99ebefe388267ac9704fd1427e180`.

The Editor 0.2.1 candidate bundles this engine candidate in its analysis Worker and requires the `reactive-md@^0.9.2` peer. It is also a prepared candidate. SHA256 is `a703894489d558a5a5adbb8994dcd0451c933171fe267ddb09497af7f63517d7`.

The theme fixture was built from commit `351b341` and has SHA256 `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`.
