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
| `reactive-md-0.8.0-29db211ac632.tgz` | `reactive-md` | `0.8.0` |
| `reactive-md-editor-0.1.0-75143347ad6e.tgz` | `reactive-md-editor` | `0.1.0` |
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

The current engine candidate is `reactive-md-0.8.0-29db211ac632.tgz`, built from engine `main` at commit `c1a923a` plus uncommitted working-tree changes (default type scale aligned to the approved table, and document-root `lang` propagation for locale-aware theming). SHA256: `29db211ac632f12feed9325f59641a51e84d9a28144f172baf30257d75ed30cd`. The editor candidate is `reactive-md-editor-0.1.0-75143347ad6e.tgz`, built from editor `main` at commit `c29f550`. The theme candidate is `reactive-md-sci-fi-theme-1.0.0-92241b42204c.tgz`, built from the theme repository `master` at commit `77fa6fa` (SF-01 type scale alignment, scalable bilingual tracking with :lang(zh) tightening, and the host body-pin removal). SHA256: `92241b42204ccc1d060b3cfcdfeae9e5d01065ce3054663d5f9bb1c6523f6c13`. Installation uses the built package without sibling source imports.
