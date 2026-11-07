import { defineLocalTheme } from 'reactive-md/sdk';

/** A token-only theme for testing shared controls and portable export. */
export const controlsTheme = defineLocalTheme({
  id: 'demo/forest', name: 'forest', version: '1.0.0',
  css: [{ id: 'demo/forest.css', css: `
[data-rmd-theme="forest"][data-color-scheme="light"] {
  --surface: #f1faf6;
  --line-strong: #9ac3ae;
  --accent: #226448;
  --accent-hover: #184c35;
  --accent-text: #226448;
  --accent-ink: #ffffff;
  --radius-field: 14px;
}
[data-rmd-theme="forest"][data-color-scheme="dark"] {
  --surface: #142821;
  --line-strong: #3b6554;
  --accent: #7bc5a1;
  --accent-hover: #a3d9bc;
  --accent-text: #7bc5a1;
  --accent-ink: #123124;
  --radius-field: 14px;
}` }],
});
