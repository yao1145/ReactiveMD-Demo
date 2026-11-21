import { LocalPreview } from '../preview/local-preview';
export { LocalPreview } from '../preview/local-preview';
import { GuideView } from '../content/guide-view';
import { DiagnosticList } from '../compilation/diagnostic-list';
import { dedupeDiagnostics } from '../compilation/diagnostics';
import { DEFAULT_EXAMPLE, SELECTION_KEY, browserStorage, savedItem, initialLanguage, initialExampleId, savedSource, writeLibraryMode } from '../documents/workspace-storage';
import { useDraftPersistence } from '../documents/use-draft-persistence';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { Diagnostic, SourceRange } from 'reactive-md';
import { getDemoHost } from '../settings/component-mode';
import { SURVEY_EXAMPLE_ID } from '../network/survey-contract';
import { getSurveyNetwork } from '../network/survey-network';
import type { LocalSourceTarget } from 'reactive-md/react';
import {
  MobileDocBar,
  ReactiveMarkdownEditor,
  type ReactiveMarkdownEditorHandle,
  type EditorTransaction,
  type EditorComponentMode,
  type EditorViewMode,
} from 'reactive-md-editor';
import type {LocalCompileEditHint} from 'reactive-md';
import {
  DocumentLibrary,
  LIBRARY_MODE_STORAGE_KEY,
  activeDocuments,
  documentFileStem,
  trashedRoots,
  uniqueDocumentName,
  type LibraryMode,
} from '../documents/document-library';
import { DocumentTree, TREE_COPY } from '../documents/document-tree';
import { DeveloperTools } from '../developer/developer-tools';
import { OutlineWorkspace, type SidebarTab } from '../documents/document-outline';
import { CompileStatusIcon, DownloadIcon, MenuIcon, PanelLeftIcon } from '../ui/icons';
import { PreviewFullscreenToggle, PreviewOverlayControls, usePreviewFullscreen } from '../preview/preview-fullscreen';
import { ExportDialog } from '../export/export-dialog';
import { createImageAsset, ImageAssetError, MAX_IMAGE_BYTES, MAX_IMAGE_TOTAL_BYTES, validateImageManifest, type ImageAsset } from '../images/image-assets';
import { IMAGE_COPY } from '../images/image-copy';
import { useDocumentImages } from '../images/use-document-images';
import {
  freshHtmlOptions,
  toCompileOptions,
  type DemoHtmlOptions,
} from '../settings/html-options';
import {
  EXAMPLES,
  localizedExample,
  localizedExamples,
} from '../content/examples';
import {
  COPY,
  LANGUAGE_STORAGE_KEY,
  LanguageProvider,
  type Language,
} from '../ui/i18n';
import { useLocalCompilation } from '../compilation/use-local-compilation';
import { PreviewStateSession } from '../compilation/preview-state';
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>;
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
  </svg>;
}

function GitHubIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
  </svg>;
}

export default function App() {
  const [view, setView] = useState<'playground' | 'guide'>('playground');
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [library] = useState(() => new DocumentLibrary({ storage: browserStorage }));
  const libraryState = useSyncExternalStore(library.subscribe, library.getSnapshot);
  const [initial] = useState(() => {
    const snapshot = library.getSnapshot();
    const documents = activeDocuments(snapshot);
    const requestedExample = new URLSearchParams(window.location.search).get('example');
    const reopenDocuments = !requestedExample
      && savedItem(LIBRARY_MODE_STORAGE_KEY) === 'documents'
      && documents.length > 0;
    const exampleId = initialExampleId();
    const document = documents.find((item) => item.id === snapshot.selectedId)
      ?? documents[0];
    return {
      mode: (reopenDocuments ? 'documents' : 'example') as LibraryMode,
      exampleId,
      source: reopenDocuments && document ? document.source : savedSource(exampleId, language),
    };
  });
  const [libraryMode, setLibraryMode] = useState<LibraryMode>(initial.mode);
  const [selectedExample, setSelectedExample] = useState(initial.exampleId);
  const [source, setSource] = useState(initial.source);
  const [dark, setDark] = useState(() => savedItem('reactive-md:theme') === 'dark');
  const [editorView, setEditorView] = useState<EditorViewMode>(() =>
    initial.mode === 'documents' || EXAMPLES.find((item) => item.id === selectedExample)?.section === 'debug' ? 'split' : 'preview');
  const simple = editorView === 'preview';
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 1100px)').matches);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('documents');
  const [instanceKey, setInstanceKey] = useState(0);
  const [retainPreviewState, setRetainPreviewState] = useState(true);
  const [previewSession, setPreviewSession] = useState(() => new PreviewStateSession());
  const [exportOpen, setExportOpen] = useState(false);
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<Diagnostic[]>([]);
  // Capabilities are session-only: they start from the documented defaults on
  // every load and are reset whenever the document switches. CSS is granted by
  // default; author JavaScript and extended HTML start disabled.
  const [htmlOptions, setHtmlOptions] = useState<DemoHtmlOptions>(freshHtmlOptions);
  const [markdownBreaks, setMarkdownBreaks] = useState(true);
  const [strict, setStrict] = useState(true);
  const [componentMode, setComponentMode] = useState<EditorComponentMode>('default');
  const [editorToolbar, setEditorToolbar] = useState(true);
  const [editorAuthoring, setEditorAuthoring] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copy = COPY[language];
  const treeCopy = TREE_COPY[language];
  const editorHandle = useRef<ReactiveMarkdownEditorHandle|null>(null);
  const mobileMenuRef = useRef<HTMLDivElement|null>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const editHint=useRef<LocalCompileEditHint|undefined>(undefined);
  const onEditorTransaction=useCallback((transaction:EditorTransaction)=>{
    const changes=transaction.changes;
    if(!changes.length){editHint.current=undefined;return;}
    const from=changes[0].from,to=changes[changes.length-1].to;
    const end=transaction.source.length-(transaction.previousSource.length-to);
    editHint.current={baseSource:transaction.previousSource,edit:{from,to,insert:transaction.source.slice(from,end)}};
  },[]);
  /** Preview clicks select the matching source range; only split view exposes it. */
  const revealSource = useCallback((target: LocalSourceTarget) => {
    editorHandle.current?.selectRange(target.range);
  }, []);
  const imageKey = `${language}:${selectedExample}`;
  const documentImages = useDocumentImages(imageKey);
  const imageContext = useRef({ key: imageKey, assets: documentImages.assets, ready: documentImages.ready });
  imageContext.current = { key: imageKey, assets: documentImages.assets, ready: documentImages.ready };
  const imageBusyRef = useRef(false);
  const imageTask = useRef(0);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  useEffect(() => { setImageError(null); }, [imageKey]);

  const addImages = useCallback(async (files: File[], target?: string) => {
    if (imageBusyRef.current || !imageContext.current.ready) return;
    const context = imageContext.current;
    const task = ++imageTask.current;
    const messages = IMAGE_COPY[language];
    imageBusyRef.current = true;
    setImageBusy(true);
    setImageError(null);
    try {
      if (files.length > 64) throw new ImageAssetError('count');
      const selected = target ? files.slice(0, 1) : files;
      let total = context.assets.filter(a => a.url !== target).reduce((sum, a) => sum + a.size, 0);
      for (const file of selected) {
        if (file.size > MAX_IMAGE_BYTES) throw new ImageAssetError('size');
        total += file.size;
        if (total > MAX_IMAGE_TOTAL_BYTES) throw new ImageAssetError('total');
      }
      const added: ImageAsset[] = [];
      for (const file of selected) {
        // Validate before decoding, hashing or retaining any file data.
        const asset = await createImageAsset(file, target ?? 'pending');
        let decoded: ImageBitmap;
        try { decoded = await createImageBitmap(file); }
        catch { throw new Error('decode'); }
        decoded.close();
        if (!target) {
          const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
          const suffix = [...hash.subarray(0, 6)].map(b => b.toString(16).padStart(2, '0')).join('');
          const name = file.name.replace(/\.[^.]+$/, '').slice(0, 60).replace(/[^a-zA-Z0-9_-]/g, '-') || 'image';
          asset.url = `assets/${name}-${suffix}.${asset.mime === 'image/jpeg' ? 'jpg' : asset.mime.slice(6)}`;
        }
        added.push(asset);
      }
      if (imageContext.current.key !== context.key || imageTask.current !== task) return;
      const merged = new Map(imageContext.current.assets.map(a => [a.url, a]));
      for (const asset of added) merged.set(asset.url, asset);
      const assets = validateImageManifest([...merged.values()]);
      documentImages.replace(assets);
      if (!target) {
        const markdown = added.map(a => `![${a.name.replace(/[\[\]\\\r\n]/g, '')}](${a.url})`).join('\n\n');
        setEditorView(view => view === 'preview' ? 'split' : view);
        window.requestAnimationFrame(() => {
          if (imageContext.current.key === context.key && imageTask.current === task) editorHandle.current?.insertText(`\n\n${markdown}\n\n`);
        });
      }
    } catch (error) {
      if (imageContext.current.key !== context.key || imageTask.current !== task) return;
      const code = error instanceof ImageAssetError ? error.code : error instanceof Error && error.message === 'decode' ? 'decode' : 'read';
      setImageError(messages.errors[code]);
    } finally {
      imageBusyRef.current = false;
      setImageBusy(false);
    }
  }, [documentImages.replace, language]);

  const removeImage = useCallback((url: string) => {
    if (imageBusyRef.current) return;
    documentImages.replace(imageContext.current.assets.filter(a => a.url !== url));
    setImageError(null);
  }, [documentImages.replace]);

  /** Route the editor toolbar's image action to a local file picker. */
  const captureImageInsert = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest('.editor-toolbar-insert-menu .editor-toolbar-insert-item');
    if (!item) return;
    const label = item.textContent?.trim();
    if (label !== 'Image' && label !== '图片') return;
    event.preventDefault();
    event.stopPropagation();
    // Dismiss the editor's Insert menu before the native picker takes focus.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    imagePicker.current?.click();
  }, []);

  const flushSourceWrite = useDraftPersistence(libraryMode, selectedExample, source, language, library);

  const { config: demoConfig, reactConfig } = getDemoHost(componentMode);
  const network = libraryMode === 'example' && selectedExample === SURVEY_EXAMPLE_ID ? getSurveyNetwork() : undefined;
  const compileOptions = useMemo(() => ({ ...toCompileOptions(htmlOptions), markdownBreaks, strict, config: demoConfig }), [htmlOptions, markdownBreaks, strict, demoConfig]);
  const compilation = useLocalCompilation(source, compileOptions, true, editHint.current);
  const currentExample = localizedExample(
    EXAMPLES.find((item) => item.id === selectedExample) ?? DEFAULT_EXAMPLE,
    language,
  );
  const compiled = compilation.result;
  const exampleOptions = useMemo(() => localizedExamples(language), [language]);
  const activeDocumentCount = useMemo(() => activeDocuments(libraryState).length, [libraryState]);
  const trashItemCount = useMemo(() => {
    const roots = trashedRoots(libraryState);
    return roots.documents.length + roots.folders.length;
  }, [libraryState]);
  const extensionExamples = useMemo(() => exampleOptions
    .filter(example => example.section === 'reference')
    .map(example => ({ id: example.id, title: example.title })), [exampleOptions]);
  const currentDocument = useMemo(() => {
    const id = libraryState.selectedId;
    if (!id) return null;
    return libraryState.documents.find((item) => item.id === id) ?? null;
  }, [libraryState.documents, libraryState.selectedId]);
  const activeDocument = libraryMode === 'documents' ? currentDocument : null;
  const documentKey = activeDocument ? `document:${activeDocument.id}` : `example:${selectedExample}`;
  const exportBaseName = activeDocument ? documentFileStem(activeDocument.name) : selectedExample;

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { browserStorage()?.setItem('reactive-md:theme', dark ? 'dark' : 'light'); } catch { /* optional storage */ }
  }, [dark]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.documentElement.lang = copy.htmlLang;
    document.title = copy.documentTitle;
    try { browserStorage()?.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* optional storage */ }
  }, [copy, language]);

  const report = useCallback((diagnostics: Diagnostic[]) => {
    if (diagnostics.length === 0) return;
    setRuntimeDiagnostics((previous) => dedupeDiagnostics([...previous, ...diagnostics]).slice(-8));
  }, []);

  const replaceSource = useCallback((next: string) => {
    setSource(next);
    setRuntimeDiagnostics([]);
    if (libraryMode === 'documents') {
      const id = library.getSnapshot().selectedId;
      if (id) library.updateSource(id, next);
    }
  }, [library, libraryMode]);

  const beginPreviewSession = useCallback(() => {
    setPreviewSession(new PreviewStateSession(retainPreviewState));
    setInstanceKey((key) => key + 1);
  }, [retainPreviewState]);

  const resetHtmlOptions = useCallback(() => setHtmlOptions(freshHtmlOptions()), []);

  const resetDefaults = useCallback(() => {
    setHtmlOptions(freshHtmlOptions());
    setMarkdownBreaks(true);
    setStrict(true);
    setComponentMode('default');
    setEditorToolbar(true);
    setEditorAuthoring(true);
    setRetainPreviewState(true);
    setPreviewSession(new PreviewStateSession(true));
    setInstanceKey((key) => key + 1);
    setRuntimeDiagnostics([]);
  }, []);

  // The preview applies grants now and adopts the recompiled document into
  // its current runtime when the worker responds.
  const changeHtmlOptions = useCallback((next: DemoHtmlOptions) => {
    setHtmlOptions(next);
    setRuntimeDiagnostics([]);
  }, []);

  // Imports always become a new personal document. The current example or
  // document is left untouched.
  const importSource = useCallback((next: string) => {
    imageTask.current += 1;
    flushSourceWrite();
    const documents = library.getSnapshot().documents;
    const name = uniqueDocumentName(documents.map((item) => item.name), treeCopy.importedName);
    const document = library.createDocument({ name, source: next });
    if (!document) return;
    setEditorView('split');
    setLibraryMode('documents');
    writeLibraryMode('documents');
    resetHtmlOptions();
    setSource(document.source);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [
    flushSourceWrite,
    library,
    treeCopy.importedName,
    resetHtmlOptions,
    beginPreviewSession,
  ]);

  const exportSource = useCallback(() => {
    download(`${exportBaseName}.reactive.md`, source, 'text/markdown;charset=utf-8');
  }, [exportBaseName, source]);

  const changeComponentMode = useCallback((mode: EditorComponentMode) => {
    setRuntimeDiagnostics([]);
    setComponentMode(mode);
  }, []);
  const openExportDialog = useCallback(() => setExportOpen(true), []);
  const closeExportDialog = useCallback(() => setExportOpen(false), []);

  const focusDiagnostic = useCallback((range: SourceRange) => {
    setEditorView((current) => current === 'preview' ? 'split' : current);
    window.requestAnimationFrame(() => editorHandle.current?.selectRange(range));
  }, []);

  const loadExample = useCallback((exampleId: string) => {
    const example = EXAMPLES.find((item) => item.id === exampleId);
    if (!example) return;
    imageTask.current += 1;
    if (example.section === 'debug') setEditorView('split');
    flushSourceWrite();
    const next = savedSource(example.id, language);
    resetHtmlOptions();
    setLibraryMode('example');
    writeLibraryMode('example');
    setSelectedExample(example.id);
    setSource(next);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
    try { browserStorage()?.setItem(SELECTION_KEY, example.id); } catch { /* optional storage */ }
  }, [flushSourceWrite, resetHtmlOptions, beginPreviewSession, language]);

  const restoreExample = useCallback(() => {
    imageTask.current += 1;
    resetHtmlOptions();
    setSource(currentExample.source);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [resetHtmlOptions, currentExample.source, beginPreviewSession]);

  const resetInstance = useCallback(() => {
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [beginPreviewSession]);

  const openDocument = useCallback((id: string) => {
    flushSourceWrite();
    const document = library.select(id);
    if (!document) return;
    setEditorView('split');
    setLibraryMode('documents');
    writeLibraryMode('documents');
    resetHtmlOptions();
    setSource(document.source);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [flushSourceWrite, library, resetHtmlOptions, beginPreviewSession]);

  /** Reload the current source after a document or folder leaves the tree. */
  const refreshAfterRemoval = useCallback(() => {
    const snapshot = library.getSnapshot();
    const next = snapshot.selectedId ? library.getDocument(snapshot.selectedId) : null;
    if (next) {
      setLibraryMode('documents');
      writeLibraryMode('documents');
      setSource(next.source);
    } else {
      setLibraryMode('example');
      writeLibraryMode('example');
      setSource(savedSource(selectedExample, language));
    }
    resetHtmlOptions();
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [library, selectedExample, language, resetHtmlOptions, beginPreviewSession]);

  const createDocument = useCallback((folderId: string | null) => {
    flushSourceWrite();
    const snapshot = library.getSnapshot();
    const name = uniqueDocumentName(snapshot.documents.map(item => item.name), treeCopy.untitled);
    const document = library.createDocument({ name, source: '', folderId });
    if (!document) return null;
    setEditorView('split');
    setLibraryMode('documents');
    writeLibraryMode('documents');
    resetHtmlOptions();
    setSource(document.source);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
    return document.id;
  }, [
    flushSourceWrite,
    library,
    treeCopy.untitled,
    resetHtmlOptions,
    beginPreviewSession,
  ]);

  const createFolder = useCallback((parentId: string | null) => {
    const folder = library.createFolder({ name: treeCopy.newFolderName, parentId });
    return folder ? { id: folder.id, name: folder.name } : null;
  }, [library, treeCopy.newFolderName]);

  const renameNode = useCallback((kind: 'document' | 'folder', id: string, name: string) => {
    if (kind === 'folder') library.renameFolder(id, name);
    else library.rename(id, name);
  }, [library]);

  const trashNode = useCallback((kind: 'document' | 'folder', id: string) => {
    const changed = kind === 'folder' ? library.trashFolder(id) : library.trashDocument(id);
    if (changed) refreshAfterRemoval();
  }, [library, refreshAfterRemoval]);

  const restoreNode = useCallback((kind: 'document' | 'folder', id: string) => {
    if (kind === 'folder') library.restoreFolder(id);
    else library.restoreDocument(id);
  }, [library]);

  const deleteNode = useCallback((kind: 'document' | 'folder', id: string) => {
    const changed = kind === 'folder' ? library.deleteFolder(id) : library.deleteDocument(id);
    if (changed) refreshAfterRemoval();
  }, [library, refreshAfterRemoval]);

  const emptyTrash = useCallback(() => {
    if (library.emptyTrash()) refreshAfterRemoval();
  }, [library, refreshAfterRemoval]);

  // Copy the example exactly as it currently appears in the editor, including
  // any unpublished edits in the draft.
  const copyExampleToDocuments = useCallback(() => {
    flushSourceWrite();
    const documents = library.getSnapshot().documents;
    const name = uniqueDocumentName(
      documents.map((item) => item.name),
      `${currentExample.title}${treeCopy.copySuffix}`,
    );
    const document = library.createDocument({ name, source });
    if (!document) return;
    setEditorView('split');
    setLibraryMode('documents');
    writeLibraryMode('documents');
    resetHtmlOptions();
    setSource(document.source);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [
    flushSourceWrite,
    library,
    currentExample.title,
    treeCopy.copySuffix,
    source,
    resetHtmlOptions,
    beginPreviewSession,
  ]);

  // Keep the example selected, but save the current draft under the old
  // language and load that example's draft (or default source) in the new one.
  // Personal documents keep one source for both UI languages.
  const switchLanguage = useCallback(() => {
    imageTask.current += 1;
    const nextLanguage: Language = language === 'en' ? 'zh' : 'en';
    if (libraryMode === 'documents') {
      setLanguage(nextLanguage);
      return;
    }
    flushSourceWrite({ exampleId: selectedExample, source, language });
    const next = savedSource(selectedExample, nextLanguage);
    resetHtmlOptions();
    setLanguage(nextLanguage);
    setSource(next);
    setRuntimeDiagnostics([]);
    beginPreviewSession();
  }, [
    language,
    libraryMode,
    selectedExample,
    source,
    flushSourceWrite,
    resetHtmlOptions,
    beginPreviewSession,
  ]);

  const currentDiagnostics = useMemo(
    () => compiled ? dedupeDiagnostics([...compiled.diagnostics, ...runtimeDiagnostics]) : [],
    [compiled, runtimeDiagnostics],
  );

  const compiling = compilation.pending;
  const previewFailed = compiled !== null && !compiled.ok;
  const previewDocument = compilation.previewDocument && previewSession.canPreview(compilation.previewDocument, source)
    ? compilation.previewDocument
    : null;
  const exportDocument = compiled && compiled.ok ? compiled.document : null;
  const exportCurrentState = exportDocument ? previewSession.currentState(exportDocument) : null;
  const exportCompileError = compiled && !compiled.ok
    ? (compiled.diagnostics[0]?.message ?? null)
    : null;
  const canFullscreenPreview = Boolean(editorView !== 'edit' && previewDocument && !previewFailed);
  const previewFullscreen = usePreviewFullscreen(canFullscreenPreview);
  const statusLabel = compiling
    ? (compilation.mode === 'fallback' ? copy.status.compilingMainThread : copy.status.compiling)
    : compiled
      ? (compiled.ok
        ? copy.status.compiled(
          currentDiagnostics.length,
          compilation.duration,
          compilation.mode === 'fallback',
        )
        : copy.status.compileFailed)
      : copy.status.waiting;

  const previewSidebarMeta = editorView === 'preview' && editorToolbar;
  const statusDetail = [
    statusLabel,
    !compiling && compiled?.ok && currentDiagnostics.length > 0 ? `${compilation.duration} ms` : null,
    compilation.failure,
  ].filter(Boolean).join(' · ');
  const statusChip = (
    <span
      className={`status-chip ${previewSidebarMeta ? 'is-compact' : ''} ${compiling ? 'is-pending' : previewFailed ? 'is-error' : !compiled ? 'is-waiting' : ''}`}
      role="status"
      title={previewSidebarMeta ? statusDetail : compilation.failure ?? undefined}
    >
      {previewSidebarMeta ? <>
        <CompileStatusIcon size={20} state={compiling ? 'pending' : previewFailed ? 'error' : compiled ? 'success' : 'waiting'} />
        <span className="sr-only">{statusLabel}</span>
      </> : statusLabel}
    </span>
  );
  const exportButton = (
    <button type="button" className="icon-button" title={copy.authorTools.exportDocument}
      aria-label={copy.authorTools.exportDocument} onClick={openExportDialog}>
      <DownloadIcon />
    </button>
  );
  const sidebarToggle = (expanded: boolean, extraClass = 'toolbar-sidebar-toggle') => (
    <button
      id="sidebar-toggle"
      type="button"
      className={`icon-button ${extraClass}`}
      aria-expanded={expanded}
      aria-controls="document-sidebar"
      title={copy.sidebar.region}
      aria-label={copy.sidebar.region}
      onClick={() => setSidebarOpen(open => !open)}
    >
      <PanelLeftIcon />
    </button>
  );
  const sidebarHeader = sidebarOpen ? (
    <div className={`sidebar-head ${previewSidebarMeta ? 'has-preview-meta' : ''}`}>
      <span className="sidebar-head-name" title={activeDocument?.name ?? currentExample.title}>
        {activeDocument?.name ?? currentExample.title}
      </span>
      {previewSidebarMeta ? (
        <span className="sidebar-head-actions">
          {statusChip}
          {exportButton}
        </span>
      ) : null}
    </div>
  ) : null;

  return (
    <LanguageProvider language={language}>
      <div className={`app-shell${simple ? ' is-simple' : editorView === 'edit' ? ' is-edit' : ''}`}>
        <header className="masthead">
          <div className="masthead-lead">
            <h1>Reactive MD</h1>
            {!editorToolbar ? sidebarToggle(sidebarOpen) : null}
            <div className="masthead-actions">
              <button
                type="button"
                className="language-toggle"
                data-testid="language-toggle"
                aria-label={copy.languageToggle.ariaLabel}
                title={copy.languageToggle.ariaLabel}
                lang={copy.languageToggle.labelLang}
                onClick={switchLanguage}
              >
                <span className={language === 'zh' ? 'is-active' : ''} lang="zh-CN">中文</span>
                <span className={language === 'en' ? 'is-active' : ''} lang="en">EN</span>
              </button>
              <button
                type="button"
                className="theme-toggle"
                aria-pressed={dark}
                aria-label={dark ? copy.authorTools.lightTheme : copy.authorTools.darkTheme}
                title={dark ? copy.authorTools.lightTheme : copy.authorTools.darkTheme}
                onClick={() => setDark(value => !value)}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
                <span>{dark ? copy.masthead.themeLight : copy.masthead.themeDark}</span>
              </button>
              <a
                className="github-link"
                href="https://github.com/yao1145/ReactiveMD"
                target="_blank"
                rel="noreferrer noopener"
                aria-label={copy.masthead.repository}
                title={copy.masthead.repository}
              >
                <GitHubIcon />
              </a>
              {!editorToolbar ? exportButton : null}
              {!editorToolbar ? statusChip : null}
              <div className="mobile-menu" ref={mobileMenuRef}>
                <button
                  type="button"
                  className="icon-button mobile-menu-toggle"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu-panel"
                  aria-label={copy.masthead.menu}
                  title={copy.masthead.menu}
                  onClick={() => setMobileMenuOpen(open => !open)}
                >
                  <MenuIcon />
                </button>
                {mobileMenuOpen ? (
                  <div id="mobile-menu-panel" className="mobile-menu-panel" role="menu" aria-label={copy.masthead.menu}>
                    <div className="mobile-menu-row">
                      <span className="mobile-menu-label">{copy.masthead.language}</span>
                      <button
                        type="button"
                        className="language-toggle"
                        aria-label={copy.languageToggle.ariaLabel}
                        title={copy.languageToggle.ariaLabel}
                        lang={copy.languageToggle.labelLang}
                        onClick={() => { switchLanguage(); setMobileMenuOpen(false); }}
                      >
                        <span className={language === 'zh' ? 'is-active' : ''} lang="zh-CN">中文</span>
                        <span className={language === 'en' ? 'is-active' : ''} lang="en">EN</span>
                      </button>
                    </div>
                    <a
                      className="mobile-menu-item"
                      href="https://github.com/yao1145/ReactiveMD"
                      target="_blank"
                      rel="noreferrer noopener"
                      role="menuitem"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <GitHubIcon />
                      <span>{copy.masthead.repository}</span>
                    </a>
                    <button type="button" role="menuitem" className="mobile-menu-item"
                      onClick={() => { openExportDialog(); setMobileMenuOpen(false); }}>
                      <DownloadIcon />
                      <span>{copy.authorTools.exportDocument}</span>
                    </button>
                    <button type="button" role="menuitem" className="mobile-menu-item" aria-pressed={view === 'playground'}
                      onClick={() => { setView('playground'); setMobileMenuOpen(false); }}>
                      {copy.masthead.playground}
                    </button>
                    <button type="button" role="menuitem" className="mobile-menu-item" aria-pressed={view === 'guide'}
                      onClick={() => { setView('guide'); setMobileMenuOpen(false); }}>
                      {copy.masthead.guide}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <nav className="view-switch" aria-label={copy.masthead.viewSwitcher}>
            <button
              type="button"
              aria-pressed={view === 'playground'}
              onClick={() => setView('playground')}
            >
              {copy.masthead.playground}
            </button>
            <button
              type="button"
              aria-pressed={view === 'guide'}
              onClick={() => setView('guide')}
            >
              {copy.masthead.guide}
            </button>
          </nav>
        </header>

        {view === 'guide' ? (
          <GuideView onBack={() => setView('playground')} />
        ) : (
        <main className="workbench">
          <MobileDocBar
            title={activeDocument?.name ?? currentExample.title}
            view={editorView}
            onViewChange={setEditorView}
            labels={{ edit: copy.editor.editView, preview: copy.editor.previewView, viewSwitch: copy.editor.viewSwitch }}
            theme={dark ? 'dark' : 'light'}
          />
          <OutlineWorkspace document={previewDocument} source={source} documentKey={documentKey}
            mode={editorView} onModeChange={setEditorView} editor={editorHandle}
            sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen}
            sidebarHeader={sidebarHeader}
            sidebarTab={sidebarTab} onSidebarTabChange={setSidebarTab}
            documentsPanel={<DocumentTree
              snapshot={libraryState}
              examples={exampleOptions}
              language={language}
              activeMode={libraryMode}
              activeExampleId={libraryMode === 'example' ? selectedExample : null}
              onCreateDocument={createDocument}
              onCreateFolder={createFolder}
              onSelectDocument={openDocument}
              onSelectExample={loadExample}
              onRename={renameNode}
              onTrash={trashNode}
              onRestore={restoreNode}
              onDelete={deleteNode}
              onEmptyTrash={emptyTrash}
              onMoveDocument={(id, folderId) => { library.moveDocument(id, folderId); }}
              onMoveFolder={(id, parentId) => { library.moveFolder(id, parentId); }}
              onRetry={() => library.retry()}
            />}
            devtoolsPanel={<DeveloperTools
              language={language}
              markdownBreaks={markdownBreaks}
              onMarkdownBreaksChange={setMarkdownBreaks}
              strict={strict}
              onStrictChange={setStrict}
              componentMode={componentMode}
              onComponentModeChange={changeComponentMode}
              htmlOptions={htmlOptions}
              onHtmlOptionsChange={changeHtmlOptions}
              editorToolbar={editorToolbar}
              onEditorToolbarChange={setEditorToolbar}
              editorAuthoring={editorAuthoring}
              onEditorAuthoringChange={setEditorAuthoring}
              viewMode={editorView}
              onViewModeChange={setEditorView}
              onResetDefaults={resetDefaults}
              retainPreviewState={retainPreviewState}
              onRetainPreviewStateChange={(checked) => {
                previewSession.setRetention(checked);
                setRetainPreviewState(checked);
              }}
              onImport={importSource}
              onExport={openExportDialog}
              onDownloadMarkdown={exportSource}
              onRunAgain={resetInstance}
              onRestoreExample={restoreExample}
              onSaveCopy={copyExampleToDocuments}
              activeKind={libraryMode}
              activeName={activeDocument?.name ?? currentExample.title}
              documentCount={activeDocumentCount}
              folderCount={libraryState.folders.length}
              trashCount={trashItemCount}
              diagnosticsCount={currentDiagnostics.length}
              compileDuration={compilation.duration}
              compileMode={compilation.mode ?? 'idle'}
              extensions={extensionExamples}
            />}>
            <section id="source-pane" className="pane pane-editor" aria-label={copy.editor.region}
              onClickCapture={captureImageInsert}
              onPasteCapture={event => {
                if (!(event.target instanceof HTMLTextAreaElement)
                  && !(event.target instanceof HTMLElement && event.target.closest('.cm-content'))) return;
                const files = Array.from(event.clipboardData.files);
                if (!files.length) return;
                event.preventDefault();
                void addImages(files);
              }}>
              <ReactiveMarkdownEditor
                compileOptions={compileOptions}
                ref={(handle:ReactiveMarkdownEditorHandle|null)=>{editorHandle.current=handle;}}
                analysis={compilation.analysis}
                onTransaction={onEditorTransaction}
                id="source-editor"
                value={source}
                onChange={replaceSource}
                locale={language}
                theme={dark ? 'dark' : 'light'}
                height="max(720px, 90dvh)"
                ariaLabel={copy.editor.sourceLabel}
                documentKey={documentKey}
                diagnostics={currentDiagnostics}
                document={compiled && compiled.ok ? compiled.document : null}
                onExport={openExportDialog}
                viewMode={editorView}
                onViewModeChange={setEditorView}
                preview={<section
                  className={`pane-preview${previewFullscreen.fallback ? ' is-preview-fullscreen' : ''}`}
                  aria-label={copy.preview.region}
                  ref={previewFullscreen.paneRef}
                >
                  {editorView !== 'edit' ? (
                    <PreviewOverlayControls showLabel={copy.preview.showActions} hideLabel={copy.preview.hideActions}>
                      {editorView === 'preview' ? sidebarToggle(sidebarOpen, 'preview-overlay-button') : null}
                      {canFullscreenPreview ? (
                        <PreviewFullscreenToggle
                          state={previewFullscreen}
                          enterLabel={copy.preview.enterFullscreen}
                          exitLabel={copy.preview.exitFullscreen}
                        />
                      ) : null}
                    </PreviewOverlayControls>
                  ) : null}
                  <div className="preview-stage" aria-busy={compiling}>
                    {previewFailed && compiled ? (
                      <div className="preview-error" role="alert">
                        <h3>{copy.preview.disabledTitle}</h3>
                        <p>{copy.preview.disabledBody}</p>
                        <DiagnosticList diagnostics={compiled.diagnostics} focusDiagnostic={focusDiagnostic} />
                      </div>
                    ) : previewDocument ? (
                      <LocalPreview key={`${componentMode}:${instanceKey}`} document={previewDocument}
                        authorScriptPaused={previewDocument.source !== source}
                        session={previewSession} stateId={componentMode === 'minimal' ? `${documentKey}:minimal` : documentKey}
                        capabilityGrants={{
                          ...htmlOptions,
                          enableJavaScript: htmlOptions.enableJavaScript,
                        }}
                        reactConfig={reactConfig} network={network} onDiagnostics={report} images={documentImages.assets}
                        onSourceNavigate={editorView === 'split' ? revealSource : undefined} />
                    ) : (
                      <div className="preview-loading" role="status"><p>{copy.preview.preparing}</p></div>
                    )}
                  </div>
                </section>}
                authoring={editorAuthoring}
                toolbar={editorToolbar}
                mobileBar
                toolbarLeading={editorView === 'preview' ? undefined : sidebarToggle(sidebarOpen)}
                toolbarStatus={editorView === 'preview' ? undefined : statusChip}
              />

              <p className="editor-note" id="preview-state-note">
                {copy.editor.stateNote}
              </p>

              <section className="diagnostics-panel" aria-label={copy.editor.diagnosticsRegion}>
                <div className="diagnostics-head">
                  <h3>{copy.editor.diagnosticsHeading}</h3>
                  <span>
                    {compiling
                      ? copy.editor.diagnosticsCompiling
                      : currentDiagnostics.length
                        ? copy.editor.diagnosticsCount(currentDiagnostics.length)
                        : copy.editor.diagnosticsNone}
                  </span>
                </div>
                <DiagnosticList
                  diagnostics={currentDiagnostics}
                  focusDiagnostic={focusDiagnostic}
                  emptyText={compiling ? copy.editor.diagnosticsEmptyCompiling : undefined}
                />
              </section>
            </section>

          </OutlineWorkspace>
        </main>
        )}

        <footer className="app-footer">
          {view === 'playground' && simple ? <p>{copy.showcase.footer}</p> : <p>
            {copy.footer.bindBefore}<code>bind</code>{copy.footer.bindBetween}
            <code>{copy.footer.expression}</code>{copy.footer.afterExpression}
          </p>}
          {view === 'guide' ? (
            <p>
              {copy.footer.guideBefore}<code>{copy.guide.documentFile}</code>{copy.footer.guideAfter}
            </p>
          ) : !simple ? (
            <p>{copy.footer.trial}</p>
          ) : null}
        </footer>

        <input ref={imagePicker} type="file" accept="image/*" multiple hidden
          onChange={event => {
            const files = Array.from(event.currentTarget.files ?? []);
            if (files.length) void addImages(files);
            event.currentTarget.value = '';
          }} />

        <ExportDialog
          imageAssets={documentImages.assets}
          imageBusy={imageBusy || !documentImages.ready}
          imageError={imageError}
          imageStorageError={documentImages.storageError}
          onImageFiles={addImages}
          onRemoveImage={removeImage}
          open={exportOpen}
          componentMode={componentMode}
          source={source}
          baseName={exportBaseName}
          document={exportDocument}
          currentState={exportCurrentState}
          pending={compiling}
          compileError={exportCompileError}
          compileOptions={compileOptions}
          dark={dark}
          onClose={closeExportDialog}
          onDownloadMarkdown={exportSource}
        />
      </div>
    </LanguageProvider>
  );
}
