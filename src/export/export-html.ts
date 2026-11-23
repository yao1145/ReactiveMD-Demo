import { createElement } from 'react';
import {
  compileLocal,
  createLocalRuntime,
  createShareableHtml,
  resolveLocalStateBaseline,
  type Diagnostic,
  type LocalCompileOptions,
  type LocalDocument,
  type LocalNode,
  type LocalStateFile,
  type LocalValue,
} from 'reactive-md';
import { LocalDocumentView, type LocalDocumentViewProps } from 'reactive-md/react';
import { createLocalShareableHtml, type LocalStandaloneBundle } from 'reactive-md/export';
import type { EditorComponentMode } from 'reactive-md-editor';
import { getDemoHost } from '../settings/component-mode';
import { toCapabilityGrants } from '../settings/html-options';
import { imagePolicy, resolveDocumentImages, validateImageManifest, type ImageAsset } from '../images/image-assets';



export const DEMO_GENERATOR_NAME = 'reactive-md-demo';
export const FALLBACK_DOCUMENT_TITLE = 'Reactive MD document';
const FALLBACK_PACKAGE_VERSION = '0.0.0';

export type ShareableHtmlMode = 'interactive' | 'static';
export type ShareableColorScheme = 'light' | 'dark' | 'auto';
export type ShareableHtmlStage = 'compile' | 'assets' | 'bundle' | 'render';

export interface ShareableHtmlBuildOptions {
  onStage?: (stage: ShareableHtmlStage) => void;
  source: string;
  state: LocalStateFile;
  mode: ShareableHtmlMode;
  locale?: 'en' | 'zh';
  colorScheme?: ShareableColorScheme;
  /** Routing options granted in the demo; the same policy must reach the export. */
  compileOptions?: LocalCompileOptions;
  componentMode?: EditorComponentMode;
  /** Optional override; otherwise the first heading supplies the title. */
  title?: string;
  imageAssets?: readonly ImageAsset[];
}

export interface ShareableHtmlBuildResult {
  html: string;
  title: string;
  imageCount: number;
  document: LocalDocument;
}

export interface PreparedShareableAssets {
  version: string;
}

/** Full document stylesheet or the 18-tag minimal preset sheet. */
export type ShareableStyleSet = 'base' | 'minimal';

export interface ShareableAssetPlan {
  readonly styles: ShareableStyleSet;
  /**
   * The default single-file runtime. Extension routes carry their own bundle
   * script instead, so loading the baseline runtime would be wasted work.
   */
  readonly runtime: boolean;
}

/**
 * Whether an export must carry a host extension bundle instead of the default
 * standalone runtime. This is the routing decision preparation and the build
 * must share.
 */
export function documentUsesExtensionBundle(
  document: LocalDocument | null,
  componentMode: EditorComponentMode = 'default',
): boolean {
  if (componentMode === 'minimal') return true;
  // While the source is still compiling there is no document to route on.
  if (!document) return false;
  const { config } = getDemoHost(componentMode);
  return Boolean(
    document.extensions?.components.length
    || config.themes.some(theme => theme.name === document.theme),
  );
}

/**
 * The generated artifacts a route needs. Preparation and the build share this
 * plan so opening the dialog never fetches the 3.85 MB baseline runtime or the
 * full stylesheet for a minimal export.
 */
export function resolveShareableAssetPlan(
  mode: ShareableHtmlMode,
  componentMode: EditorComponentMode = 'default',
  usesExtensionBundle = componentMode === 'minimal',
): ShareableAssetPlan {
  const minimal = componentMode === 'minimal';
  return {
    styles: minimal ? 'minimal' : 'base',
    runtime: mode === 'interactive' && !usesExtensionBundle,
  };
}

/** A build failure with optional compiler or state diagnostics. */
export class ShareableHtmlBuildError extends Error {
  readonly diagnostics: readonly Diagnostic[];

  constructor(message: string, diagnostics: readonly Diagnostic[] = []) {
    super(message);
    this.name = 'ShareableHtmlBuildError';
    this.diagnostics = diagnostics;
  }
}

/** The generated CSS/runtime/notices artifacts are unavailable. */
export class ShareableAssetsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareableAssetsError';
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ */
/* Pure helpers (also used by the dialog summary)                      */
/* ------------------------------------------------------------------ */

/** Parse the version from a package.json payload; never fail on bad input. */
export function readPackageVersion(raw: string): string {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const version = (value as { version?: unknown }).version;
      if (typeof version === 'string' && version.trim()) return version.trim();
    }
  } catch {
    // Fall through to the stable placeholder.
  }
  return FALLBACK_PACKAGE_VERSION;
}

function plainText(node: LocalNode): string {
  if (node.type === 'image') return node.alt ?? '';
  if (node.type === 'break') return ' ';
  let text = typeof node.value === 'string' ? node.value : '';
  for (const child of node.children ?? []) text += plainText(child);
  return text;
}

function firstHeading(nodes: LocalNode[]): LocalNode | null {
  for (const node of nodes) {
    if (node.type === 'heading') return node;
    const nested = firstHeading(node.children ?? []);
    if (nested) return nested;
  }
  return null;
}

/** Plain text of the first heading, or the stable fallback title. */
export function deriveDocumentTitle(document: LocalDocument): string {
  const heading = firstHeading(document.nodes);
  const title = heading ? plainText(heading).replace(/\s+/g, ' ').trim() : '';
  return title || FALLBACK_DOCUMENT_TITLE;
}

/** All Markdown image nodes, including images inside component children. */
export function collectImageNodes(document: LocalDocument): LocalNode[] {
  const images: LocalNode[] = [];
  const walk = (nodes: LocalNode[]) => {
    for (const node of nodes) {
      if (node.type === 'image') images.push(node);
      if (node.children) walk(node.children);
    }
  };
  walk(document.nodes);
  return images;
}

export function countDocumentImages(document: LocalDocument): number {
  return collectImageNodes(document).length;
}

function sameLocalValue(left: LocalValue, right: LocalValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
  }
  return Object.is(left, right);
}

/**
 * Count exported parameters whose values differ. Arrays compare by content and
 * order, matching the serialized state format.
 */
export function countParameterDifferences(
  initial: Readonly<Record<string, LocalValue>>,
  current: Readonly<Record<string, LocalValue>>,
  names?: readonly string[],
): number {
  const keys = names
    ? [...new Set(names)]
    : [...new Set([...Object.keys(initial), ...Object.keys(current)])];
  let count = 0;
  for (const name of keys) {
    if (!Object.hasOwn(initial, name) || !Object.hasOwn(current, name)) {
      count += 1;
      continue;
    }
    if (!sameLocalValue(initial[name], current[name])) count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* Generated raw artifacts                                             */
/* ------------------------------------------------------------------ */

interface PackageMetadata {
  packageVersion: string;
}

/** A successful host bundle, or the build error that replaced it. */
type HostBundle = LocalStandaloneBundle & { configKey: string; notices: string };
type HostBundleLoad = HostBundle | { error: string; diagnostics: readonly Diagnostic[] };
type HostBundleModule = { readonly default: HostBundleLoad };

let packageMetadataPromise: Promise<PackageMetadata> | null = null;
let baseCssPromise: Promise<string> | null = null;
let minimalCssPromise: Promise<string> | null = null;
let noticesPromise: Promise<string> | null = null;
let runtimeScriptPromise: Promise<string> | null = null;
let minimalBundlePromise: Promise<HostBundleModule> | null = null;
let defaultBundlePromise: Promise<HostBundleModule> | null = null;

function resetFailed<T>(promise: Promise<T>, reset: () => void): Promise<T> {
  promise.catch(() => reset());
  return promise;
}

function assetsFailure(error: unknown): Error {
  return error instanceof ShareableAssetsError
    ? error
    : new ShareableAssetsError(errorText(error));
}

/** Package metadata only; cheap enough to load for every route. */
function loadPackageMetadata(): Promise<PackageMetadata> {
  if (!packageMetadataPromise) {
    packageMetadataPromise = resetFailed(
      import('virtual:reactive-md-assets/package-json')
        .then((packageJson) => ({ packageVersion: readPackageVersion(packageJson.default) }))
        .catch((error: unknown) => {
          throw assetsFailure(error);
        }),
      () => {
        packageMetadataPromise = null;
      },
    );
  }
  return packageMetadataPromise;
}

function loadBaseCss(): Promise<string> {
  if (!baseCssPromise) {
    baseCssPromise = resetFailed(
      Promise.all([
        import('virtual:reactive-md-assets/base-css'),
        import('virtual:reactive-md-assets/print-css'),
      ])
        .then(([css, printCss]) => {
          if (!css.default.trim()) {
            throw new ShareableAssetsError('The generated document stylesheet is empty.');
          }
          return `${css.default}\n${printCss.default}`;
        })
        .catch((error: unknown) => {
          throw assetsFailure(error);
        }),
      () => {
        baseCssPromise = null;
      },
    );
  }
  return baseCssPromise;
}

/** The 18-tag preset stylesheet; never pulls the full document stylesheet. */
function loadMinimalCss(): Promise<string> {
  if (!minimalCssPromise) {
    minimalCssPromise = resetFailed(
      Promise.all([
        import('virtual:reactive-md-assets/minimal-css'),
        import('virtual:reactive-md-assets/print-css'),
      ])
        .then(([css, printCss]) => {
          if (!css.default.trim()) {
            throw new ShareableAssetsError('The generated minimal stylesheet is empty.');
          }
          return `${css.default}\n${printCss.default}`;
        })
        .catch((error: unknown) => {
          throw assetsFailure(error);
        }),
      () => {
        minimalCssPromise = null;
      },
    );
  }
  return minimalCssPromise;
}

function loadNotices(): Promise<string> {
  if (!noticesPromise) {
    noticesPromise = resetFailed(
      import('virtual:reactive-md-assets/notices')
        .then(module => module.default)
        .catch((error: unknown) => {
          throw assetsFailure(error);
        }),
      () => {
        noticesPromise = null;
      },
    );
  }
  return noticesPromise;
}

function loadRuntimeScript(): Promise<string> {
  if (!runtimeScriptPromise) {
    runtimeScriptPromise = resetFailed(
      import('virtual:reactive-md-assets/runtime')
        .then((module) => {
          if (!module.default.trim()) {
            throw new ShareableAssetsError('The generated standalone runtime is empty.');
          }
          return module.default;
        })
        .catch((error: unknown) => {
          throw assetsFailure(error);
        }),
      () => {
        runtimeScriptPromise = null;
      },
    );
  }
  return runtimeScriptPromise;
}

/**
 * Load a host bundle once. Import failures reset the cache so a retry after
 * restarting the dev server can succeed; a bundle that reports its own build
 * error stays cached and fails later with its diagnostics.
 */
function loadBundleModule(
  importer: () => Promise<HostBundleModule>,
  reset: () => void,
): Promise<HostBundleModule> {
  return resetFailed(
    importer()
      // A bundle that reports its own build error resolved successfully, so
      // only a failed import becomes a `ShareableAssetsError`.
      .catch((error: unknown) => {
        throw assetsFailure(error);
      }),
    reset,
  );
}

function loadMinimalBundle(): Promise<HostBundleModule> {
  if (!minimalBundlePromise) {
    minimalBundlePromise = loadBundleModule(
      () => import('virtual:reactive-md-minimal-bundle'),
      () => {
        minimalBundlePromise = null;
      },
    );
  }
  return minimalBundlePromise;
}

/** The default host bundle replayed by interactive documents with extensions. */
function loadDefaultBundle(): Promise<HostBundleModule> {
  if (!defaultBundlePromise) {
    defaultBundlePromise = loadBundleModule(
      () => import('virtual:reactive-md/bundle'),
      () => {
        defaultBundlePromise = null;
      },
    );
  }
  return defaultBundlePromise;
}

/**
 * Load the route's export payload ahead of the click. A bundle that reports its
 * own build error is not treated as an asset failure; the build surfaces its
 * diagnostics at export time.
 */
function warmExtensionBundle(minimal: boolean): Promise<void> {
  return (minimal ? loadMinimalBundle() : loadDefaultBundle()).then(() => undefined);
}

/** Route-selected stylesheet; preparation and the build share this function. */
export function loadShareableStyles(styles: ShareableStyleSet): Promise<string> {
  return styles === 'minimal' ? loadMinimalCss() : loadBaseCss();
}

export interface ShareablePrepareOptions {
  /** False while the source is still compiling; only metadata is prepared. */
  readonly documentReady?: boolean;
  /** Route through the host extension bundle instead of the default runtime. */
  readonly usesExtensionBundle?: boolean;
}

/**
 * Load the build artifacts the dialog needs and report the package version.
 * Only the route's own stylesheet and runtime are fetched: a minimal export
 * never downloads the full stylesheet or the 3.85 MB baseline runtime, and an
 * extension export warms its bundle instead of the baseline runtime. Until the
 * source compiles there is no valid route or output, so only metadata loads.
 * Rejecting with `ShareableAssetsError` means the demo was not built yet; a
 * failed cache resets so reopening the dialog retries.
 */
export async function prepareShareableHtmlAssets(
  mode: ShareableHtmlMode,
  componentMode: EditorComponentMode = 'default',
  options: ShareablePrepareOptions = {},
): Promise<PreparedShareableAssets> {
  const usesExtensionBundle = options.usesExtensionBundle ?? componentMode === 'minimal';
  const plan = resolveShareableAssetPlan(mode, componentMode, usesExtensionBundle);
  const metadata = loadPackageMetadata();
  const warm: Promise<unknown>[] = [];
  if (options.documentReady !== false) {
    warm.push(loadShareableStyles(plan.styles));
    if (plan.runtime) warm.push(loadRuntimeScript());
    else if (mode === 'interactive') warm.push(warmExtensionBundle(componentMode === 'minimal'));
  }
  const [info] = await Promise.all([metadata, Promise.all(warm)]);
  return { version: info.packageVersion };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

function diagnosticsMessage(prefix: string, diagnostics: readonly Diagnostic[]): string {
  const detail = diagnostics
    .slice(0, 3)
    .map((item) => `${item.line}:${item.column} ${item.message}`)
    .join(' ');
  return detail ? `${prefix} ${detail}` : prefix;
}

export function formatBuildError(error: unknown): string {
  if (error instanceof ShareableHtmlBuildError && error.diagnostics.length) {
    return diagnosticsMessage(error.message, error.diagnostics);
  }
  return errorText(error);
}

/**
 * Compile the source, rebase the selected state as the document baseline, render
 * trusted static markup, and wrap it with the verified document image manifest.
 */
export async function buildShareableHtml(
  options: ShareableHtmlBuildOptions,
): Promise<ShareableHtmlBuildResult> {
  const reportStage = (stage: ShareableHtmlStage) => {
    try { options.onStage?.(stage); } catch { /* Telemetry cannot affect an export. */ }
  };
  reportStage('compile');
  const minimal = options.componentMode === 'minimal';
  const { config: demoConfig, reactConfig, resources, notices } = getDemoHost(options.componentMode);
  const { source, state, mode } = options;
  const locale: 'en' | 'zh' = options.locale === 'zh' ? 'zh' : 'en';
  const colorScheme: ShareableColorScheme = options.colorScheme ?? 'auto';

  const compileOptions = { ...options.compileOptions, config: options.compileOptions?.config ?? demoConfig };
  const compiled = compileLocal(source, compileOptions);
  if (!compiled.ok) {
    throw new ShareableHtmlBuildError('The document does not compile.', compiled.diagnostics);
  }
  const document = compiled.document;
  reportStage('assets');
  const usesExtensions = documentUsesExtensionBundle(document, options.componentMode);
  if (usesExtensions && compileOptions.config.key !== demoConfig.key) {
    throw new ShareableHtmlBuildError('This document requires an extension configuration that is not installed in the Demo.');
  }
  const imageCount = countDocumentImages(document);
  const resolved = resolveDocumentImages(document, validateImageManifest(options.imageAssets ?? []));
  if (resolved.missing.length > 0) {
    throw new ShareableHtmlBuildError(
      `Choose files for these image references before exporting: ${resolved.missing.join(', ')}`,
    );
  }

  const baseline = resolveLocalStateBaseline(document, state);
  if (!baseline.ok) {
    throw new ShareableHtmlBuildError(
      'The selected state does not match this document.',
      baseline.diagnostics,
    );
  }

  // Preparation and the build use one plan: the same stylesheet and runtime
  // choice, so an already-primed route never needs a second large fetch.
  const plan = resolveShareableAssetPlan(mode, options.componentMode, usesExtensions);
  const [css, extensionNoticesBase, metadata] = await Promise.all([
    loadShareableStyles(plan.styles),
    loadNotices(),
    loadPackageMetadata(),
  ]);
  const packageVersion = metadata.packageVersion;
  const runtimeScript = plan.runtime ? await loadRuntimeScript() : '';
  let bundle: LocalStandaloneBundle | undefined;
  let extensionNotices = usesExtensions
    ? notices.map(notice => [notice.id, notice.license, notice.text].filter(Boolean).join('\n')).join('\n\n')
    : '';
  if (usesExtensions && mode === 'interactive') {
    reportStage('bundle');
    // Vite updates the default export in place during a theme refresh.
    const { default: built } = await (minimal ? loadMinimalBundle() : loadDefaultBundle());
    if ('error' in built) throw new ShareableHtmlBuildError(built.error, built.diagnostics);
    if (built.configKey !== demoConfig.key) {
      throw new ShareableAssetsError('The extension bundle is stale. Restart or rebuild the Demo.');
    }
    bundle = built;
    extensionNotices = built.notices;
  }
  const title = options.title?.trim() || deriveDocumentTitle(document);
  reportStage('render');
  const runtime = createLocalRuntime(baseline.baseline.document);
  let staticMarkup: string;
  try {
    const { renderToString } = await import('react-dom/server');
    // `staticFirst` keeps the server markup identical to the interactive
    // hydration pass, so the single-file export shows a static first screen.
    const viewProps: LocalDocumentViewProps & { staticFirst?: boolean } = {
      ...imagePolicy(resolved.images),
      document: baseline.baseline.document,
      runtime,
      // The precompiled document carries its compile-time ceiling; the same
      // grants the interactive build used are passed so SSR and static output
      // render the identical capability set.
      capabilityGrants: toCapabilityGrants(compileOptions),
      mode,
      staticFirst: mode === 'interactive',
      locale,
      colorScheme,
    };
    if (usesExtensions) {
      const { renderLocalStaticDocument } = await import('reactive-md/react/server');
      const rendered = renderLocalStaticDocument({ ...viewProps, reactConfig, resources });
      if (!rendered.ok) throw new ShareableHtmlBuildError('Extension static rendering failed.', rendered.diagnostics);
      staticMarkup = rendered.markup;
    } else {
      staticMarkup = renderToString(createElement(LocalDocumentView, viewProps));
    }
  } finally {
    runtime.dispose();
  }

  const htmlOptions = {
    title,
    source,
    state,
    staticMarkup,
    css,
    mode,
    runtimeScript: mode === 'interactive' ? runtimeScript : undefined,
    locale,
    colorScheme,
    compileOptions,
    generator: { name: DEMO_GENERATOR_NAME, version: packageVersion },
    assets: 'inline' as const,
    imageCount,
    images: resolved.images,
    notices: `${extensionNoticesBase}\n${extensionNotices}`,
  };
  const html = usesExtensions
    ? createLocalShareableHtml({ ...htmlOptions, document, config: demoConfig, resources, bundle })
    : createShareableHtml(htmlOptions);

  return { html, title, imageCount, document: baseline.baseline.document };
}
