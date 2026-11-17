/** Pure validation and serialization for the versioned document-library format. */

export const LIBRARY_VERSION = 2;
export const MAX_DOCUMENT_NAME_LENGTH = 80;
export const MAX_FOLDER_NAME_LENGTH = 80;

export type LibraryProblem = 'corrupt' | 'unavailable' | null;

export interface LibraryFolder {
  id: string;
  name: string;
  parentId: string | null;
  trashedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryDocument {
  id: string;
  name: string;
  source: string;
  folderId: string | null;
  trashedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryState {
  documents: readonly LibraryDocument[];
  folders: readonly LibraryFolder[];
  selectedId: string | null;
}

export interface LibraryLoadResult extends LibraryState {
  problem: LibraryProblem;
}

function emptyState(): LibraryState {
  return { documents: [], folders: [], selectedId: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nameOrNull(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  return name.slice(0, maxLength).trim();
}

export function normalizeDocumentName(raw: string): string | null {
  return nameOrNull(raw, MAX_DOCUMENT_NAME_LENGTH);
}

export function normalizeFolderName(raw: string): string | null {
  return nameOrNull(raw, MAX_FOLDER_NAME_LENGTH);
}

function folderById(folders: readonly LibraryFolder[]): Map<string, LibraryFolder> {
  return new Map(folders.map(folder => [folder.id, folder]));
}

export function folderInTrash(folder: LibraryFolder, folders: readonly LibraryFolder[]): boolean {
  if (folder.trashedAt !== null) return true;
  const byId = folderById(folders);
  const seen = new Set<string>();
  let parentId = folder.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return false;
    if (parent.trashedAt !== null) return true;
    parentId = parent.parentId;
  }
  return false;
}

export function documentInTrash(document: LibraryDocument, folders: readonly LibraryFolder[]): boolean {
  if (document.trashedAt !== null) return true;
  if (!document.folderId) return false;
  const folder = folders.find(item => item.id === document.folderId);
  return folder ? folderInTrash(folder, folders) : false;
}

export function activeDocuments(state: LibraryState): LibraryDocument[] {
  return state.documents.filter(document => !documentInTrash(document, state.folders));
}

export function activeFolders(state: LibraryState): LibraryFolder[] {
  return state.folders.filter(folder => !folderInTrash(folder, state.folders));
}

export function trashedRoots(state: LibraryState): {
  documents: LibraryDocument[];
  folders: LibraryFolder[];
} {
  const byId = folderById(state.folders);
  const parentTrashed = (folder: LibraryFolder) => {
    if (!folder.parentId) return false;
    const parent = byId.get(folder.parentId);
    return parent ? folderInTrash(parent, state.folders) : false;
  };
  return {
    documents: state.documents.filter(document => {
      if (document.trashedAt === null) return false;
      const folder = document.folderId ? byId.get(document.folderId) : null;
      return !folder || !folderInTrash(folder, state.folders);
    }),
    folders: state.folders.filter(folder => folder.trashedAt !== null && !parentTrashed(folder)),
  };
}

/** Validate stored data, keep valid entries and migrate version 1 into version 2. */
export function readStoredLibrary(raw: unknown, now = Date.now()): LibraryLoadResult {
  if (!isRecord(raw)) return { ...emptyState(), problem: 'corrupt' };
  const version = raw.version;
  if (version !== 1 && version !== LIBRARY_VERSION) return { ...emptyState(), problem: 'corrupt' };
  if (!Array.isArray(raw.documents)) return { ...emptyState(), problem: 'corrupt' };

  let corrupt = false;
  const seenDocuments = new Set<string>();
  const documents: LibraryDocument[] = [];
  for (const entry of raw.documents) {
    if (!isRecord(entry)) {
      corrupt = true;
      continue;
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const name = nameOrNull(entry.name, MAX_DOCUMENT_NAME_LENGTH);
    if (!id || !name || typeof entry.source !== 'string' || seenDocuments.has(id)) {
      corrupt = true;
      continue;
    }
    seenDocuments.add(id);
    const createdAt = isFiniteNumber(entry.createdAt) ? entry.createdAt : now;
    documents.push({
      id,
      name,
      source: entry.source,
      folderId: version === LIBRARY_VERSION && typeof entry.folderId === 'string' ? entry.folderId : null,
      trashedAt: version === LIBRARY_VERSION && isFiniteNumber(entry.trashedAt) ? entry.trashedAt : null,
      createdAt,
      updatedAt: isFiniteNumber(entry.updatedAt) ? entry.updatedAt : createdAt,
    });
  }

  const seenFolders = new Set<string>();
  const folders: LibraryFolder[] = [];
  if (version === LIBRARY_VERSION && raw.folders !== undefined) {
    if (!Array.isArray(raw.folders)) corrupt = true;
    else for (const entry of raw.folders) {
      if (!isRecord(entry)) {
        corrupt = true;
        continue;
      }
      const id = typeof entry.id === 'string' ? entry.id.trim() : '';
      const name = nameOrNull(entry.name, MAX_FOLDER_NAME_LENGTH);
      if (!id || !name || seenFolders.has(id)) {
        corrupt = true;
        continue;
      }
      seenFolders.add(id);
      const createdAt = isFiniteNumber(entry.createdAt) ? entry.createdAt : now;
      folders.push({
        id,
        name,
        parentId: typeof entry.parentId === 'string' ? entry.parentId : null,
        trashedAt: isFiniteNumber(entry.trashedAt) ? entry.trashedAt : null,
        createdAt,
        updatedAt: isFiniteNumber(entry.updatedAt) ? entry.updatedAt : createdAt,
      });
    }
  }

  for (const folder of folders) {
    if (folder.parentId && !seenFolders.has(folder.parentId)) {
      folder.parentId = null;
      corrupt = true;
    }
  }
  for (const folder of folders) {
    const seen = new Set<string>([folder.id]);
    let parentId = folder.parentId;
    while (parentId) {
      if (seen.has(parentId)) {
        folder.parentId = null;
        corrupt = true;
        break;
      }
      seen.add(parentId);
      parentId = folders.find(item => item.id === parentId)?.parentId ?? null;
    }
  }
  for (const document of documents) {
    if (document.folderId && !seenFolders.has(document.folderId)) {
      document.folderId = null;
      corrupt = true;
    }
  }

  const requested = typeof raw.selectedId === 'string' ? raw.selectedId : null;
  const state: LibraryState = { documents, folders, selectedId: null };
  const requestedDocument = requested ? documents.find(document => document.id === requested) ?? null : null;
  const selectedId = requestedDocument && !documentInTrash(requestedDocument, folders)
    ? requestedDocument.id
    : activeDocuments(state)[0]?.id ?? null;
  if (requested && requested !== selectedId) corrupt = true;
  return { documents, folders, selectedId, problem: corrupt ? 'corrupt' : null };
}

export function parseLibraryText(text: string | null, now = Date.now()): LibraryLoadResult {
  if (text === null) return { ...emptyState(), problem: null };
  try {
    return readStoredLibrary(JSON.parse(text), now);
  } catch {
    return { ...emptyState(), problem: 'corrupt' };
  }
}

export function serializeLibrary(state: LibraryState): string {
  return JSON.stringify({
    version: LIBRARY_VERSION,
    selectedId: state.selectedId,
    documents: state.documents,
    folders: state.folders,
  });
}
