# sci-fi theme

Local source for the `sci-fi` theme. Vite discovers this directory through
`reactiveMd()`; the theme works without installing a theme package.

| File | Purpose |
| --- | --- |
| `theme.css` | Entry stylesheet. Imports the two asset files below. |
| `assets/tokens.css` | Color, type, spacing, radius and control tokens for light and dark modes. |
| `assets/components.css` | Document, panel, table, form, navigation, code and print styles. |
| `theme.json` | Discovery identity: `id`, `name` and `version`. |

## Select the theme

Declare it at the top of a document:

```markdown
<theme name="sci-fi">
```

The light scheme is the default. A `data-color-scheme="dark"` attribute on the
themed container switches to the dark tokens. Both schemes live in
`assets/tokens.css`.

## Edit the theme

Edit `theme.css` or the files under `assets/`. Discovery inlines local
`@import` targets and `url()` assets, so this directory is the only source the
build reads. Add assets beside the CSS and reference them with relative paths.

To reuse the theme in another project, copy the directory to
`theme/<name>/` there. Change `id` and `name` in `theme.json` when the copy must
coexist with this one; otherwise the discovered identity stays
`reactive-md/theme-sci-fi` / `sci-fi` / `1.0.0`.

The CSS is derived from `reactive-md-sci-fi-theme@1.0.0` public entries (MIT).
