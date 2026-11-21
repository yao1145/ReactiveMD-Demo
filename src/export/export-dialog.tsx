import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  createLocalStateFile,
  serializeLocalState,
  type LocalCompileOptions,
  type LocalDocument,
  type LocalStateFile,
  type LocalValue,
} from 'reactive-md';
import { useCopy, useLanguage } from '../ui/i18n';
import type { EditorComponentMode } from 'reactive-md-editor';
import { createDemoPdf, printStaticHtml } from './export-pdf';
import { resolveDocumentImages, type ImageAsset } from '../images/image-assets';
import { IMAGE_COPY } from '../images/image-copy';
import { ImageAssetsPanel } from '../images/image-assets-panel';
import {
  buildShareableHtml,
  countParameterDifferences,
  documentUsesExtensionBundle,
  formatBuildError,
  prepareShareableHtmlAssets,
  DEMO_GENERATOR_NAME,
  type ShareableColorScheme,
  type ShareableHtmlMode,
} from './export-html';

type BaselineChoice = 'initial' | 'current';
type AssetsState = 'loading' | 'ready' | 'error';
type ExportFormat = ShareableHtmlMode | 'pdf';

export interface ExportDialogProps {
  open: boolean;
  componentMode?: EditorComponentMode;
  source: string;
  /** File name stem for downloaded documents, e.g. the selected example id. */
  baseName: string;
  /** Exact document for the current source; null while compiling or on errors. */
  document: LocalDocument | null;
  /** Live preview values for that same document, or null when unavailable. */
  currentState: Readonly<Record<string, LocalValue>> | null;
  pending: boolean;
  compileError: string | null;
  /** Granted document capabilities; the export carries the same grants. */
  compileOptions?: LocalCompileOptions;
  dark: boolean;
  onClose(): void;
  onDownloadMarkdown(): void;
  imageAssets: readonly ImageAsset[];
  imageBusy: boolean;
  imageError: string | null;
  imageStorageError: boolean;
  onImageFiles(files: File[], target?: string): void;
  onRemoveImage(url: string): void;
}

function downloadText(name: string, text: string, type: string): void {
  downloadFile(name, new Blob([text], { type }));
}

function downloadFile(name: string, file: Blob): void {
  const url = URL.createObjectURL(file);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportDialog({
  open,
  componentMode = 'default',
  source,
  baseName,
  document: compiledDocument,
  currentState,
  pending,
  compileError,
  compileOptions,
  dark,
  onClose,
  onDownloadMarkdown,
  imageAssets, imageBusy, imageError, imageStorageError, onImageFiles, onRemoveImage,
}: ExportDialogProps) {
  const copy = useCopy().exportDialog;
  const language = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const taskRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const summaryId = useId();
  const [format, setFormat] = useState<ExportFormat>('interactive');
  const mode: ShareableHtmlMode = format === 'pdf' ? 'static' : format;
  const [baseline, setBaseline] = useState<BaselineChoice>('initial');
  const [assetsState, setAssetsState] = useState<AssetsState>('loading');
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [packageVersion, setPackageVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  // Routing is a stable boolean, so recompiling the same kind of document does
  // not restart preparation or refetch anything.
  const extensionRoute = documentUsesExtensionBundle(compiledDocument, componentMode);
  const documentReady = compiledDocument !== null && !pending;

  const requestClose = useCallback(() => {
    // Invalidate an in-flight render so closing never downloads later.
    taskRef.current += 1;
    onClose();
  }, [onClose]);

  // Reset the dialog choices after each close so reopening starts from the
  // documented defaults (interactive HTML, author initial values).
  useEffect(() => {
    if (open) return;
    taskRef.current += 1;
    setFormat('interactive');
    setBaseline('initial');
    setAssetsState('loading');
    setAssetsError(null);
    setPackageVersion(null);
    setBusy(false);
    setBuildError(null);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      const target = previousFocus.current;
      previousFocus.current = null;
      if (target?.isConnected) target.focus();
      return;
    }
    previousFocus.current = globalThis.document.activeElement instanceof HTMLElement
      ? globalThis.document.activeElement
      : null;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-export-initial-focus]')?.focus();
  }, [open]);

  useEffect(() => () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    const target = previousFocus.current;
    previousFocus.current = null;
    if (target?.isConnected) target.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAssetsState('loading');
    setAssetsError(null);
    prepareShareableHtmlAssets(mode, componentMode, { documentReady, usesExtensionBundle: extensionRoute })
      .then((prepared) => {
        if (cancelled) return;
        setPackageVersion(prepared.version);
        setAssetsState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAssetsError(formatBuildError(error));
        setAssetsState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, componentMode, documentReady, extensionRoute]);

  useEffect(() => {
    if (!currentState && baseline === 'current') setBaseline('initial');
  }, [currentState, baseline]);

  const resolvedImages = useMemo(
    () => compiledDocument ? resolveDocumentImages(compiledDocument, imageAssets) : { references: [], missing: [], images: {} },
    [compiledDocument, imageAssets],
  );
  const publicNames = useMemo(
    () => (compiledDocument
      ? Object.keys(compiledDocument.bindings).filter((name) => !name.startsWith('@')).sort()
      : []),
    [compiledDocument],
  );
  const differences = useMemo(
    () => (compiledDocument && currentState
      ? countParameterDifferences(compiledDocument.initialState, currentState, publicNames)
      : null),
    [compiledDocument, currentState, publicNames],
  );
  const effectiveBaseline: BaselineChoice = currentState && compiledDocument
    ? baseline
    : 'initial';
  const compileProblem = compiledDocument
    ? null
    : pending
      ? copy.compilePending
      : compileError
        ? copy.compileFailed(compileError)
        : copy.compileUnavailable;

  let parameterSummary = copy.noParameters;
  if (compiledDocument && publicNames.length > 0) {
    parameterSummary = currentState
      ? differences === 0
        ? copy.unchanged(publicNames.length)
        : copy.changed(differences ?? 0, publicNames.length)
      : copy.noCurrent;
  }
  const imageSummary = resolvedImages.references.length === 0
    ? copy.imageNone
    : IMAGE_COPY[language].summary(resolvedImages.references.length - resolvedImages.missing.length, resolvedImages.references.length);
  const outputFormat = format === 'pdf' ? copy.pdf : mode === 'interactive' ? copy.outputInteractive : copy.outputStatic;
  const outputSummary = copy.output(
    outputFormat,
    effectiveBaseline === 'current' ? copy.outputCurrent : copy.outputInitial,
  );
  const htmlDisabled = !compiledDocument
    || resolvedImages.missing.length > 0
    || imageBusy
    || assetsState !== 'ready'
    || packageVersion === null
    || busy;

  const handleExport = async () => {
    if (!compiledDocument || !packageVersion || htmlDisabled) return;
    const task = taskRef.current + 1;
    taskRef.current = task;
    setBusy(true);
    setBuildError(null);
    try {
      const generator = { name: DEMO_GENERATOR_NAME, version: packageVersion };
      const values = effectiveBaseline === 'current' && currentState
        ? currentState
        : compiledDocument.initialState;
      const state: LocalStateFile = createLocalStateFile(compiledDocument, values, generator);
      const colorScheme: ShareableColorScheme = dark ? 'dark' : 'light';
      const result = await buildShareableHtml({
        source,
        state,
        mode,
        locale: language,
        colorScheme,
        compileOptions,
        componentMode,
        imageAssets,
      });
      if (task !== taskRef.current) return;
      if (format === 'pdf') {
        if (import.meta.env.DEV) {
          const pdf = await createDemoPdf(result.html);
          if (task !== taskRef.current) return;
          downloadFile(`${baseName}.pdf`, pdf);
        } else {
          await printStaticHtml(result.html, () => task === taskRef.current);
          if (task !== taskRef.current) return;
        }
      } else {
        downloadText(`${baseName}.html`, result.html, 'text/html;charset=utf-8');
      }
      onClose();
    } catch (error) {
      if (task === taskRef.current) setBuildError(formatBuildError(error));
    } finally {
      if (task === taskRef.current) setBusy(false);
    }
  };

  const handleMarkdown = () => {
    if (busy) return;
    taskRef.current += 1;
    onDownloadMarkdown();
    onClose();
  };

  const handleState = () => {
    if (!compiledDocument || !currentState || !packageVersion || busy) return;
    setBuildError(null);
    try {
      const file = createLocalStateFile(
        compiledDocument,
        currentState,
        { name: DEMO_GENERATOR_NAME, version: packageVersion },
      );
      downloadText(
        `${baseName}.state.json`,
        `${serializeLocalState(file)}\n`,
        'application/json;charset=utf-8',
      );
    } catch (error) {
      setBuildError(formatBuildError(error));
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      <header className="export-dialog-head">
        <div>
          <h2 id={titleId}>{copy.title}</h2>
          <p id={descriptionId} className="export-dialog-intro">{copy.description}</p>
        </div>
        <button
          type="button"
          className="export-dialog-close"
          aria-label={copy.close}
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="export-dialog-body">
        <fieldset className="export-fieldset" disabled={busy}>
          <legend>{copy.formatLegend}</legend>
          <label className={`export-option${format === 'interactive' ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={`${titleId}-format`}
              value="interactive"
              checked={format === 'interactive'}
              data-export-initial-focus
              onChange={() => setFormat('interactive')}
            />
            <span className="export-option-copy">
              <strong>{copy.interactive}</strong>
              <span className="export-option-hint">{copy.interactiveHint}</span>
            </span>
          </label>
          <label className={`export-option${format === 'static' ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={`${titleId}-format`}
              value="static"
              checked={format === 'static'}
              onChange={() => setFormat('static')}
            />
            <span className="export-option-copy">
              <strong>{copy.static}</strong>
              <span className="export-option-hint">{copy.staticHint}</span>
            </span>
          </label>
          <label className={`export-option${format === 'pdf' ? ' is-selected' : ''}`}>
            <input type="radio" name={`${titleId}-format`} value="pdf"
              checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
            <span className="export-option-copy">
              <strong>{copy.pdf}</strong>
              <span className="export-option-hint">{import.meta.env.DEV ? copy.pdfHint : copy.printPdfHint}</span>
            </span>
          </label>
        </fieldset>

        <fieldset
          className="export-fieldset"
          disabled={busy}
        >
          <legend>{copy.stateLegend}</legend>
          <label className={`export-option${effectiveBaseline === 'initial' ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={`${titleId}-baseline`}
              value="initial"
              checked={effectiveBaseline === 'initial'}
              onChange={() => setBaseline('initial')}
            />
            <span className="export-option-copy">
              <strong>{copy.authorInitial}</strong>
              <span className="export-option-hint">{copy.authorInitialHint}</span>
            </span>
          </label>
          <label
            className={
              `export-option${effectiveBaseline === 'current' ? ' is-selected' : ''}` +
              (currentState ? '' : ' is-disabled')
            }
          >
            <input
              type="radio"
              name={`${titleId}-baseline`}
              value="current"
              checked={effectiveBaseline === 'current'}
              disabled={!currentState}
              onChange={() => setBaseline('current')}
            />
            <span className="export-option-copy">
              <strong>{copy.currentPreview}</strong>
              <span className="export-option-hint">
                {currentState ? copy.currentPreviewHint : copy.currentUnavailable}
              </span>
            </span>
          </label>
        </fieldset>

        <section className="export-summary" aria-labelledby={summaryId}>
          <h3 id={summaryId}>{copy.summaryLegend}</h3>
          <dl className="export-summary-list">
            <div className="export-summary-row">
              <dt>{copy.summaryParameters}</dt>
              <dd>{parameterSummary}</dd>
            </div>
            <div className="export-summary-row">
              <dt>{copy.summaryImages}</dt>
              <dd>{imageSummary}</dd>
            </div>
          </dl>
          <p className="export-output">{outputSummary}</p>
        </section>

        {resolvedImages.references.length > 0 || imageAssets.length > 0 ? (
          <ImageAssetsPanel assets={imageAssets} references={resolvedImages.references}
            busy={busy || imageBusy} error={imageError} storageError={imageStorageError}
            onFiles={onImageFiles} onRemove={onRemoveImage} allowInsert={false} />
        ) : null}

        {compileProblem ? (
          <p className="export-status is-error" role="alert">{compileProblem}</p>
        ) : null}
        {assetsState === 'loading' ? (
          <p className="export-status" role="status">{copy.assetsLoading}</p>
        ) : null}
        {assetsState === 'error' ? (
          <p className="export-status is-error" role="alert">
            {copy.assetsFailed(assetsError ?? '')}
          </p>
        ) : null}
        {buildError ? (
          <p className="export-status is-error" role="alert">
            {copy.buildFailed(buildError)}
          </p>
        ) : null}
      </div>

      <footer className="export-dialog-actions">
        <div className="export-secondary-actions">
          <button
            type="button"
            className="button button-quiet export-markdown"
            onClick={handleMarkdown}
            disabled={busy}
          >
            {copy.exportMarkdown}
          </button>
          <button
            type="button"
            className="button button-quiet export-state"
            onClick={handleState}
            disabled={busy || !compiledDocument || !currentState || !packageVersion}
            title={currentState ? copy.exportStateHint : copy.exportStateUnavailable}
          >
            {copy.exportState}
          </button>
        </div>
        <div className="export-action-group">
          <button type="button" className="button button-secondary" onClick={requestClose}>
            {copy.cancel}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleExport}
            disabled={htmlDisabled}
          >
            {busy ? copy.preparing : format === 'pdf' ? (import.meta.env.DEV ? copy.exportPdf : copy.printPdf) : copy.exportHtml}
          </button>
        </div>
      </footer>
    </dialog>
  );
}
