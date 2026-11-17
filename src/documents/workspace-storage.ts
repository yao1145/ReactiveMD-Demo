import { DEFAULT_EXAMPLE_ID, EXAMPLES, exampleSource, resolveExampleId } from '../content/examples';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type Language } from '../ui/i18n';
import { LIBRARY_MODE_STORAGE_KEY, type LibraryMode } from './document-library';

export const DEFAULT_EXAMPLE = EXAMPLES.find((item) => item.id === DEFAULT_EXAMPLE_ID) ?? EXAMPLES[0];
const SOURCE_PREFIX = 'reactive-md:local:source:';
export const SELECTION_KEY = 'reactive-md:selection';
export function browserStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

export function savedItem(key: string) {
  try { return browserStorage()?.getItem(key); } catch { return undefined; }
}

export function initialLanguage(): Language {
  return savedItem(LANGUAGE_STORAGE_KEY) === 'zh' ? 'zh' : DEFAULT_LANGUAGE;
}

export function initialExampleId() {
  const requested = new URLSearchParams(window.location.search).get('example');
  return resolveExampleId(requested) ?? resolveExampleId(savedItem(SELECTION_KEY)) ?? DEFAULT_EXAMPLE.id;
}

// Language-specific drafts live beside the original English draft key so
// existing saved English sources keep loading.
function draftKey(language: Language, id: string) {
  return `${SOURCE_PREFIX}${language}:${id}`;
}

function legacyDraftKey(id: string) {
  return `${SOURCE_PREFIX}${id}`;
}

function readDraft(language: Language, id: string) {
  const current = savedItem(draftKey(language, id));
  if (current !== null && current !== undefined) return current;
  return language === 'en' ? savedItem(legacyDraftKey(id)) : undefined;
}

export function savedSource(id: string, language: Language) {
  const draft = readDraft(language, id);
  if (draft !== null && draft !== undefined) return draft;
  const example = EXAMPLES.find((item) => item.id === id) ?? DEFAULT_EXAMPLE;
  return exampleSource(example, language);
}

export function writeDraft(storage: Storage, language: Language, id: string, text: string) {
  storage.setItem(draftKey(language, id), text);
  // Mirror English drafts to the pre-localization key for older builds and
  // for users who already have a saved source.
  if (language === 'en') storage.setItem(legacyDraftKey(id), text);
  storage.setItem(SELECTION_KEY, id);
}

// Remember which destination was open so a reload returns to the same work.
export function writeLibraryMode(mode: LibraryMode) {
  try { browserStorage()?.setItem(LIBRARY_MODE_STORAGE_KEY, mode); } catch { /* optional storage */ }
}
