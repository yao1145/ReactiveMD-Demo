# Source

The Playground source is grouped by feature. Full guidance: [source layout (English)](../docs/source-layout-en.md) · [源码结构（中文）](../docs/source-layout-ch.md).

```text
src/
  main.tsx               Playground entry (index.html)
  embed.tsx              Embed entry (embed.html)
  reactive-md-vite.d.ts  Vite type declarations
  app/                   shell, layout and global styles
  documents/             library, tree and outline
  compilation/           worker compilation and preview sessions
  images/                image assets, storage and panel
  export/                export dialog and shareable HTML
  content/               example catalog, guide renderer and code styles
  ui/                    icons, copy and shared hooks
  settings/              HTML capability options and controls
  developer/             developer tools
```

A feature change goes in the group that owns it, with its CSS beside the module. Cross-group imports use direct relative paths; the source has no barrels.
