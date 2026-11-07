import { describe, expect, it } from 'vitest';
import { compileLocal, createLocalRuntime } from 'reactive-md';
import { renderLocalStaticDocument } from 'reactive-md/react/server';
import { createServer } from 'vite';
import { reactiveMd } from 'reactive-md/vite';
import { fileURLToPath } from 'node:url';
import tetrisEntry from '../plugin/tetris';
import game2048Entry from '../plugin/game-2048';

describe('local game directories', () => {
  it('declares implementations without hand-written style resources', () => {
    expect(tetrisEntry.definition.id).toBe('example/tetris');
    expect(tetrisEntry.components.map(component => component.definition.name)).toEqual(['tetris']);
    expect(tetrisEntry.resources).toEqual([]);
    expect(tetrisEntry.components[0].definition.styles).toBeUndefined();

    expect(game2048Entry.definition.id).toBe('example/game-2048');
    expect(game2048Entry.components.map(component => component.definition.name)).toEqual(['game-2048']);
    expect(game2048Entry.resources).toEqual([]);
    expect(game2048Entry.components[0].definition.styles).toBeUndefined();
  });

  it('collects component.css through the directory host and renders both games', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [reactiveMd()],
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
    });
    let runtime: ReturnType<typeof createLocalRuntime> | undefined;
    try {
      const { host } = (await server.ssrLoadModule('virtual:reactive-md/host')) as { host: any };
      expect(host.config.components.map((item: { name: string }) => item.name))
        .toEqual(expect.arrayContaining(['tetris', 'game-2048']));
      expect(host.resources.map((item: { id: string }) => item.id))
        .toEqual(expect.arrayContaining(['directory-plugin/tetris.css', 'directory-plugin/game-2048.css']));
      expect(host.css).toContain('.rmd-tetris');
      expect(host.css).toContain('.rmd-2048');
      expect(host.notices.map((item: { text?: string }) => item.text ?? '').join('\n'))
        .toContain('original code written for this example');

      const config = structuredClone(host.config);
      const compiled = compileLocal('<tetris width="8">\n\n<game-2048 size="4">', { config });
      if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
      runtime = createLocalRuntime(compiled.document);
      const rendered = renderLocalStaticDocument({
        document: compiled.document,
        runtime,
        reactConfig: host.reactConfig,
        resources: host.resources,
      });
      if (!rendered.ok) throw new Error(JSON.stringify(rendered.diagnostics));
      expect(rendered.markup).toContain('data-tetris-static');
      expect(rendered.markup).toContain('data-game-2048-static');
    } finally {
      runtime?.dispose();
      await server.close();
    }
  }, 120_000);
});
