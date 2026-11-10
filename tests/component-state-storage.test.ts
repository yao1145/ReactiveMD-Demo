import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileLocal } from 'reactive-md';
import { createReactHost } from 'reactive-md/react';
import tetrisPackage from '../plugin/tetris';
import game2048Package from '../plugin/game-2048';
import { componentStateStorageKey, createSavedComponentStateStorage, savableComponentNodes } from '../src/compilation/component-state-storage';

const host = createReactHost({ packages: [tetrisPackage, game2048Package] });

describe('authored game progress policy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the existing document-scoped storage key', () => {
    const saved = '{"format":"reactive-md-component-state/v1","records":{}}';
    const getItem = vi.fn(() => saved);
    vi.stubGlobal('localStorage', { getItem, setItem: vi.fn(), removeItem: vi.fn() });
    const storage = createSavedComponentStateStorage('document-a');
    expect(storage?.key).toBe(componentStateStorageKey('document-a'));
    expect(storage?.read()).toBe(saved);
    expect(getItem).toHaveBeenCalledWith('reactive-md:component-state:document-a');
  });

  it('keeps progress in memory when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(createSavedComponentStateStorage('document-a')).toBeUndefined();
  });

  it('saves progress by default for both games', () => {
    for (const pkg of [tetrisPackage, game2048Package]) {
      expect(pkg.definition.props['save-progress']?.default).toBe(true);
    }
    const result = compileLocal('<tetris>\n\n<game-2048>', host.compileOptions);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(savableComponentNodes(result.document).map(node => node.name)).toEqual(['tetris', 'game-2048']);
  });

  it('lets the author disable saving per game', () => {
    const result = compileLocal('<tetris save-progress="false">\n\n<game-2048 save-progress="true">', host.compileOptions);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(savableComponentNodes(result.document).map(node => node.name)).toEqual(['game-2048']);
  });
});
