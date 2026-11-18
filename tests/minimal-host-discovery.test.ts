import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createServer, resolveConfig, type ViteDevServer } from 'vite';
import { reactiveMd } from 'reactive-md/vite';

const PRESET_ID = 'fixture/third-party';

function presetEntry(folder: string): string {
  return `import { defineReactComponent, defineReactPreset } from 'reactive-md/react';
import { defineLocalComponent, defineLocalPreset } from 'reactive-md/sdk';

const definition = defineLocalComponent({
  id: '${PRESET_ID}/${folder}', name: '${folder}', version: '1.0.0',
  protocol: 'reactive-md-component/v1', form: 'leaf', props: {},
  capabilities: { interactive: true, static: true, ssr: true, offline: true },
});
export default defineReactPreset({
  protocol: 'reactive-md-react-preset/v1',
  preset: defineLocalPreset({
    protocol: 'reactive-md-preset/v1', id: '${PRESET_ID}', version: '1.0.0', components: [definition],
  }),
  components: [defineReactComponent(definition, { render: () => null })],
});`;
}

async function fixture(): Promise<string> {
  const parent = path.resolve('artifacts/minimal-host-discovery');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'consumer-'));
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await mkdir(path.join(root, 'plugin', 'third-party'), { recursive: true });
  await writeFile(path.join(root, 'plugin', 'third-party', 'index.ts'), presetEntry('third-party'));
  await mkdir(path.join(root, 'theme', 'paper'), { recursive: true });
  await writeFile(path.join(root, 'theme', 'paper', 'theme.css'), '.paper { color: black; }');
  return root;
}

async function withServer(root: string, run: (server: Awaited<ReturnType<typeof createServer>>) => Promise<void>) {
  const server = await createServer({
    root, configFile: false, logLevel: 'silent',
    plugins: [reactiveMd({ includeMinimal: true })],
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true },
  });
  try { await run(server); } finally { await server.close(); }
}

describe('minimal host from one discovery snapshot', () => {
  it('keeps third-party preset identity, dependencies, order and resources in both modes', async () => {
    const root = await fixture();
    try {
      await withServer(root, async (server) => {
        const full = await server.ssrLoadModule('virtual:reactive-md/host');
        const minimal = await server.ssrLoadModule('virtual:reactive-md-minimal-host');
        for (const view of [full, minimal]) {
          const names = view.host.config.registry.map((item: { name: string }) => item.name);
          expect(names).toContain('third-party');
          expect(view.host.config.presets.map((item: { id: string }) => item.id))
            .toContain(PRESET_ID);
          expect(view.host.config.themes.map((item: { name: string }) => item.name)).toEqual(['paper']);
        }
        // The mode swaps the base preset only; discovered identity is unchanged.
        expect(minimal.host.config.presets.map((item: { id: string }) => item.id))
          .toEqual([PRESET_ID, 'reactive-md/minimal']);
        expect(full.host.config.presets.map((item: { id: string }) => item.id))
          .toEqual([PRESET_ID, 'reactive-md/default']);
        expect(minimal.host.config.registry.map((item: { name: string }) => item.name))
          .not.toContain('counter');
        expect(full.host.config.registry.map((item: { name: string }) => item.name))
          .toContain('counter');
        expect(minimal.host.config.key).not.toBe(full.host.config.key);

        const fullBundle = (await server.ssrLoadModule('virtual:reactive-md/bundle')).default;
        const minimalBundle = (await server.ssrLoadModule('virtual:reactive-md-minimal-bundle')).default;
        expect(minimalBundle.error).toBeUndefined();
        expect(minimalBundle.configKey).toBe(minimal.host.config.key);
        expect(fullBundle.configKey).toBe(full.host.config.key);
        expect(minimalBundle.manifest.components.map((item: { name: string }) => item.name))
          .toEqual(minimal.host.config.registry.map((item: { name: string }) => item.name));
      });
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 120_000);

  it('invalidates the minimal virtual modules when an implementation changes', async () => {
    const root = await fixture();
    try {
      const plugin = reactiveMd({ includeMinimal: true });
      await resolveConfig({ root, configFile: false, logLevel: 'silent', plugins: [plugin] }, 'serve');
      // Prime the snapshot so the plugin knows the current discovery files.
      const load = plugin.load as (this: { addWatchFile(file: string): void }, id: string) => Promise<string | null>;
      await load.call({ addWatchFile: () => {} }, '\0virtual:reactive-md-minimal-host');

      const invalidated: string[] = [];
      const send = vi.fn();
      const server = {
        ws: { send },
        moduleGraph: {
          getModuleById: (id: string) => ({ id }),
          invalidateModule: (module: { id: string }) => { invalidated.push(module.id); },
        },
        config: { logger: { error: vi.fn() } },
      } as unknown as ViteDevServer;
      const handle = plugin.handleHotUpdate as unknown as (context: never) => Promise<unknown>;
      await handle.call({}, { file: path.join(root, 'plugin', 'third-party', 'index.ts'), server, modules: [], timestamp: 0, read: async () => '' } as never);

      expect(send).toHaveBeenCalledWith({ type: 'full-reload' });
      expect(invalidated).toEqual(expect.arrayContaining([
        '\0virtual:reactive-md/host',
        '\0virtual:reactive-md/registration',
        '\0virtual:reactive-md-minimal-host',
        '\0virtual:reactive-md/registration-minimal',
        '\0virtual:reactive-md-minimal-bundle',
      ]));
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 60_000);
});
