import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  compileLocal,
  localCompileOptionsKey,
  type LocalCompileOptions,
  type LocalDocument,
  type LocalNode,
} from 'reactive-md';
import { ExportDialog } from '../src/export/export-dialog';
import { samePreviewScripts } from '../src/compilation/capability-preview';
import { PreviewStateSession } from '../src/compilation/preview-state';
import { HtmlCompatibilityControls } from '../src/settings/html-compatibility';
import {
  DEFAULT_HTML_OPTIONS,
  freshHtmlOptions,
  isDefaultHtmlOptions,
  toCapabilityGrants,
  toCompileOptions,
  type DemoHtmlOptions,
} from '../src/settings/html-options';
import { COPY, LanguageProvider } from '../src/ui/i18n';

const EMPTY_DOCUMENT: LocalDocument = {
  syntax: 'local',
  source: '<p>Native HTML</p>',
  nodes: [],
  initialState: {},
  bindings: {},
};

/** Capability fields read structurally so the check survives either engine build. */
interface CapabilityFields {
  html?: unknown;
  capabilities?: { styles?: readonly unknown[]; scripts?: readonly unknown[] };
}

/**
 * Whether the compile result kept the author stylesheet. A mixed document
 * records it under `capabilities`; a legacy whole-document result carries the
 * sanitized `html` policy. Both mean the CSS grant reached the compiler.
 */
function recordsCss(document: LocalDocument): boolean {
  const fields = document as unknown as CapabilityFields;
  return (fields.capabilities?.styles?.length ?? 0) > 0 || fields.html !== undefined;
}

function recordsJavaScript(document: LocalDocument): boolean {
  return ((document as unknown as CapabilityFields).capabilities?.scripts?.length ?? 0) > 0;
}

function flatten(nodes: LocalNode[]): LocalNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

function compile(source: string, options?: LocalCompileOptions): LocalDocument {
  const result = compileLocal(source, options);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.document;
}

function options(overrides: Partial<DemoHtmlOptions> = {}): DemoHtmlOptions {
  return { ...DEFAULT_HTML_OPTIONS, ...overrides };
}

const CONVERTED = toCompileOptions(options())!;

describe('HTML capability options', () => {
  it('starts with CSS granted and author JavaScript and extended HTML disabled', () => {
    expect(DEFAULT_HTML_OPTIONS).toEqual({
      enableCss: true,
      enableJavaScript: false,
      enableExtendedHtml: false,
    });
    expect(freshHtmlOptions()).toEqual(DEFAULT_HTML_OPTIONS);
    expect(isDefaultHtmlOptions(DEFAULT_HTML_OPTIONS)).toBe(true);
    expect(isDefaultHtmlOptions(options({ enableCss: false }))).toBe(false);
  });

  it('always writes the three flags so an explicit false is kept', () => {
    expect(toCompileOptions(undefined)).toBeUndefined();
    expect(CONVERTED).toEqual({
      enableCss: true,
      enableJavaScript: false,
      enableExtendedHtml: false,
    });
    expect(toCompileOptions({ enableCss: false })).toEqual({
      enableCss: false,
      enableJavaScript: false,
      enableExtendedHtml: false,
    });
    expect(toCompileOptions({ enableJavaScript: true })).toEqual({
      enableCss: true,
      enableJavaScript: true,
      enableExtendedHtml: false,
    });
  });

  it('keeps compile limits while converting the switches', () => {
    expect(toCompileOptions({ ...options({ enableExtendedHtml: true }), limits: { maxSyntaxNodes: 42 } }))
      .toEqual({
        enableCss: true,
        enableJavaScript: false,
        enableExtendedHtml: true,
        limits: { maxSyntaxNodes: 42 },
      });
  });

  it('passes only capability flags as mount grants', () => {
    expect(toCapabilityGrants(undefined)).toBeUndefined();
    expect(toCapabilityGrants(CONVERTED)).toEqual({
      enableCss: true,
      enableJavaScript: false,
      enableExtendedHtml: false,
    });
    // Compile-only fields never become mount grants.
    expect(toCapabilityGrants({
      ...toCompileOptions({ enableCss: false }),
      limits: { maxSyntaxNodes: 42 },
    })).toEqual({
      enableCss: false,
      enableJavaScript: false,
      enableExtendedHtml: false,
    });
  });

  it('gives each capability switch its own compile key', () => {
    const key = localCompileOptionsKey;
    // An omitted flag and the same explicit value are the same permission.
    expect(key(CONVERTED)).toBe(key(undefined));
    // Turning CSS off is not the default: the package default is CSS on.
    expect(key(toCompileOptions({ enableCss: false }))).not.toBe(key(undefined));
    expect(key(toCompileOptions({ enableJavaScript: true }))).not.toBe(key(undefined));
    expect(key(toCompileOptions({ enableExtendedHtml: true }))).not.toBe(key(undefined));
    const keys = [
      toCompileOptions({ enableCss: false }),
      toCompileOptions({ enableJavaScript: true }),
      toCompileOptions({ enableExtendedHtml: true }),
    ].map((granted) => key(granted));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('records author styles only while CSS is granted', () => {
    const source = '<css>\nh1 { color: red; }\n</css>\n\n# Heading';
    const withCss = compileLocal(source, CONVERTED);
    const withoutCss = compileLocal(source, toCompileOptions({ enableCss: false }));
    expect(withCss.ok).toBe(true);
    expect(withoutCss.ok).toBe(true);
    if (withCss.ok && withoutCss.ok) {
      expect(recordsCss(withCss.document)).toBe(true);
      expect(recordsCss(withoutCss.document)).toBe(false);
      expect(withCss.document.bindings).toEqual({});
      expect(withoutCss.document.bindings).toEqual({});
    }
  });

  it('withholds author scripts but keeps bindings when JavaScript is off', () => {
    const source = '<number label="Amount" bind="amount" initial="2" min="0" max="20">\n\n<javascript>\nawait rmd.set("amount", 4)\n</javascript>';
    const withheld = compileLocal(source, toCompileOptions({ enableCss: false, enableJavaScript: false }));
    expect(withheld.ok).toBe(true);
    if (withheld.ok) {
      expect(recordsJavaScript(withheld.document)).toBe(false);
      expect(Object.keys(withheld.document.bindings)).toEqual(['amount']);
      expect(withheld.document.initialState.amount).toBe(2);
    }
  });

  it('keeps bindings available when no optional capability is granted', () => {
    const source = '<number label="Amount" bind="amount" initial="2" min="0" max="20">\n\nValue: {{ amount }}';
    const safe = compileLocal(source);
    const explicit = compileLocal(source, toCompileOptions({ enableCss: false }));
    expect(safe.ok).toBe(true);
    expect(explicit.ok).toBe(true);
    if (safe.ok && explicit.ok) {
      expect(Object.keys(safe.document.bindings)).toEqual(['amount']);
      expect(Object.keys(explicit.document.bindings)).toEqual(['amount']);
    }
  });
});

describe('capability switches in the preview session', () => {
  const SLIDER = '<slider bind="people" label="People" initial="2" min="1" max="20">';

  function control(document: LocalDocument, bind: string): LocalNode {
    const node = flatten(document.nodes).find((item) => item.attrs?.bind === bind);
    if (!node) throw new Error(`Missing binding ${bind}`);
    return node;
  }

  it('keeps the same binding value while CSS and extended HTML are toggled', () => {
    const session = new PreviewStateSession();
    const first = compile(SLIDER, toCompileOptions({ enableCss: true }));
    const active = session.open(first);
    expect(active.runtime.snapshot().state.people).toBe(2);
    active.runtime.set(control(first, 'people'), 12);
    active.release();

    for (const options of [
      toCompileOptions({ enableCss: false }),
      toCompileOptions({ enableCss: false, enableExtendedHtml: true }),
      toCompileOptions({ enableCss: true, enableExtendedHtml: true }),
      toCompileOptions({ enableCss: true }),
    ]) {
      const document = compile(SLIDER, options);
      const lease = session.open(document);
      expect(lease.runtime.snapshot().state.people).toBe(12);
      expect(session.currentState(document)?.people).toBe(12);
      lease.release();
    }
  });

  it('keeps the reader value when a granted script is switched off', () => {
    const source = `${SLIDER}\n\n<javascript>\nawait rmd.set("people", 10)\n</javascript>`;
    const session = new PreviewStateSession();
    const granted = compile(source, toCompileOptions({ enableJavaScript: true }));
    expect(recordsJavaScript(granted)).toBe(true);
    const active = session.open(granted);
    active.runtime.set(control(granted, 'people'), 12);
    active.release();
    // Withholding the script leaves ordinary RMD state alone: the still-valid
    // reader value survives, while no script session is created for the mount.
    const withheld = compile(source, toCompileOptions({ enableCss: false }));
    expect(recordsJavaScript(withheld)).toBe(false);
    expect(Object.keys(withheld.bindings)).toEqual(['people']);
    const next = session.open(withheld);
    expect(next.runtime.snapshot().state.people).toBe(12);
    next.release();
  });
});

describe('preview script grants', () => {
  const SCRIPT_SOURCE = [
    '<slider bind="people" label="People" initial="2" min="1" max="20">',
    '',
    '## Notes',
    '',
    'Prose before the script.',
    '',
    '<javascript>',
    'await rmd.set("people", 10)',
    '</javascript>',
  ].join('\n');

  it('keeps the grant while an uncompiled prose edit leaves the script intact', () => {
    const document = compile(SCRIPT_SOURCE, toCompileOptions({ enableJavaScript: true }));
    expect(recordsJavaScript(document)).toBe(true);
    expect(samePreviewScripts(document, SCRIPT_SOURCE.replace('Prose', 'Edited prose'))).toBe(true);
  });

  it('withdraws the grant as soon as the edit touches the script or its tag', () => {
    const document = compile(SCRIPT_SOURCE, toCompileOptions({ enableJavaScript: true }));
    expect(samePreviewScripts(document, SCRIPT_SOURCE.replace('10', '11'))).toBe(false);
    expect(samePreviewScripts(document, SCRIPT_SOURCE.replace('<javascript>', '<javascript >'))).toBe(false);
    expect(samePreviewScripts(document, SCRIPT_SOURCE.replace('</javascript>', ''))).toBe(false);
  });

  it('does not restrict the grant when the document has no script', () => {
    const document = compile('<slider bind="people" label="People" initial="2" min="1" max="20">',
      toCompileOptions({ enableJavaScript: true }));
    expect(recordsJavaScript(document)).toBe(false);
    expect(samePreviewScripts(document, 'anything at all')).toBe(true);
  });
});

describe('HTML capability controls', () => {
  it('renders three independent toggles with only CSS checked by default', () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider language="en">
        <HtmlCompatibilityControls options={options()} onChange={() => {}} />
      </LanguageProvider>,
    );
    expect(markup.match(/type="checkbox"/g)).toHaveLength(3);
    expect(markup.match(/checked=""/g) ?? []).toHaveLength(1);
    expect(markup).toContain(COPY.en.htmlCompatibility.enabled('CSS'));
    expect(markup).toContain(COPY.en.htmlCompatibility.css);
    expect(markup).toContain(COPY.en.htmlCompatibility.javascript);
    expect(markup).toContain(COPY.en.htmlCompatibility.extendedHtml);
  });

  it('reports each additional capability that is turned on', () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider language="zh">
        <HtmlCompatibilityControls
          options={options({ enableJavaScript: true, enableExtendedHtml: true })}
          onChange={() => {}}
        />
      </LanguageProvider>,
    );
    expect(markup.match(/checked=""/g) ?? []).toHaveLength(3);
    expect(markup).toContain(
      COPY.zh.htmlCompatibility.enabled('CSS, JavaScript, 扩展 HTML'),
    );
  });

  it('reports no enabled capability when CSS is turned off', () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider language="en">
        <HtmlCompatibilityControls options={options({ enableCss: false })} onChange={() => {}} />
      </LanguageProvider>,
    );
    expect(markup.match(/checked=""/g) ?? []).toHaveLength(0);
    expect(markup).toContain(COPY.en.htmlCompatibility.none);
  });

  it('keeps both locales complete and distinct', () => {
    expect(COPY.en.htmlCompatibility.css).toBe('CSS');
    expect(COPY.zh.htmlCompatibility.css).toBe('CSS');
    expect(COPY.en.htmlCompatibility.javascript).toBe('JavaScript');
    expect(COPY.zh.htmlCompatibility.javascript).toBe('JavaScript');
    expect(COPY.zh.htmlCompatibility.extendedHtml).toContain('HTML');
    expect(COPY.en.htmlCompatibility.extendedHtml).not.toBe(COPY.zh.htmlCompatibility.extendedHtml);
    expect(COPY.en.htmlCompatibility.enabled('CSS')).toBe('Enabled: CSS');
    expect(COPY.zh.htmlCompatibility.enabled('CSS')).toBe('已开启：CSS');
  });
});

function exportMarkup(props: {
  compileOptions?: LocalCompileOptions;
  currentState: Readonly<Record<string, never>> | null;
  language?: 'en' | 'zh';
}) {
  return renderToStaticMarkup(
    <LanguageProvider language={props.language ?? 'en'}>
      <ExportDialog
        imageAssets={[]} imageBusy={false} imageError={null} imageStorageError={false}
        onImageFiles={() => {}} onRemoveImage={() => {}}
        open
        source="# Hello"
        baseName="demo"
        document={{ ...EMPTY_DOCUMENT, source: '# Hello' }}
        currentState={props.currentState}
        pending={false}
        compileError={null}
        compileOptions={props.compileOptions}
        dark={false}
        onClose={() => {}}
        onDownloadMarkdown={() => {}}
      />
    </LanguageProvider>,
  );
}

describe('export dialog with capability switches', () => {
  it('offers the same parameters, images and state export on the default route', () => {
    const markup = exportMarkup({ compileOptions: CONVERTED, currentState: {} });
    expect(markup).toContain(COPY.en.exportDialog.noParameters);
    expect(markup).toContain(COPY.en.exportDialog.imageNone);
    expect(markup).toContain(COPY.en.exportDialog.exportMarkdown);
    expect(markup).toContain(COPY.en.exportDialog.exportState);
    expect(markup).not.toContain(COPY.en.exportDialog.exportStateUnavailable);
  });

  it('keeps the current-preview baseline available with any capability grant', () => {
    const markup = exportMarkup({
      compileOptions: toCompileOptions({ enableCss: false, enableJavaScript: true }),
      currentState: {},
    });
    expect(markup).toContain(COPY.en.exportDialog.currentPreviewHint);
    expect(markup).not.toContain(COPY.en.exportDialog.currentUnavailable);
    expect(markup).not.toContain(COPY.en.exportDialog.exportStateUnavailable);
  });

  it('disables the current-preview baseline only when no preview state is running', () => {
    const markup = exportMarkup({ compileOptions: CONVERTED, currentState: null });
    expect(markup).toContain(COPY.en.exportDialog.currentUnavailable);
    expect(markup).toContain(COPY.en.exportDialog.exportStateUnavailable);
  });

  it('omits the retired whole-document HTML wording in both locales', () => {
    for (const language of ['en', 'zh'] as const) {
      const markup = exportMarkup({ compileOptions: CONVERTED, currentState: {}, language });
      const copy = COPY[language].exportDialog;
      const notice = language === 'en'
        ? 'Native HTML mode is active'
        : '当前为原生 HTML 模式';
      expect(markup).not.toContain(notice);
      expect(markup).toContain(copy.output(copy.outputInteractive, copy.outputInitial));
    }
  });
});
