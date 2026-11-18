import { describe, expect, it } from 'vitest';
import { compileLocal, createLocalStateFile } from 'reactive-md';
import {
  buildShareableHtml,
  documentUsesExtensionBundle,
  resolveShareableAssetPlan,
} from '../src/export/export-html';
import { getDemoHost } from '../src/settings/component-mode';

function compile(source: string, componentMode: 'default' | 'minimal') {
  const { compileOptions } = getDemoHost(componentMode);
  const compiled = compileLocal(source, compileOptions);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return compiled.document;
}

describe('Demo component profiles', () => {
  it('switches the builtin registry while retaining discovered packages', () => {
    const full = getDemoHost('default');
    const minimal = getDemoHost('minimal');
    expect(full.config.registry.some(item => item.name === 'counter')).toBe(true);
    expect(minimal.config.registry.some(item => item.name === 'counter')).toBe(false);
    expect(minimal.config.registry.map(item => item.name)).toEqual(expect.arrayContaining(['jump', 'anchor']));
    expect(minimal.config.components.length).toBeGreaterThan(0);
    expect(minimal.config.components).toEqual(full.config.components);
    expect(minimal.config.themes).toEqual(full.config.themes);
  });

  it('routes preparation and the build through the same export payload', () => {
    const plain = compile('# Plain\n\n<number bind="qty" label="Quantity" initial="2">', 'default');
    const minimal = compile('# Minimal\n\n<number bind="qty" label="Quantity" initial="2">', 'minimal');
    // Discovered themes are not guaranteed in every test host; only assert on
    // one when the installed configuration actually carries it.
    const customTheme = getDemoHost('default').config.themes.find(theme => theme.name !== 'default');

    expect(documentUsesExtensionBundle(plain, 'default')).toBe(false);
    expect(documentUsesExtensionBundle(minimal, 'minimal')).toBe(true);
    // No compiled document yet: fall back to the mode-level default.
    expect(documentUsesExtensionBundle(null, 'default')).toBe(false);
    if (customTheme) {
      const themed = compile(`<theme name="${customTheme.name}">\n\n# Themed`, 'default');
      expect(documentUsesExtensionBundle(themed, 'default')).toBe(true);
      expect(resolveShareableAssetPlan('interactive', 'default', true))
        .toEqual({ styles: 'base', runtime: false });
    }

    expect(resolveShareableAssetPlan('interactive', 'default', documentUsesExtensionBundle(plain, 'default')))
      .toEqual({ styles: 'base', runtime: true });
    expect(resolveShareableAssetPlan('interactive', 'minimal', documentUsesExtensionBundle(minimal, 'minimal')))
      .toEqual({ styles: 'minimal', runtime: false });
    // Static routes never need the runtime or a replay bundle.
    expect(resolveShareableAssetPlan('static', 'default', true))
      .toEqual({ styles: 'base', runtime: false });
  });

  it('exports the selected minimal registry and its state in both HTML modes', async () => {
    const source = '# Budget\n\n<jump to="total">Show total</jump>\n\n<number bind="qty" label="Quantity" initial="2">\n\n<anchor id="total">\n\nTotal {{ qty * 50 }}\n\n<counter label="Optional">';
    const { compileOptions } = getDemoHost('minimal');
    const compiled = compileLocal(source, compileOptions);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const state = createLocalStateFile(compiled.document, { qty: 3 });
    for (const mode of ['static', 'interactive'] as const) {
      const result = await buildShareableHtml({ source, state, mode, compileOptions, componentMode: 'minimal' });
      const body = result.html.split('</head>')[1];
      expect(body).toContain('150');
      expect(body).toContain('local-jump-static');
      expect(body).toContain('data-local-anchor');
      expect(body).toContain('&lt;counter');
      expect(body).not.toMatch(/class="[^"]*local-counter/);
      expect(body.includes('data-reactive-md-auto')).toBe(mode === 'interactive');
    }
  }, 30000);
});
