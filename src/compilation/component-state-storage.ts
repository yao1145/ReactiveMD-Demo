import type { LocalDocument, LocalNode } from 'reactive-md';

/**
 * Demo-owned sidecar storage for the engine component-state protocol. The demo
 * persists the snapshot explicitly; the engine never touches browser storage.
 */
const STORAGE_PREFIX = 'reactive-md:component-state:';

/** Components that expose saveable progress through `useComponentState`. */
const SAVABLE_COMPONENTS = new Set(['game-2048', 'tetris']);

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function componentStateStorageKey(documentId: string): string {
  return `${STORAGE_PREFIX}${documentId}`;
}

/** Parse a saved sidecar; corrupt or unavailable storage behaves like no state. */
export function readSavedComponentState(documentId: string): unknown {
  try {
    const raw = browserStorage()?.getItem(componentStateStorageKey(documentId));
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writeSavedComponentState(documentId: string, state: unknown): boolean {
  try {
    const storage = browserStorage();
    if (!storage) return false;
    storage.setItem(componentStateStorageKey(documentId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedComponentState(documentId: string): void {
  try {
    browserStorage()?.removeItem(componentStateStorageKey(documentId));
  } catch {
    /* optional storage */
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
    (node) => node.name !== undefined && SAVABLE_COMPONENTS.has(node.name),
  );
}

export function hasSavableComponents(document: LocalDocument): boolean {
  return savableComponentNodes(document).length > 0;
}
