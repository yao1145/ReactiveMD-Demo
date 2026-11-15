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
| `reactive-md-0.8.0-4a8c8a3643d4.tgz` | `reactive-md` | `0.8.0` |
| `reactive-md-editor-0.1.0-ff3c7a6f222c.tgz` | `reactive-md-editor` | `0.1.0` |
| `reactive-md-sci-fi-theme-1.0.0-a2cb4b20c307.tgz` | `reactive-md-sci-fi-theme` | `1.0.0` |

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

The current engine candidate is `reactive-md-0.8.0-4a8c8a3643d4.tgz`, built from engine `main` at commit `8b3c931` (one layered theme baseline with per-component CSS, plus the table-pipe, lexical-shielding, HTML attribute, state restoration, formatting and incremental-session fixes). SHA256: `4a8c8a3643d4fd8494d6e47a38482c9accb4953ef2caf642592c69cd3d652349`. Installation uses the built package without sibling source imports.
