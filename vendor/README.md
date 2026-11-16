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
| `reactive-md-0.8.0-35535f1b598a.tgz` | `reactive-md` | `0.8.0` |
| `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz` | `reactive-md-editor` | `0.1.0` |
| `reactive-md-sci-fi-theme-1.0.0-92241b42204c.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |

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

The current engine candidate is `reactive-md-0.8.0-35535f1b598a.tgz`, built from engine `main` at commit `4ff502a` (heading scale kept at every viewport width on top of the approved type scale and document-root `lang` propagation). SHA256: `35535f1b598a5b2c7e329e546594137291eb8c4988150f4608651c373e5086a2`. The editor candidate is `reactive-md-editor-0.1.0-54d6cdc3ebf0.tgz`, built from editor `main` at commit `8b1405f` (chrome font reset scoped away from embedded document controls). SHA256: `54d6cdc3ebf03de552d20daa1e023c0e0717ea44a444cfe2ac772a73e9f5ebc8`. The theme candidate is `reactive-md-sci-fi-theme-1.0.0-92241b42204c.tgz`, built from the theme repository `master` at commit `77fa6fa` (SF-01 type scale alignment, scalable bilingual tracking with :lang(zh) tightening, and the host body-pin removal). SHA256: `92241b42204ccc1d060b3cfcdfeae9e5d01065ce3054663d5f9bb1c6523f6c13`. Installation uses the built package without sibling source imports.
