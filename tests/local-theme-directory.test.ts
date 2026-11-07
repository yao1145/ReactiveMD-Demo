import { describe, expect, it } from 'vitest';
import { createServer } from 'vite';
import { reactiveMd } from 'reactive-md/vite';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repository = fileURLToPath(new URL('../', import.meta.url));
const themeDirectory = path.join(repository, 'theme', 'sci-fi');

interface DiscoveredTheme {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly protocol: string;
  readonly colorSchemes: readonly string[];
}

interface HostSnapshot {
  readonly config: { readonly themes: readonly DiscoveredTheme[] };
  readonly resources: readonly { readonly id: string; readonly css: string }[];
  readonly css: string;
}

describe('sci-fi local theme directory', () => {
  it('registers the copied directory as the only theme resource and inlines its CSS', async () => {
    const artifacts = path.join(repository, 'artifacts', 'local-theme-directory');
    await mkdir(artifacts, { recursive: true });
    const root = await mkdtemp(path.join(artifacts, 'consumer-'));
    await mkdir(path.join(root, 'theme'), { recursive: true });
    await cp(themeDirectory, path.join(root, 'theme', 'sci-fi'), { recursive: true });
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [reactiveMd()],
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
    });
    try {
      const { host } = await server.ssrLoadModule('virtual:reactive-md/host') as { host: HostSnapshot };
      expect(host.config.themes).toHaveLength(1);
      const [theme] = host.config.themes;
      expect({
        id: theme.id,
        name: theme.name,
        version: theme.version,
        protocol: theme.protocol,
        colorSchemes: theme.colorSchemes,
      }).toEqual({
        id: 'reactive-md/theme-sci-fi',
        name: 'sci-fi',
        version: '1.0.0',
        protocol: 'reactive-md-theme-1',
        colorSchemes: ['light', 'dark'],
      });
      expect(host.resources.map(resource => resource.id)).toEqual(['directory-theme/sci-fi.css']);
      expect(host.css).not.toContain('@import');
      expect(host.css).toContain('--sf-neutral-0: #ffffff;');
      expect(host.css).toContain('--control-height: 34px;');
      expect(host.css).toContain('[data-rmd-theme="sci-fi"][data-color-scheme="dark"]');
      expect(host.css).toContain('[data-rmd-theme="sci-fi"].md-document');
      expect(host.css).toContain('[data-rmd-theme="sci-fi"] .local-panel');
      expect(host.css).toContain('[data-rmd-theme="sci-fi"] .md-button');
      expect(host.css).toContain('[data-rmd-theme="sci-fi"] .md-text-input');
    } finally {
      await server.close();
      if (path.dirname(path.resolve(root)) !== path.resolve(artifacts)) throw new Error('Unexpected theme test cleanup path.');
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);

  it('keeps the entry stylesheet local and out of the application imports', async () => {
    const metadata = JSON.parse(await readFile(path.join(themeDirectory, 'theme.json'), 'utf8'));
    expect(metadata).toEqual({
      id: 'reactive-md/theme-sci-fi',
      name: 'sci-fi',
      version: '1.0.0',
    });
    const entry = await readFile(path.join(themeDirectory, 'theme.css'), 'utf8');
    expect(entry).toContain("@import './assets/tokens.css';");
    expect(entry).toContain("@import './assets/components.css';");
    const main = await readFile(path.join(repository, 'src', 'main.tsx'), 'utf8');
    expect(main).not.toContain('reactive-md-sci-fi-theme');
    expect(main).toContain("import 'reactive-md/styles.css';");
    expect(main).toContain("import 'reactive-md-editor/styles.css';");
  });
});
