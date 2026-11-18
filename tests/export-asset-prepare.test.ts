import { beforeEach, describe, expect, it, vi } from 'vitest';

const loads: string[] = [];

function asset(name: string, value: unknown) {
  loads.push(name);
  return { default: value };
}

function loadModule() {
  return import('../src/export/export-html');
}

describe('export asset preparation', () => {
  beforeEach(() => {
    vi.resetModules();
    loads.length = 0;
    vi.doMock('virtual:reactive-md-assets/base-css', () => asset('base-css', '.base{}'));
    vi.doMock('virtual:reactive-md-assets/minimal-css', () => asset('minimal-css', '.minimal{}'));
    vi.doMock('virtual:reactive-md-assets/print-css', () => asset('print-css', '@media print{}'));
    vi.doMock('virtual:reactive-md-assets/notices', () => asset('notices', 'notices'));
    vi.doMock('virtual:reactive-md-assets/package-json', () => asset('package-json', JSON.stringify({ version: '9.9.9' })));
    vi.doMock('virtual:reactive-md-assets/runtime', () => asset('runtime', '/* standalone runtime */'));
    vi.doMock('virtual:reactive-md-minimal-bundle', () => asset('minimal-bundle', { script: '/* minimal bundle */' }));
    vi.doMock('virtual:reactive-md/bundle', () => asset('default-bundle', { script: '/* default bundle */' }));
  });

  it('routes each export to one stylesheet and one runtime payload', async () => {
    const { resolveShareableAssetPlan } = await loadModule();

    expect(resolveShareableAssetPlan('interactive', 'default', false))
      .toEqual({ styles: 'base', runtime: true });
    expect(resolveShareableAssetPlan('static', 'default', false))
      .toEqual({ styles: 'base', runtime: false });
    expect(resolveShareableAssetPlan('interactive', 'minimal'))
      .toEqual({ styles: 'minimal', runtime: false });
    expect(resolveShareableAssetPlan('interactive', 'default', true))
      .toEqual({ styles: 'base', runtime: false });
  });

  it('never loads the full stylesheet or baseline runtime for a minimal export', async () => {
    const { prepareShareableHtmlAssets } = await loadModule();

    const prepared = await prepareShareableHtmlAssets('interactive', 'minimal', { documentReady: true });

    expect(prepared.version).toBe('9.9.9');
    expect(loads).toContain('minimal-css');
    expect(loads).toContain('minimal-bundle');
    expect(loads).not.toContain('base-css');
    expect(loads).not.toContain('runtime');
  });

  it('does not warm a static export with the standalone runtime', async () => {
    const { prepareShareableHtmlAssets } = await loadModule();

    await prepareShareableHtmlAssets('static', 'default', { documentReady: true });

    expect(loads).toContain('base-css');
    expect(loads).not.toContain('runtime');
  });

  it('prepares only metadata until the source compiles', async () => {
    const { prepareShareableHtmlAssets } = await loadModule();

    const prepared = await prepareShareableHtmlAssets('interactive', 'default', { documentReady: false });

    expect(prepared.version).toBe('9.9.9');
    expect(loads).toEqual(['package-json']);
  });

  it('loads each route payload once across repeated preparation', async () => {
    const { prepareShareableHtmlAssets } = await loadModule();

    await prepareShareableHtmlAssets('interactive', 'default', { documentReady: true });
    await prepareShareableHtmlAssets('interactive', 'default', { documentReady: true });
    await prepareShareableHtmlAssets('static', 'default', { documentReady: true });

    expect(loads.filter(name => name === 'runtime')).toHaveLength(1);
    expect(loads.filter(name => name === 'base-css')).toHaveLength(1);
  });
});
