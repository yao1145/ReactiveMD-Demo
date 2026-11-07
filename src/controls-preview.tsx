import { StrictMode, createElement, useCallback, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  compileLocal,
  createLocalRuntime,
  createLocalStateFile,
} from 'reactive-md';
import {
  LocalDocumentView,
  LocalReactiveDocument,
  createReactHost,
} from 'reactive-md/react';
import {
  config as demoConfig,
  reactConfig as demoReactConfig,
} from 'virtual:reactive-md/host';
import baseCss from 'virtual:reactive-md-assets/base-css';
import printCss from 'virtual:reactive-md-assets/print-css';
import labCss from './controls-preview.css?raw';
import { controlsTheme } from './controls-theme';
import {
  buttonLabCss,
  buttonLabPackage,
  controlsExamplesCss,
  controlsExamplesPackage,
} from './controls-examples';
import { buildShareableHtml } from './export/export-html';
import 'reactive-md/styles.css';
import './controls-preview.css';

type ColorScheme = 'light' | 'dark';
type Density = 'comfortable' | 'compact';

/** One host for the lab document: accepted buttons plus the new examples. */
const labHost = createReactHost({
  packages: [buttonLabPackage, controlsExamplesPackage],
  themes: [controlsTheme],
});

/* ------------------------------------------------------------------ sources */

const LAB_SOURCE = [
  '<theme name="forest">',
  '',
  '# Native and public controls',
  '',
  'The controls below are native elements or public component classes. They stay inside this document, so the shared document skin applies.',
  '',
  '<button-lab>',
  '',
  '## Native and public elements',
  '',
  'Fields, choices, disclosures, overlays, navigation, feedback, tables and charts use native semantics with the public class names.',
  '',
  '<controls-examples>',
  '',
  '## Built-in counter',
  '',
  'The counter uses the same shared button implementation as every other built-in control.',
  '',
  '<counter label="Counter" initial="2" min="0" max="5">',
].join('\n');

const GAME_SOURCE = [
  '# Games and built-in controls',
  '',
  'This document carries the portable acceptance content: real Tetris and 2048 packages plus the built-in counter and timer.',
  '',
  '<tetris label="Tetris" width="10" height="20" speed="600" seed="7">',
  '',
  '<game-2048 label="2048" size="4" seed="7">',
  '',
  '## Built-in controls',
  '',
  '<counter label="Score" initial="0" min="0" max="5">',
  '',
  '<timer label="Timer" duration="60">',
].join('\n');

/** Export source for the new examples; the games stay in the existing export. */
const ELEMENTS_EXPORT_SOURCE = [
  LAB_SOURCE,
  '',
  GAME_SOURCE,
].join('\n');

function extensionHint(names: readonly string[]): void {
  const missing = names.filter(name => !demoConfig.registry.some(item => item.name === name));
  if (missing.length === 0) return;
  throw new Error(
    `extensions.ts is missing ${missing.join(', ')}. See artifacts/themed-elements/integration-demo.md.`,
  );
}

/* ------------------------------------------------------------ export harness */

async function buildExport(source: string, stateName: string): Promise<string> {
  const compiled = compileLocal(source, { config: demoConfig });
  if (!compiled.ok) {
    throw new Error(compiled.diagnostics.map(item => `${item.line}:${item.column} ${item.message}`).join(' '));
  }
  const runtime = createLocalRuntime(compiled.document);
  try {
    const state = createLocalStateFile(
      compiled.document,
      runtime.snapshot().state,
      { name: stateName, version: '0.0.0' },
    );
    const result = await buildShareableHtml({
      source,
      state,
      mode: 'interactive',
      locale: 'en',
      colorScheme: 'light',
      compileOptions: { config: demoConfig },
    });
    return result.html;
  } finally {
    runtime.dispose();
  }
}

async function exportAcceptanceHtml(): Promise<string> {
  return buildExport('<theme name="forest">\n\n' + GAME_SOURCE, 'controls-acceptance');
}

async function exportElementsHtml(): Promise<string> {
  extensionHint(['button-lab', 'controls-examples']);
  return buildExport(ELEMENTS_EXPORT_SOURCE, 'controls-elements');
}

async function renderSsrLabPage(): Promise<string> {
  const compiled = compileLocal(LAB_SOURCE, { config: labHost.config });
  if (!compiled.ok) {
    throw new Error(compiled.diagnostics.map(item => `${item.line}:${item.column} ${item.message}`).join(' '));
  }
  const runtime = createLocalRuntime(compiled.document);
  try {
    const { renderToString } = await import('react-dom/server');
    const markup = renderToString(createElement(LocalDocumentView, {
      document: compiled.document,
      runtime,
      reactConfig: labHost.reactConfig,
      mode: 'interactive',
      locale: 'en',
      colorScheme: 'light',
    }));
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SSR pre-hydration native control acceptance</title>
<style>${baseCss}</style>
<style>${controlsTheme.css.map(resource => resource.css).join('\n')}</style>
<style>${buttonLabCss}</style>
<style>${controlsExamplesCss}</style>
<style>${labCss}</style>
</head>
<body class="reactive-md-theme">
<main class="controls-page" data-ssr-acceptance="">${markup}</main>
</body>
</html>`;
  } finally {
    runtime.dispose();
  }
}

interface ControlsHarness {
  sharedCss: string;
  printCss: string;
  exportAcceptanceHtml(): Promise<string>;
  exportElementsHtml(): Promise<string>;
  renderSsrLabPage(): Promise<string>;
}

declare global {
  interface Window {
    __controlsHarness?: ControlsHarness;
  }
}

/* --------------------------------------------------------------------- page */

function DocumentCard({
  id,
  title,
  description,
  toggleLabel,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  toggleLabel: string;
  onToggle(): void;
  children: ReactNode;
}) {
  return <section id={id} className="controls-card">
    <header className="controls-card-head">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        id={`toggle-${id.replace('-card', '')}`}
        type="button"
        className="controls-theme-button"
        onClick={onToggle}
      >
        {toggleLabel}
      </button>
    </header>
    {children}
  </section>;
}

function ControlsPreview() {
  const [labScheme, setLabScheme] = useState<ColorScheme>('light');
  const [gameScheme, setGameScheme] = useState<ColorScheme>('dark');
  const [density, setDensity] = useState<Density>('comfortable');
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.title = 'Themed native controls acceptance - Reactive MD';
    window.__controlsHarness = {
      sharedCss: baseCss,
      printCss,
      exportAcceptanceHtml,
      exportElementsHtml,
      renderSsrLabPage,
    };
    return () => {
      delete window.__controlsHarness;
    };
  }, []);

  useEffect(() => {
    const roots = document.querySelectorAll<HTMLElement>('#lab-card .md-document');
    roots.forEach(root => root.setAttribute('data-rmd-density', density));
  }, [density, labScheme]);

  const toggleLab = useCallback(() => {
    setLabScheme(current => current === 'light' ? 'dark' : 'light');
  }, []);
  const toggleGames = useCallback(() => {
    setGameScheme(current => current === 'light' ? 'dark' : 'light');
  }, []);

  return <div className="controls-page">
    <style>{buttonLabCss}</style>
    <style>{controlsExamplesCss}</style>
    <header className="controls-head">
      <div>
        <p className="controls-eyebrow">Reactive MD acceptance</p>
        <h1>Themed native controls</h1>
        <p className="controls-lede">
          Two independent documents: a native-control lab and a portable game document. Each document chooses
          light or dark on its own. The lab uses the Forest theme; the games use Default.
        </p>
      </div>
      <div className="controls-head-actions">
        <label className="controls-density" htmlFor="density-select">
          Density
          <select
            id="density-select"
            value={density}
            onChange={event => setDensity(event.target.value === 'compact' ? 'compact' : 'comfortable')}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <a className="controls-back" href="/">Back to Playground</a>
        <button className="controls-theme-button" type="button" onClick={async () => {
          setExportStatus('Preparing offline HTML…');
          try {
            const html = await exportElementsHtml();
            const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'rmd-themed-elements.html';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setExportStatus('Offline HTML saved.');
          } catch (error) { setExportStatus(error instanceof Error ? error.message : String(error)); }
        }}>Download offline HTML</button>
        <span role="status">{exportStatus}</span>
      </div>
    </header>

    <p className="controls-outside">
      Outside-document sentinel: <button id="outside-button" type="button">Outside document</button>
      {' '}<button id="outside-variant" type="button" className="md-button-primary">Outside variant</button>
    </p>

    <div className="controls-grid">
      <DocumentCard
        id="lab-card"
        title="Native controls"
        description="Buttons, fields, overlays, navigation and data display inside one .md-document root."
        toggleLabel={labScheme === 'light' ? 'Switch lab to dark' : 'Switch lab to light'}
        onToggle={toggleLab}
      >
        <LocalReactiveDocument
          source={LAB_SOURCE}
          locale="en"
          colorScheme={labScheme}
          reactConfig={labHost.reactConfig}
        />
      </DocumentCard>

      <DocumentCard
        id="games-card"
        title="Games and built-in controls"
        description="Real Tetris and 2048 packages. Theme changes keep the running state."
        toggleLabel={gameScheme === 'light' ? 'Switch games to dark' : 'Switch games to light'}
        onToggle={toggleGames}
      >
        <LocalReactiveDocument
          source={GAME_SOURCE}
          locale="en"
          colorScheme={gameScheme}
          reactConfig={demoReactConfig}
        />
      </DocumentCard>
    </div>

    <p className="controls-footnote">
      Exported offline HTML and the pre-hydration SSR page are produced by the page harness and checked by
      <code> scripts/verify-themed-elements.mjs</code>.
    </p>
  </div>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ControlsPreview />
  </StrictMode>,
);
