import type { LocalDocument, LocalNode } from 'reactive-md';
import { createLocalBrowserStateStorage } from 'reactive-md/runtime/browser';

/**
 * The host selects browser storage; components decide whether to save progress.
 */
const STORAGE_PREFIX = 'reactive-md:component-state:';

/** Components that expose saveable progress through `useComponentState`. */
const SAVABLE_COMPONENTS = new Set(['game-2048', 'tetris']);

/**
 * Game saves arrive on every tick or move. Memory stays current; browser
 * writes are coalesced so JSON serialization and `localStorage` stay off the
 * hot path.
 */
export const COMPONENT_STATE_WRITE_DELAY = 200;

export function componentStateStorageKey(documentId: string): string {
  return `${STORAGE_PREFIX}${documentId}`;
}

/** Unavailable storage keeps the game usable with in-memory state. */
export function createSavedComponentStateStorage(documentId: string) {
  try {
    return createLocalBrowserStateStorage({ documentId, keyPrefix: STORAGE_PREFIX });
  } catch {
    return undefined;
  }
}

function flatten(nodes: readonly LocalNode[], result: LocalNode[] = []): LocalNode[] {
  for (const node of nodes) {
    result.push(node);
    if (node.children) flatten(node.children, result);
  }
  return result;
}

/** Current document component nodes whose progress the demo can save. */
export function savableComponentNodes(document: LocalDocument): LocalNode[] {
  return flatten(document.nodes).filter(
    (node) => node.name !== undefined && SAVABLE_COMPONENTS.has(node.name)
      && node.attrs?.['save-progress'] !== 'false',
  );
}

export function hasSavableComponents(document: LocalDocument): boolean {
  return savableComponentNodes(document).length > 0;
}
