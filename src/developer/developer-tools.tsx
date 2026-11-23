import { useRef, useState, type ReactNode } from 'react';
import * as engineApi from 'reactive-md';import * as reactApi from 'reactive-md/react';
import * as editorApi from 'reactive-md-editor';
import * as authoringApi from 'reactive-md/authoring';
import engineManifest from 'reactive-md/package.json';
import editorManifest from 'reactive-md-editor/package.json';
import viteManifest from 'vite/package.json';
import { version as reactVersion } from 'react';
import type { EditorComponentMode, EditorViewMode } from 'reactive-md-editor';
import { isDefaultHtmlOptions, type DemoHtmlOptions } from '../settings/html-options';
import type { Language } from '../ui/i18n';
import { createDiagnosticReport, formatLocalDiagnostic, type Diagnostic } from 'reactive-md/observability';
import {
  sameDiagnosticScope,
  scopeLabel,
  selectReportObservations,
  type DiagnosticScope,
  type ScopedDiagnostic,
  type ScopedTraceEvent,
} from '../compilation/diagnostic-scope';
import { useScrollContainer } from '../ui/use-scroll-container';
import {
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FilesIcon,
  InfoIcon,
  PlayIcon,
  PuzzleIcon,
  RestoreIcon,
  SlidersIcon,
  UploadIcon,
} from '../ui/icons';
import './developer-tools.css';

export interface DeveloperToolsCopy {
  heading: string;
  resetDefaults: string;
  defaultBadge: string;
  modifiedBadge: string;
  copied: string;
  cards: {
    compiler: { title: string; markdownBreaks: string; strict: string; componentMode: string; modes: Record<EditorComponentMode, string> };
    html: { title: string; css: string; javascript: string; extendedHtml: string };
    editor: { title: string; viewMode: string; views: Record<EditorViewMode, string>; toolbar: string; authoring: string; trial: string };
    export: { title: string; open: string; markdown: string };
    document: { title: string; import: string; saveCopy: string; restoreExample: string; runAgain: string };
    extensions: { title: string; loaded: string };
    runtime: { title: string; engine: string; editor: string; document: string; mode: string; duration: string; diagnostics: string; documents: string; folders: string; trash: string };
    trace: { title: string; empty: string; copy: string; failure: string; scope: string; scopeHint: string; history: string };
    api: { title: string; copyImport: (name: string, packageName: string) => string; expandGroup: (name: string) => string; collapseGroup: (name: string) => string };
  };
}

const COPY: Record<Language, DeveloperToolsCopy> = {
  en: {
    heading: 'Developer tools',
    resetDefaults: 'Reset defaults',
    defaultBadge: 'Defaults',
    modifiedBadge: 'Modified',
    copied: 'Copied',
    cards: {
      compiler: {
        title: 'Compiler',
        markdownBreaks: 'Markdown line breaks',
        strict: 'Strict parsing',
        componentMode: 'Component mode',
        modes: { default: 'Default', minimal: 'Minimal' },
      },
      html: {
        title: 'HTML',
        css: 'CSS',
        javascript: 'JavaScript',
        extendedHtml: 'Extended HTML',
      },
      editor: {
        title: 'Editor',
        viewMode: 'View',
        views: { edit: 'Edit', split: 'Split', preview: 'Preview' },
        toolbar: 'Formatting toolbar',
        authoring: 'Authoring panel',
        trial: 'Keep trial state',
      },
      export: {
        title: 'Export',
        open: 'Open export dialog',
        markdown: 'Download Markdown source',
      },
      document: {
        title: 'Document',
        import: 'Import document',
        saveCopy: 'Save example copy',
        restoreExample: 'Restore example',
        runAgain: 'Run again',
      },
      extensions: {
        title: 'Extensions',
        loaded: 'Loaded',
      },
      runtime: {
        title: 'Runtime',
        engine: 'Engine',
        editor: 'Editor',
        document: 'Active document',
        mode: 'Compile mode',
        duration: 'Last compile',
        diagnostics: 'Diagnostics',
        documents: 'Documents',
        folders: 'Folders',
        trash: 'Trash',
      },
      trace: {
        title: 'Diagnostic events',
        empty: 'No events yet.',
        copy: 'Copy diagnostic report',
        failure: 'Could not copy the report.',
        scope: 'Report scope',
        scopeHint: 'Copied reports contain only this document and source.',
        history: 'Earlier document or source',
      },
      api: {
        title: 'Interfaces',
        copyImport: (name, packageName) => `Copy import for ${name} from ${packageName}`,
        expandGroup: (name) => `Expand ${name}`,
        collapseGroup: (name) => `Collapse ${name}`,
      },
    },
  },
  zh: {
    heading: '开发者工具',
    resetDefaults: '恢复默认设置',
    defaultBadge: '默认',
    modifiedBadge: '已修改',
    copied: '已复制',
    cards: {
      compiler: {
        title: '编译器',
        markdownBreaks: 'Markdown 换行',
        strict: '严格解析',
        componentMode: '组件模式',
        modes: { default: '默认', minimal: '精简' },
      },
      html: {
        title: 'HTML',
        css: 'CSS',
        javascript: 'JavaScript',
        extendedHtml: '扩展 HTML',
      },
      editor: {
        title: '编辑器',
        viewMode: '视图',
        views: { edit: '编辑', split: '分栏', preview: '预览' },
        toolbar: '格式化工具栏',
        authoring: '创作面板',
        trial: '保留试算状态',
      },
      export: {
        title: '导出',
        open: '打开导出对话框',
        markdown: '下载 Markdown 源码',
      },
      document: {
        title: '文档操作',
        import: '导入文档',
        saveCopy: '保存示例副本',
        restoreExample: '恢复示例',
        runAgain: '重新运行',
      },
      extensions: {
        title: '扩展',
        loaded: '已加载',
      },
      runtime: {
        title: '运行信息',
        engine: '引擎',
        editor: '编辑器',
        document: '当前文档',
        mode: '编译模式',
        duration: '最近编译',
        diagnostics: '诊断',
        documents: '文档',
        folders: '文件夹',
        trash: '回收站',
      },
      trace: {
        title: '诊断事件',
        empty: '暂无事件。',
        copy: '复制诊断报告',
        failure: '无法复制报告。',
        scope: '报告范围',
        scopeHint: '复制的报告仅包含当前文档和源码。',
        history: '较早的文档或源码',
      },
      api: {
        title: '接口',
        copyImport: (name, packageName) => `复制 ${name}（来自 ${packageName}）的 import`,
        expandGroup: (name) => `展开 ${name}`,
        collapseGroup: (name) => `收起 ${name}`,
      },
    },
  },
};

export interface DeveloperToolsProps {
  language: Language;
  markdownBreaks: boolean;
  onMarkdownBreaksChange(checked: boolean): void;
  strict: boolean;
  componentMode: EditorComponentMode;
  onComponentModeChange(mode: EditorComponentMode): void;
  onStrictChange(checked: boolean): void;
  htmlOptions: DemoHtmlOptions;
  onHtmlOptionsChange(next: DemoHtmlOptions): void;
  editorToolbar: boolean;
  onEditorToolbarChange(checked: boolean): void;
  editorAuthoring: boolean;
  onEditorAuthoringChange(checked: boolean): void;
  viewMode: EditorViewMode;
  onViewModeChange(mode: EditorViewMode): void;
  onResetDefaults(): void;
  retainPreviewState: boolean;
  onRetainPreviewStateChange(checked: boolean): void;
  onImport(source: string): void;
  onExport(): void;
  onDownloadMarkdown(): void;
  onRunAgain(): void;
  onRestoreExample(): void;
  onSaveCopy(): void;
  activeKind: 'example' | 'documents';
  activeName: string;
  documentCount: number;
  folderCount: number;
  trashCount: number;
  diagnosticsCount: number;
  compileDuration: number;
  compileMode: string;
  extensions: readonly { id: string; title: string }[];
  /** Identity of the document source the report is generated for. */
  scope: DiagnosticScope;
  /** Diagnostics compiled for that exact source. */
  currentDiagnostics: readonly Diagnostic[];
  /** Scoped history retained for the panel; the report selects from it. */
  observations: {
    readonly diagnostics: readonly ScopedDiagnostic[];
    readonly events: readonly ScopedTraceEvent[];
  };
  source: string;
}

function apiNames(namespace: Record<string, unknown>): string[] {
  return Object.keys(namespace)
    .filter(name => name !== 'default' && !name.startsWith('__'))
    .sort((a, b) => a.localeCompare(b));
}

const API_GROUPS = [
  { id: 'engine', label: 'reactive-md', names: apiNames(engineApi as Record<string, unknown>) },
  { id: 'react', label: 'reactive-md/react', names: apiNames(reactApi as Record<string, unknown>) },
  { id: 'editor', label: 'reactive-md-editor', names: apiNames(editorApi as Record<string, unknown>) },
  { id: 'authoring', label: 'reactive-md/authoring', names: apiNames(authoringApi as Record<string, unknown>) },
];

const DEFAULT_CAPABILITIES = {
  markdownBreaks: true,
  strict: true,
  toolbar: true,
  authoring: true,
  retain: true,
};

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'pink';

function DevCard({ title, icon, tone, badge, defaultOpen = false, children }: {
  title: string;
  icon: ReactNode;
  tone: Tone;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className={`dev-card tone-${tone}${open ? ' is-open' : ''}`}>
    <button type="button" className="dev-card-head" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="dev-card-icon" aria-hidden="true">{icon}</span>
      <span className="dev-card-titles">
        <strong>{title}</strong>
      </span>
      {badge ? <span className="dev-card-badge">{badge}</span> : null}
      <ChevronRightIcon className="dev-card-chevron" size={16} />
    </button>
    {open ? <div className="dev-card-body">{children}</div> : null}
  </section>;
}

function DevToggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return <button type="button" role="switch" aria-checked={checked} className="dev-option" onClick={() => onChange(!checked)}>
    <span className="dev-option-copy">
      <strong>{label}</strong>
    </span>
    <span className={`dev-switch${checked ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
  </button>;
}

function DevAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick(): void }) {
  return <button type="button" className="dev-action" onClick={onClick}>
    <span className="dev-action-icon" aria-hidden="true">{icon}</span>
    <span>{label}</span>
    <ChevronRightIcon size={14} />
  </button>;
}

export function DeveloperTools(props: DeveloperToolsProps) {
  const copy = COPY[props.language];
  const file = useRef<HTMLInputElement>(null);
  const scrollRef = useScrollContainer<HTMLDivElement>();
  const [copied, setCopied] = useState<string | null>(null);
  const [reportFeedback, setReportFeedback] = useState('');
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set(['engine']));
  const totalApis = API_GROUPS.reduce((sum, group) => sum + group.names.length, 0);
  const htmlDefault = isDefaultHtmlOptions(props.htmlOptions);
  const defaults = props.markdownBreaks === DEFAULT_CAPABILITIES.markdownBreaks
    && props.componentMode === 'default'
    && props.strict === DEFAULT_CAPABILITIES.strict
    && props.editorToolbar === DEFAULT_CAPABILITIES.toolbar
    && props.editorAuthoring === DEFAULT_CAPABILITIES.authoring
    && props.retainPreviewState === DEFAULT_CAPABILITIES.retain
    && htmlDefault;
  const badge = defaults ? copy.defaultBadge : copy.modifiedBadge;
  // The panel shows the full current diagnostics plus the retained scoped
  // history, labelled whenever an entry comes from another document or source.
  // Entries repeat across the current list and an export's history; keep one
  // copy per source scope.
  const panelDiagnostics: { diagnostic: Diagnostic; scope: DiagnosticScope }[] = [];
  const seenPanelDiagnostics = new Set<string>();
  for (const entry of [
    ...props.currentDiagnostics.map(diagnostic => ({ diagnostic, scope: props.scope })),
    ...props.observations.diagnostics.map(item => ({ diagnostic: item.diagnostic, scope: item.scope })),
  ]) {
    const key = `${entry.scope.documentKey}|${entry.scope.sourceDigest}|${entry.diagnostic.code}`
      + `|${entry.diagnostic.range.start}|${entry.diagnostic.range.end}|${entry.diagnostic.message}`;
    if (seenPanelDiagnostics.has(key)) continue;
    seenPanelDiagnostics.add(key);
    panelDiagnostics.push(entry);
  }

  async function copyImport(packageName: string, name: string) {
    const text = `import { ${name} } from '${packageName}';`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(`${packageName}:${name}`);
    window.setTimeout(() => setCopied(current => current === `${packageName}:${name}` ? null : current), 1400);
  }

  function toggleGroup(id: string) {
    setOpenGroups(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function copyReport() {
    // Select from the journal here so the copied document digest, diagnostics
    // and events always describe the same document source.
    const selection = selectReportObservations({
      scope: props.scope,
      current: props.currentDiagnostics,
      diagnostics: props.observations.diagnostics,
      events: props.observations.events,
    });
    const report = createDiagnosticReport(props.source, {
      package: { editor: editorManifest.version, react: reactVersion, vite: viteManifest.version },
      diagnostics: selection.diagnostics,
      events: selection.events,
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setReportFeedback(copy.copied);
    } catch {
      try {
        const area = document.createElement('textarea');
        area.value = JSON.stringify(report, null, 2);
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const copiedReport = document.execCommand('copy');
        area.remove();
        setReportFeedback(copiedReport ? copy.copied : copy.cards.trace.failure);
      } catch {
        setReportFeedback(copy.cards.trace.failure);
      }
    }
  }

  return <section className="developer-tools" aria-label={copy.heading}>
    <div className="devtools-head">
      <h2><SlidersIcon />{copy.heading}</h2>
      <button type="button" className="icon-button" title={copy.resetDefaults} aria-label={copy.resetDefaults}
        onClick={props.onResetDefaults}>
        <RestoreIcon />
      </button>
    </div>

    <div className="devtools-scroll" ref={scrollRef}>
      <div className="devtools-cards">
        <DevCard title={copy.cards.compiler.title}
          icon={<CodeIcon />} tone="green" badge={badge}>
          <div className="dev-option dev-option-static">
            <span className="dev-option-copy"><strong>{copy.cards.compiler.componentMode}</strong></span>
            <span className="dev-segment" role="group" aria-label={copy.cards.compiler.componentMode}>
              {(['default', 'minimal'] as const).map(mode => <button key={mode} type="button"
                aria-pressed={props.componentMode === mode} onClick={() => props.onComponentModeChange(mode)}>
                {copy.cards.compiler.modes[mode]}
              </button>)}
            </span>
          </div>
          <DevToggle label={copy.cards.compiler.markdownBreaks}
            checked={props.markdownBreaks} onChange={props.onMarkdownBreaksChange} />
          <DevToggle label={copy.cards.compiler.strict}
            checked={props.strict} onChange={props.onStrictChange} />
        </DevCard>

        <DevCard title={copy.cards.html.title}
          icon={<FilesIcon />} tone="blue" badge={htmlDefault ? copy.defaultBadge : copy.modifiedBadge}>
          <DevToggle label={copy.cards.html.css}
            checked={props.htmlOptions.enableCss} onChange={enableCss => props.onHtmlOptionsChange({ ...props.htmlOptions, enableCss })} />
          <DevToggle label={copy.cards.html.javascript}
            checked={props.htmlOptions.enableJavaScript} onChange={enableJavaScript => props.onHtmlOptionsChange({ ...props.htmlOptions, enableJavaScript })} />
          <DevToggle label={copy.cards.html.extendedHtml}
            checked={props.htmlOptions.enableExtendedHtml} onChange={enableExtendedHtml => props.onHtmlOptionsChange({ ...props.htmlOptions, enableExtendedHtml })} />
        </DevCard>

        <DevCard title={copy.cards.editor.title}
          icon={<SlidersIcon />} tone="orange">
          <div className="dev-option dev-option-static">
            <span className="dev-option-copy"><strong>{copy.cards.editor.viewMode}</strong></span>
            <span className="dev-segment" role="group" aria-label={copy.cards.editor.viewMode}>
              {(['edit', 'split', 'preview'] as const).map(mode => <button key={mode} type="button"
                aria-pressed={props.viewMode === mode} onClick={() => props.onViewModeChange(mode)}>
                {copy.cards.editor.views[mode]}
              </button>)}
            </span>
          </div>
          <DevToggle label={copy.cards.editor.toolbar}
            checked={props.editorToolbar} onChange={props.onEditorToolbarChange} />
          <DevToggle label={copy.cards.editor.authoring}
            checked={props.editorAuthoring} onChange={props.onEditorAuthoringChange} />
          <DevToggle label={copy.cards.editor.trial}
            checked={props.retainPreviewState} onChange={props.onRetainPreviewStateChange} />
        </DevCard>

        <DevCard title={copy.cards.export.title}
          icon={<DownloadIcon />} tone="cyan">
          <DevAction label={copy.cards.export.open} icon={<DownloadIcon />} onClick={props.onExport} />
          <DevAction label={copy.cards.export.markdown} icon={<FileIcon />} onClick={props.onDownloadMarkdown} />
        </DevCard>

        <DevCard title={copy.cards.document.title}
          icon={<FileIcon />} tone="purple">
          <DevAction label={copy.cards.document.import} icon={<UploadIcon />} onClick={() => file.current?.click()} />
          {props.activeKind === 'example' ? <>
            <DevAction label={copy.cards.document.saveCopy} icon={<CopyIcon />} onClick={props.onSaveCopy} />
            <DevAction label={copy.cards.document.restoreExample} icon={<RestoreIcon />} onClick={props.onRestoreExample} />
          </> : null}
          <DevAction label={copy.cards.document.runAgain} icon={<PlayIcon />} onClick={props.onRunAgain} />
        </DevCard>

        <DevCard title={copy.cards.extensions.title}
          icon={<PuzzleIcon />} tone="pink" badge={String(props.extensions.length)}>
          {props.extensions.length ? <ul className="dev-extension-list">
            {props.extensions.map(extension => <li key={extension.id}>
              <span><code>{extension.id}</code><small>{extension.title}</small></span>
              <span className="dev-loaded">{copy.cards.extensions.loaded}</span>
            </li>)}
          </ul> : <p className="dev-empty">{copy.defaultBadge}</p>}
        </DevCard>

        <DevCard title={copy.cards.runtime.title}
          icon={<InfoIcon />} tone="blue" badge={engineManifest.version.split('-')[0]}>
          <div className="dev-info-list">
            <div><span>{copy.cards.runtime.engine}</span><code>{engineManifest.version}</code></div>
            <div><span>{copy.cards.runtime.editor}</span><code>{editorManifest.version}</code></div>
            <div><span>{copy.cards.runtime.document}</span><code>{props.activeName}</code></div>
            <div><span>{copy.cards.runtime.mode}</span><code>{props.compileMode}</code></div>
            <div><span>{copy.cards.runtime.duration}</span><code>{props.compileDuration} ms</code></div>
            <div><span>{copy.cards.runtime.diagnostics}</span><code>{props.diagnosticsCount}</code></div>
            <div><span>{copy.cards.runtime.documents}</span><code>{props.documentCount}</code></div>
            <div><span>{copy.cards.runtime.folders}</span><code>{props.folderCount}</code></div>
            <div><span>{copy.cards.runtime.trash}</span><code>{props.trashCount}</code></div>
          </div>
        </DevCard>

        <DevCard title={copy.cards.trace.title} icon={<InfoIcon />} tone="cyan" badge={String(props.observations.events.length)}>
          <DevAction label={copy.cards.trace.copy} icon={<CopyIcon />} onClick={() => { void copyReport(); }} />
          <p className="dev-empty" role="status">{reportFeedback}</p>
          <p className="dev-scope-line" data-testid="report-scope" title={copy.cards.trace.scopeHint}>
            <span>{copy.cards.trace.scope}</span>
            <code>{scopeLabel(props.scope)}</code>
          </p>
          {props.observations.events.length ? <ol className="dev-trace-events" aria-label={copy.cards.trace.title}>
            {props.observations.events.slice().reverse().map((entry, index) => {
              const event = entry.event;
              const current = sameDiagnosticScope(entry.scope, props.scope);
              return <li key={`${event.traceId}-${event.type}-${index}`} data-scope={current ? 'current' : 'history'}>
                {current ? null : <span className="dev-scope-tag" title={copy.cards.trace.history}>{scopeLabel(entry.scope)}</span>}
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                <code>{event.type}</code>
                {event.status === undefined ? null : <span>{event.status}</span>}
                {event.stage === undefined ? null : <span>{event.stage}</span>}
                {event.requestId === undefined ? null : <span>#{event.requestId}</span>}
                {event.sourceRevision === undefined ? null : <span>rev {event.sourceRevision}</span>}
                {event.durationMs === undefined ? null : <span>{event.durationMs} ms</span>}
              </li>;
            })}
          </ol> : <p className="dev-empty">{copy.cards.trace.empty}</p>}
          {panelDiagnostics.length ? <ul className="dev-trace-events" aria-label={copy.cards.runtime.diagnostics}>
            {panelDiagnostics.map((entry, index) => {
              const current = sameDiagnosticScope(entry.scope, props.scope);
              return <li key={`${entry.diagnostic.code}-${index}`} data-scope={current ? 'current' : 'history'}>
                {current ? null : <span className="dev-scope-tag" title={copy.cards.trace.history}>{scopeLabel(entry.scope)}</span>}
                <code>{entry.diagnostic.code}</code>
                <span>{formatLocalDiagnostic(entry.diagnostic, props.language)}</span>
              </li>;
            })}
          </ul> : null}
        </DevCard>

        <DevCard title={copy.cards.api.title}
          icon={<CodeIcon />} tone="green" badge={String(totalApis)}>
          {API_GROUPS.map(group => {
            const open = openGroups.has(group.id);
            return <div className="dev-api-group" key={group.id}>
              <button type="button" className="dev-api-group-head" aria-expanded={open}
                title={open ? copy.cards.api.collapseGroup(group.label) : copy.cards.api.expandGroup(group.label)}
                aria-label={open ? copy.cards.api.collapseGroup(group.label) : copy.cards.api.expandGroup(group.label)}
                onClick={() => toggleGroup(group.id)}>
                <ChevronRightIcon size={14} className={open ? 'is-open' : undefined} />
                <code>{group.label}</code>
                <span>{group.names.length}</span>
              </button>
              {open ? <div className="dev-api-grid">
                {group.names.map(name => {
                  const key = `${group.label}:${name}`;
                  return <button key={name} type="button" className={`dev-api-chip${copied === key ? ' is-copied' : ''}`}
                    title={copy.cards.api.copyImport(name, group.label)}
                    aria-label={copy.cards.api.copyImport(name, group.label)}
                    onClick={() => { void copyImport(group.label, name); }}>
                    <code>{name}</code>
                    {copied === key ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                  </button>;
                })}
              </div> : null}
            </div>;
          })}
        </DevCard>
      </div>

      <input ref={file} type="file" accept=".md,.markdown,.reactive.md,.html,.htm,text/markdown,text/plain,text/html" hidden
        onChange={async event => {
          const control = event.currentTarget;
          const selected = control.files?.[0];
          if (selected) props.onImport(await selected.text());
          control.value = '';
        }} />
    </div>
  </section>;
}
