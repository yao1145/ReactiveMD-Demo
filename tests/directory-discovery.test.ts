import { describe, expect, it } from 'vitest';
import { compileLocal, createLocalRuntime } from 'reactive-md';
import { createLocalComponentCatalog } from 'reactive-md/authoring';
import { renderLocalStaticDocument } from 'reactive-md/react/server';
import { createServer } from 'vite';
import { reactiveMd } from 'reactive-md/vite';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const source = '<theme name="sci-fi">\n\n<tetris width="8">\n\n<game-2048 size="4">';
describe('directory-only installed consumer', () => {
  it('adds two installed packages and a CSS theme without a registration module', async () => {
    const artifacts = path.resolve('artifacts/directory-consumer');
    await mkdir(artifacts, { recursive: true });
    const root = await mkdtemp(path.join(artifacts, 'consumer-'));
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    const server = await createServer({ root, configFile: false, logLevel: 'silent', plugins: [reactiveMd()], server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
    try {
      const empty = await server.ssrLoadModule('virtual:reactive-md/host');
      expect(empty.host.config.components).toEqual([]);
    } finally { await server.close(); }
    for (const [directory, packageName, exportName] of [['tetris', 'reactive-md-tetris-package', 'tetrisPackage'], ['game-2048', 'reactive-md-game-2048-package', 'game2048Package']]) {
      await mkdir(path.join(root, 'plugin', directory), { recursive: true });
      await writeFile(path.join(root, 'plugin', directory, 'index.ts'), `export { ${exportName} as default } from '${packageName}/react';\n`);
    }
    const themeDir = path.join(root, 'theme', 'sci-fi');
    await mkdir(themeDir, { recursive: true });
    const css = await Promise.all(['tokens.css', 'components.css'].map(entry => readFile(require.resolve(`reactive-md-sci-fi-theme/${entry}`), 'utf8')));
    const baseCss = await readFile(require.resolve('reactive-md/styles.css'), 'utf8');
    const font = baseCss.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/);
    if (!font) throw new Error('The installed engine must carry an offline WOFF2 fixture.');
    await mkdir(path.join(themeDir, 'assets'), { recursive: true });
    await writeFile(path.join(themeDir, 'assets/font.woff2'), Buffer.from(font[1], 'base64'));
    await writeFile(path.join(themeDir, 'assets/marker.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="red"/></svg>');
    const assetCss = '@font-face { font-family: "Consumer Font"; src: url("./assets/font.woff2") format("woff2"); }\n[data-rmd-theme="sci-fi"] { --font-sans: "Consumer Font", sans-serif; font-family: "Consumer Font", sans-serif; background-image: url("./assets/marker.svg"); }';
    await writeFile(path.join(themeDir, 'theme.css'), css.join('\n') + '\n' + assetCss);
    const populated = await createServer({ root, configFile: false, logLevel: 'silent', plugins: [reactiveMd()], server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
    try {
      const { host } = await populated.ssrLoadModule('virtual:reactive-md/host');
      expect(host.config.components.map((item: {name: string}) => item.name)).toEqual(['game-2048', 'tetris']);
      const workerConfig = structuredClone(host.config);
      expect(createLocalComponentCatalog(workerConfig).map(item => item.name)).toEqual(expect.arrayContaining(['tetris', 'game-2048']));
      const compiled = compileLocal(source, { config: workerConfig });
      if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
      const runtime = createLocalRuntime(compiled.document);
      try {
        const rendered = renderLocalStaticDocument({ document: compiled.document, runtime, reactConfig: host.reactConfig, resources: host.resources });
        if (!rendered.ok) throw new Error(JSON.stringify(rendered.diagnostics));
        expect(rendered.markup).toContain('data-tetris-static');
        expect(rendered.markup).toContain('data-game-2048-static');
        expect(host.css).toContain('[data-rmd-theme="sci-fi"]');
      } finally { runtime.dispose(); }
      const { default: bundle } = await populated.ssrLoadModule('virtual:reactive-md/bundle');
      expect(bundle.error).toBeUndefined();
      expect(bundle.configKey).toBe(host.config.key);
      expect(bundle.manifest.components.map((item: { name: string }) => item.name)).toEqual(['game-2048', 'tetris']);
      expect(bundle.manifest.themes.map((item: { name: string }) => item.name)).toEqual(['sci-fi']);
      expect(bundle.css).toBe(host.css);
      expect(bundle.css).toContain('data:font/woff2;base64,');
      expect(bundle.css).toContain('data:image/svg+xml;base64,');
      expect(bundle.css).toContain('rmd-theme-sci-fi-font-');
      expect(bundle.assets.map((asset: { path: string }) => asset.path)).toEqual(expect.arrayContaining(['theme/sci-fi/assets/font.woff2', 'theme/sci-fi/assets/marker.svg']));
      expect(bundle.manifest.inlinedAssets).toEqual(bundle.assets);
      expect(bundle.script).toContain('data-tetris');
      expect(bundle.script).toContain('data-game-2048');
    } finally { await populated.close(); }
  }, 120_000);
});
