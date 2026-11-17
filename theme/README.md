# Local themes

**English** · [中文](README-ch.md)

This directory is the site's theme runtime. `reactiveMd()` in `vite.config.ts` discovers `theme/<name>/`, inlines its CSS and registers it with the compiler, so the editor, preview and offline export render these files directly.

The `reactive-md-sci-fi-theme` tarball in `vendor/` is a compatibility fixture for tests. The site never imports it, and `src/main.tsx` must not: [vendor/README.md](../vendor/README.md) records the fixture.

| Directory | Theme name | Files |
| --- | --- | --- |
| `sci-fi/` | `sci-fi` | `theme.json` identity (`reactive-md/theme-sci-fi`, `sci-fi`, `1.0.0`), `theme.css` entry with `@import` lines, `assets/tokens.css`, `assets/components.css`, `assets/notch.css`, its own `README.md` |

## Select a theme

A document declares the theme by the name in `theme.json`:

```markdown
<theme name="sci-fi">
```

Compilation resolves the name against the discovered themes and marks the output container with `data-rmd-theme="sci-fi"`. A document without the declaration keeps the default theme. The light scheme is the default; `data-color-scheme="dark"` switches to the dark tokens in `assets/tokens.css`.

## Add a theme

1. Create `theme/<name>/theme.json` with `id`, `name` and `version`. Documents use `name`.
2. Create `theme.css` as the entry stylesheet and import its parts with relative `@import` lines.
3. Reference images and fonts with relative `url()` paths. Discovery inlines them into the bundle as data URLs, so an exported document stays offline.
4. Declare `<theme name="<name>">` in an example and run `npm test`.

Discovery inlines local `@import` targets and `url()` assets, so this directory is the only source the build reads. `tests/local-theme-directory.test.ts` checks the discovered identity, the single `directory-theme/sci-fi.css` resource and the inlined CSS. `tests/directory-discovery.test.ts` covers the installed fixture path, which copies the tarball's CSS into a temporary consumer theme.

To reuse a theme, copy its directory to `theme/<name>/` in the other project. Change `id` and `name` in `theme.json` when the copy must coexist with this one.
