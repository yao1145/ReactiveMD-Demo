import {
  activeDocuments,
  documentInTrash,
  folderInTrash,
  normalizeDocumentName,
  normalizeFolderName,
  parseLibraryText,
  serializeLibrary,
  type LibraryDocument,
  type LibraryFolder,
  type LibraryLoadResult,
  type LibraryProblem,
  type LibraryState,
} from './document-library-codec';

const DEFAULT_SAVE_DELAY = 500;

export type LibraryMode = 'example' | 'documents';
export type LibrarySaveStatus = 'saved' | 'saving' | 'failed';

export {
  activeDocuments,
  activeFolders,
  documentInTrash,
  folderInTrash,
  normalizeDocumentName,
  normalizeFolderName,
  parseLibraryText,
  readStoredLibrary,
  serializeLibrary,
  trashedRoots,
  LIBRARY_VERSION,
  MAX_DOCUMENT_NAME_LENGTH,
  MAX_FOLDER_NAME_LENGTH,
} from './document-library-codec';
export type { LibraryDocument, LibraryFolder, LibraryLoadResult, LibraryProblem, LibraryState } from './document-library-codec';

export const LIBRARY_STORAGE_KEY = 'reactive-md:documents:v1';
/** Remembers whether the Playground was last showing the personal library. */
export const LIBRARY_MODE_STORAGE_KEY = 'reactive-md:documents:mode';

function emptyState(): LibraryState {
  return { documents: [], folders: [], selectedId: null };
}

export interface LibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LibrarySnapshot extends LibraryState {
  saveStatus: LibrarySaveStatus;
  problem: LibraryProblem;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export interface DocumentLibraryOptions {
  /** Returns the storage backend; may throw when the browser blocks it. */
  storage?: () => LibraryStorage | undefined;
  now?: () => number;
  createId?: () => string;
  saveDelay?: number;
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

/**
 * Pick a readable file stem for exports. Names stay in their original
 * language; only characters that browsers or file systems reject are replaced.
 */
export function documentFileStem(name: string): string {
  const stem = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '');
  return stem || 'document';
}

/** Return `desired`, or the first free `desired (2)`, `desired (3)` variant. */
export function uniqueDocumentName(existing: readonly string[], desired: string): string {
  const base = normalizeDocumentName(desired) ?? 'Document';
  if (!existing.includes(base)) return base;
  let suffix = 2;
  while (existing.includes(`${base} (${suffix})`)) suffix += 1;
  return `${base} (${suffix})`;
}

function defaultCreateId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class DocumentLibrary {
  private documents: readonly LibraryDocument[];
  private folders: readonly LibraryFolder[];
  private selectedId: string | null;
  private saveStatus: LibrarySaveStatus;
  private problem: LibraryProblem;
  private dirty = false;
  private timer: TimerHandle | null = null;
  private listeners = new Set<() => void>();
  private snapshot: LibrarySnapshot;

  private readonly storage: () => LibraryStorage | undefined;
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly saveDelay: number;
  private readonly setTimer: (callback: () => void, delay: number) => TimerHandle;
  private readonly clearTimer: (handle: TimerHandle) => void;

  constructor(options: DocumentLibraryOptions = {}) {
    this.storage = options.storage ?? (() => undefined);
    this.now = options.now ?? (() => Date.now());
    this.createId = options.createId ?? defaultCreateId;
    this.saveDelay = Math.max(0, options.saveDelay ?? DEFAULT_SAVE_DELAY);
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle));

    const loaded = this.load();
    this.documents = loaded.documents;
    this.folders = loaded.folders;
    this.selectedId = loaded.selectedId;
    this.problem = loaded.problem;
    this.saveStatus = loaded.problem === 'unavailable' ? 'failed' : 'saved';
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): LibrarySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getDocument(id: string | null): LibraryDocument | null {
    if (!id) return null;
    return this.documents.find((document) => document.id === id) ?? null;
  }

  getFolder(id: string | null): LibraryFolder | null {
    if (!id) return null;
    return this.folders.find((folder) => folder.id === id) ?? null;
  }

  /** Create a named document, persist it and make it the current document. */
  createDocument(input: { name: string; source?: string; folderId?: string | null }): LibraryDocument | null {
    const name = normalizeDocumentName(input.name);
    if (!name) return null;
    const folderId = input.folderId ?? null;
    if (folderId) {
      const folder = this.getFolder(folderId);
      if (!folder || folderInTrash(folder, this.folders)) return null;
    }
    this.flush();
    const document: LibraryDocument = {
      id: this.makeId('document'),
      name,
      source: input.source ?? '',
      folderId,
      trashedAt: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.documents = [...this.documents, document];
    this.selectedId = document.id;
    this.dirty = true;
    this.write();
    return document;
  }

  /** Create a folder inside `parentId` (or at the root). */
  createFolder(input: { name: string; parentId?: string | null }): LibraryFolder | null {
    const parentId = input.parentId ?? null;
    if (parentId) {
      const parent = this.getFolder(parentId);
      if (!parent || folderInTrash(parent, this.folders)) return null;
    }
    const siblings = this.folders.filter(folder => folder.parentId === parentId).map(folder => folder.name);
    const desired = normalizeFolderName(input.name) ?? 'Folder';
    const name = uniqueDocumentName(siblings, desired);
    this.flush();
    const folder: LibraryFolder = {
      id: this.makeId('folder'),
      name,
      parentId,
      trashedAt: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.folders = [...this.folders, folder];
    this.dirty = true;
    this.write();
    return folder;
  }

  /** Select a document. Pending edits of the previous document are flushed. */
  select(id: string): LibraryDocument | null {
    const document = this.getDocument(id);
    if (!document) return null;
    if (this.selectedId === id) return document;
    this.flush();
    this.selectedId = id;
    this.dirty = true;
    this.write();
    return document;
  }

  rename(id: string, name: string): boolean {
    const normalized = normalizeDocumentName(name);
    const document = this.getDocument(id);
    if (!document || !normalized) return false;
    if (document.name === normalized) return true;
    this.documents = this.documents.map((item) => (
      item.id === id ? { ...item, name: normalized, updatedAt: this.now() } : item
    ));
    this.schedule();
    return true;
  }

  renameFolder(id: string, name: string): boolean {
    const normalized = normalizeFolderName(name);
    const folder = this.getFolder(id);
    if (!folder || !normalized) return false;
    if (folder.name === normalized) return true;
    this.folders = this.folders.map((item) => (
      item.id === id ? { ...item, name: normalized, updatedAt: this.now() } : item
    ));
    this.schedule();
    return true;
  }

  /** Move a document into `folderId`, or to the root when it is null. */
  moveDocument(id: string, folderId: string | null): boolean {
    const document = this.getDocument(id);
    if (!document || document.folderId === folderId) return false;
    if (folderId) {
      const folder = this.getFolder(folderId);
      if (!folder || folderInTrash(folder, this.folders)) return false;
    }
    this.flush();
    this.documents = this.documents.map((item) => (
      item.id === id ? { ...item, folderId, updatedAt: this.now() } : item
    ));
    this.dirty = true;
    this.write();
    return true;
  }

  /** Move a folder under `parentId`, or to the root when it is null. */
  moveFolder(id: string, parentId: string | null): boolean {
    const folder = this.getFolder(id);
    if (!folder || folder.parentId === parentId || id === parentId) return false;
    if (parentId) {
      const parent = this.getFolder(parentId);
      if (!parent || folderInTrash(parent, this.folders)) return false;
      if (this.descendantFolderIds(id).has(parentId)) return false;
    }
    this.flush();
    this.folders = this.folders.map((item) => (
      item.id === id ? { ...item, parentId, updatedAt: this.now() } : item
    ));
    this.dirty = true;
    this.write();
    return true;
  }

  /** Copy one document into an independent, separately named document. */
  duplicate(id: string, name: string): LibraryDocument | null {
    const source = this.getDocument(id);
    const normalized = normalizeDocumentName(name);
    if (!source || !normalized) return null;
    const folder = source.folderId ? this.getFolder(source.folderId) : null;
    const folderId = folder && !folderInTrash(folder, this.folders) ? folder.id : null;
    this.flush();
    const document: LibraryDocument = {
      id: this.makeId('document'),
      name: normalized,
      source: source.source,
      folderId,
      trashedAt: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.documents = [...this.documents, document];
    this.selectedId = document.id;
    this.dirty = true;
    this.write();
    return document;
  }

  /** Move a document to the trash. */
  trashDocument(id: string): boolean {
    const document = this.getDocument(id);
    if (!document || document.trashedAt !== null) return false;
    const nextSelected = this.selectedId === id
      ? this.selectionAfterRemoving(new Set([id]))
      : this.selectedId;
    this.flush();
    this.documents = this.documents.map((item) => (
      item.id === id ? { ...item, trashedAt: this.now(), updatedAt: this.now() } : item
    ));
    if (this.selectedId === id) this.selectedId = nextSelected;
    this.dirty = true;
    this.write();
    return true;
  }

  /** Move a folder to the trash without rewriting its subtree. */
  trashFolder(id: string): boolean {
    const folder = this.getFolder(id);
    if (!folder || folder.trashedAt !== null) return false;
    this.flush();
    this.folders = this.folders.map((item) => (
      item.id === id ? { ...item, trashedAt: this.now(), updatedAt: this.now() } : item
    ));
    const selected = this.getDocument(this.selectedId);
    if (selected && documentInTrash(selected, this.folders)) {
      this.selectedId = this.nextActiveDocumentId();
    }
    this.dirty = true;
    this.write();
    return true;
  }

  /** Restore a trashed document. Documents whose folder is still trashed move to the root. */
  restoreDocument(id: string): boolean {
    const document = this.getDocument(id);
    if (!document || document.trashedAt === null) return false;
    const folder = document.folderId ? this.getFolder(document.folderId) : null;
    const folderId = folder && !folderInTrash(folder, this.folders) ? folder.id : null;
    this.flush();
    this.documents = this.documents.map((item) => (
      item.id === id ? { ...item, trashedAt: null, folderId, updatedAt: this.now() } : item
    ));
    this.dirty = true;
    this.write();
    return true;
  }

  /** Restore a trashed folder. A nested folder whose parent is trashed moves to the root. */
  restoreFolder(id: string): boolean {
    const folder = this.getFolder(id);
    if (!folder || folder.trashedAt === null) return false;
    const parent = folder.parentId ? this.getFolder(folder.parentId) : null;
    const parentId = parent && !folderInTrash(parent, this.folders) ? parent.id : null;
    this.flush();
    this.folders = this.folders.map((item) => (
      item.id === id ? { ...item, trashedAt: null, parentId, updatedAt: this.now() } : item
    ));
    this.dirty = true;
    this.write();
    return true;
  }

  /** Permanently delete one document. */
  deleteDocument(id: string): boolean {
    const index = this.documents.findIndex((document) => document.id === id);
    if (index < 0) return false;
    const nextSelected = this.selectedId === id
      ? this.selectionAfterRemoving(new Set([id]))
      : this.selectedId;
    this.flush();
    this.documents = this.documents.filter((document) => document.id !== id);
    if (this.selectedId === id) this.selectedId = nextSelected;
    this.dirty = true;
    this.write();
    return true;
  }

  /** Permanently delete a folder, its subfolders and every document inside them. */
  deleteFolder(id: string): boolean {
    const folder = this.getFolder(id);
    if (!folder) return false;
    const removedFolders = this.descendantFolderIds(id);
    this.flush();
    this.documents = this.documents.filter((document) => !document.folderId || !removedFolders.has(document.folderId));
    this.folders = this.folders.filter((item) => !removedFolders.has(item.id));
    if (!this.getDocument(this.selectedId)) this.selectedId = this.nextActiveDocumentId();
    this.dirty = true;
    this.write();
    return true;
  }

  /** Permanently delete every trashed document and folder. */
  emptyTrash(): boolean {
    const trashedFolders = new Set(
      this.folders
        .filter(folder => folder.trashedAt !== null)
        .flatMap(folder => [...this.descendantFolderIds(folder.id)]),
    );
    const hasTrashedDocuments = this.documents.some(document => (
      document.trashedAt !== null || (document.folderId !== null && trashedFolders.has(document.folderId))
    ));
    if (!hasTrashedDocuments && trashedFolders.size === 0) return false;
    this.flush();
    this.documents = this.documents.filter(document => (
      document.trashedAt === null && (!document.folderId || !trashedFolders.has(document.folderId))
    ));
    this.folders = this.folders.filter(folder => !trashedFolders.has(folder.id));
    if (!this.getDocument(this.selectedId)) this.selectedId = this.nextActiveDocumentId();
    this.dirty = true;
    this.write();
    return true;
  }

  /**
   * Delete one document (kept for the old standalone-library API).
   * New callers should use `trashDocument` and an explicit permanent action.
   */
  remove(id: string): boolean {
    return this.deleteDocument(id);
  }

  /** Mirror one editor change in memory immediately, then save after a pause. */
  updateSource(id: string, source: string): boolean {
    const document = this.getDocument(id);
    if (!document || document.source === source) return false;
    this.documents = this.documents.map((item) => (
      item.id === id ? { ...item, source, updatedAt: this.now() } : item
    ));
    this.schedule();
    return true;
  }

  /** Write any pending change now. Returns false when storage rejected it. */
  flush(): boolean {
    this.cancelTimer();
    if (!this.dirty) return this.saveStatus === 'failed' ? this.write(true) : true;
    return this.write(false);
  }

  /** Retry a failed write without discarding the in-memory library. */
  retry(): boolean {
    return this.write(true);
  }

  dispose(): void {
    this.cancelTimer();
    this.listeners.clear();
  }

  private nextActiveDocumentId(): string | null {
    const state: LibraryState = {
      documents: this.documents,
      folders: this.folders,
      selectedId: null,
    };
    return activeDocuments(state)[0]?.id ?? null;
  }

  /**
   * Pick the document that should become current when some documents leave the
   * active list. The next entry in list order wins, then the previous one.
   */
  private selectionAfterRemoving(removedIds: ReadonlySet<string>): string | null {
    const selectedIndex = this.selectedId
      ? this.documents.findIndex(document => document.id === this.selectedId)
      : -1;
    const candidates = this.documents.filter(document => (
      !removedIds.has(document.id) && !documentInTrash(document, this.folders)
    ));
    if (selectedIndex < 0) return candidates[0]?.id ?? null;
    const after = candidates.filter(document => this.documents.indexOf(document) > selectedIndex);
    return (after[0] ?? candidates[candidates.length - 1])?.id ?? null;
  }

  private descendantFolderIds(id: string): Set<string> {
    const ids = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of this.folders) {
        if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
          ids.add(folder.id);
          changed = true;
        }
      }
    }
    return ids;
  }

  private load(): LibraryLoadResult {
    let storage: LibraryStorage | undefined;
    try {
      storage = this.storage();
    } catch {
      return { ...emptyState(), problem: 'unavailable' };
    }
    if (!storage) return { ...emptyState(), problem: 'unavailable' };
    try {
      return parseLibraryText(storage.getItem(LIBRARY_STORAGE_KEY), this.now());
    } catch {
      return { ...emptyState(), problem: 'unavailable' };
    }
  }

  private makeSnapshot(): LibrarySnapshot {
    return Object.freeze({
      documents: this.documents,
      folders: this.folders,
      selectedId: this.selectedId,
      saveStatus: this.saveStatus,
      problem: this.problem,
    });
  }

  private publish(): void {
    this.snapshot = this.makeSnapshot();
    for (const listener of [...this.listeners]) listener();
  }

  private schedule(): void {
    this.dirty = true;
    this.saveStatus = 'saving';
    this.cancelTimer();
    this.publish();
    this.timer = this.setTimer(() => {
      this.timer = null;
      this.write(false);
    }, this.saveDelay);
  }

  private cancelTimer(): void {
    if (this.timer === null) return;
    this.clearTimer(this.timer);
    this.timer = null;
  }

  private write(force = false): boolean {
    this.cancelTimer();
    if (!this.dirty && !force) return this.saveStatus !== 'failed';
    try {
      const storage = this.storage();
      if (!storage) throw new Error('Storage is unavailable');
      storage.setItem(LIBRARY_STORAGE_KEY, serializeLibrary({
        documents: this.documents,
        folders: this.folders,
        selectedId: this.selectedId,
      }));
      this.dirty = false;
      this.saveStatus = 'saved';
      if (this.problem === 'unavailable') this.problem = null;
      this.publish();
      return true;
    } catch {
      this.saveStatus = 'failed';
      this.publish();
      return false;
    }
  }

  private makeId(kind: 'document' | 'folder'): string {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const id = this.createId().trim();
      if (id && !this.documents.some((document) => document.id === id)
        && !this.folders.some((folder) => folder.id === id)) return id;
    }
    return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
