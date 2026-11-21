import type { LocalCompileOptions, LocalHtmlOptions } from 'reactive-md';

/**
 * Demo-owned capability switches. CSS is granted by default; author JavaScript
 * and extended HTML start disabled. Every switch is held explicitly so turning
 * CSS off cannot be mistaken for "use the package default".
 */
export type DemoHtmlOptions = Required<LocalHtmlOptions>;

export const DEFAULT_HTML_OPTIONS: DemoHtmlOptions = Object.freeze({
  enableCss: true,
  enableJavaScript: false,
  enableExtendedHtml: false,
});

export function freshHtmlOptions(): DemoHtmlOptions {
  return { ...DEFAULT_HTML_OPTIONS };
}

export function isDefaultHtmlOptions(options: DemoHtmlOptions): boolean {
  return options.enableCss === DEFAULT_HTML_OPTIONS.enableCss
    && options.enableJavaScript === DEFAULT_HTML_OPTIONS.enableJavaScript
    && options.enableExtendedHtml === DEFAULT_HTML_OPTIONS.enableExtendedHtml;
}

/**
 * Mount grants derived from compile options. Only the three capability flags
 * are copied: a precompiled document intersects them with its compile-time
 * ceiling, and unrelated compile fields have no meaning as a mount grant.
 */
export function toCapabilityGrants(options?: LocalCompileOptions | null): LocalHtmlOptions | undefined {
  if (!options) return undefined;
  return {
    enableCss: options.enableCss ?? DEFAULT_HTML_OPTIONS.enableCss,
    enableJavaScript: options.enableJavaScript ?? DEFAULT_HTML_OPTIONS.enableJavaScript,
    enableExtendedHtml: options.enableExtendedHtml ?? DEFAULT_HTML_OPTIONS.enableExtendedHtml,
  };
}

/**
 * Convert the demo switches into the compile option shape. The demo always
 * writes all three flags: an explicit `false` for CSS must produce a different
 * compile key than an omitted flag, whose package default is CSS on.
 * Omitted input still means "package defaults" and returns nothing.
 */
export function toCompileOptions(options?: LocalCompileOptions | null): LocalCompileOptions | undefined {
  const grants = toCapabilityGrants(options);
  if (!grants) return undefined;
  return {
    ...grants,
    ...(options?.limits ? { limits: options.limits } : {}),
  };
}
