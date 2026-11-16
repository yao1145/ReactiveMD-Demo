# Demo extension packages

**English** · [中文](README-ch.md)

The Demo installs Tetris and 2048 from the committed npm tarballs in this
directory. Filenames include a SHA256 prefix; `package-lock.json` records the
full npm integrity value. Installation uses each package's built JavaScript,
declarations, CSS and notices, so a fresh checkout does not need to build the
examples first.

The same directory carries the engine, editor and reference-theme snapshots the
Demo builds against:

| File | Package | Version |
| --- | --- | --- |
| `reactive-md-0.8.0-63e6e77341c5.tgz` | `reactive-md` | `0.8.0` |
| `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz` | `reactive-md-editor` | `0.1.0` |
| `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |

Older builds are archived locally under `archive/`. That directory is git-ignored, so it is neither committed nor uploaded.

Build a new engine, editor or theme tarball in its own repository, copy it here
with the versioned filename, update `package.json` and regenerate the lockfile.
The game packages keep their own source repositories; replace their tarballs the
same way when a new game build is released.

Install with `npm ci --legacy-peer-deps` (or `npm install --legacy-peer-deps`
on a checkout without a lockfile). The committed game tarballs still declare a
`reactive-md` peer range of `^0.7.0`, while this Demo runs the `0.8.0`
engine. The game runtime API used by the Demo is unchanged.

Candidate tarball filenames include a SHA256 prefix. Use the exact vendor filenames in package.json; update those paths and lockfile integrity whenever package contents change.

The current engine candidate is `reactive-md-0.8.0-63e6e77341c5.tgz`, built from engine `main` at commit `f79e30b` (h5/h6 heading scale through `--text-h5`/`--text-h6`, with 0.83em/0.75em fallbacks for themes that leave them undefined). SHA256: `63e6e77341c5ffab1c5fa8e603ddc824c150d2ac2f5dffd268f22aa9ec3536b8`. The editor candidate is `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz`, built from editor `main` at commit `8b1405f` (chrome font reset scoped away from embedded document controls). SHA256: `54d6cdc3ebf03de552d20daa1e023c0e0717ea44a444cfe2ac772a73e9f5ebc8`. The theme candidate is `reactive-md-sci-fi-theme-1.0.0-525cab7ab93f.tgz`, built from the theme repository `master` at commit `351b341` (h5 and h6 type scale steps on top of the SF-01 machine tier). SHA256: `525cab7ab93fda6331e8fd5260c2c85aec5935559032bc951ad0ed827f7d4277`. Installation uses the built package without sibling source imports.
