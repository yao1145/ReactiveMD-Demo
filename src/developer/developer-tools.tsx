import { useRef, useState, type ReactNode } from 'react';
import * as engineApi from 'reactive-md';import * as reactApi from 'reactive-md/react';
import * as editorApi from 'reactive-md-editor';
import * as authoringApi from 'reactive-md/authoring';
import engineManifest from 'reactive-md/package.json';
import editorManifest from 'reactive-md-editor/package.json';
import type { EditorViewMode } from 'reactive-md-editor';
import { DEFAULT_HTML_OPTIONS, type DemoHtmlOptions } from '../settings/html-options';
import type { Language } from '../ui/i18n';
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
    compiler: { title: string; subtitle: string; markdownBreaks: string; markdownBreaksHint: string; strict: string; strictHint: string };
    html: { title: string; subtitle: string; css: string; cssHint: string; javascript: string; javascriptHint: string; extendedHtml: string; extendedHtmlHint: string };
    editor: { title: string; subtitle: string; viewMode: string; views: Record<EditorViewMode, string>; toolbar: string; toolbarHint: string; authoring: string; authoringHint: string; trial: string; trialHint: string };
    export: { title: string; subtitle: string; open: string; markdown: string };
    document: { title: string; subtitle: string; import: string; saveCopy: string; restoreExample: string; runAgain: string };
    extensions: { title: string; subtitle: string; loaded: string };
    runtime: { title: string; subtitle: string; engine: string; editor: string; document: string; mode: string; duration: string; diagnostics: string; documents: string; folders: string; trash: string };
    api: { title: string; subtitle: string; copyImport: (name: string, packageName: string) => string; expandGroup: (name: string) => string; collapseGroup: (name: string) => string };
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
        subtitle: 'Compilation, recovery and Markdown breaks',
        markdownBreaks: 'Markdown line breaks',
        markdownBreaksHint: 'Render ordinary soft line breaks as <br>.',
        strict: 'Strict parsing',
        strictHint: 'Recover broken structure locally instead of stopping.',
      },
      html: {
        title: 'HTML',
        subtitle: 'CSS, JavaScript and extended HTML',
        css: 'CSS',
        cssHint: 'Allow style blocks and style attributes.',
        javascript: 'JavaScript',
        javascriptHint: 'Allow script blocks and inline handlers.',
        extendedHtml: 'Extended HTML',
        extendedHtmlHint: 'Allow elements outside the safe subset.',
      },
      editor: {
        title: 'Editor',
        subtitle: 'View, toolbar and trial state',
        viewMode: 'View',
        views: { edit: 'Edit', split: 'Split', preview: 'Preview' },
        toolbar: 'Formatting toolbar',
        toolbarHint: 'Show the Markdown formatting toolbar.',
        authoring: 'Authoring panel',
        authoringHint: 'Show insertion templates and analysis hints.',
        trial: 'Keep trial state',
        trialHint: 'Preserve compatible values while typing.',
      },
      export: {
        title: 'Export',
        subtitle: 'HTML, static snapshot and Markdown',
        open: 'Open export dialog',
        markdown: 'Download Markdown source',
      },
      document: {
        title: 'Document',
        subtitle: 'Import, copies and reruns',
        import: 'Import document',
        saveCopy: 'Save example copy',
        restoreExample: 'Restore example',
        runAgain: 'Run again',
      },
      extensions: {
        title: 'Extensions',
        subtitle: 'Registered component packages',
        loaded: 'Loaded',
      },
      runtime: {
        title: 'Runtime',
        subtitle: 'Versions, diagnostics and compile status',
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
      api: {
        title: 'Interfaces',
        subtitle: 'Click any interface to copy its import',
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
        subtitle: '编译、恢复与Markdown换行',
        markdownBreaks: 'Markdown 换行',
        markdownBreaksHint: '把普通软换行渲染为 <br>。',
        strict: '严格解析',
        strictHint: '结构损坏时局部恢复，而不是直接停止。',
      },
      html: {
        title: 'HTML',
        subtitle: 'CSS、JavaScript 与扩展 HTML',
        css: 'CSS',
        cssHint: '允许 style 块和 style 属性。',
        javascript: 'JavaScript',
        javascriptHint: '允许 script 块和内联事件处理属性。',
        extendedHtml: '扩展 HTML',
        extendedHtmlHint: '允许安全子集之外的元素与属性。',
      },
      editor: {
        title: '编辑器',
        subtitle: '视图、工具栏与试算状态',
        viewMode: '视图',
        views: { edit: '编辑', split: '分栏', preview: '预览' },
        toolbar: '格式化工具栏',
        toolbarHint: '显示 Markdown 格式化工具栏。',
        authoring: '创作面板',
        authoringHint: '显示插入模板与分析提示。',
        trial: '保留试算状态',
        trialHint: '编辑时保留兼容的命名参数值。',
      },
      export: {
        title: '导出',
        subtitle: 'HTML、静态快照与 Markdown',
        open: '打开导出对话框',
        markdown: '下载 Markdown 源码',
      },
      document: {
        title: '文档操作',
        subtitle: '导入、副本与重新运行',        import: '导入文档',
        saveCopy: '保存示例副本',
        restoreExample: '恢复示例',
        runAgain: '重新运行',
      },
      extensions: {
        title: '扩展',
        subtitle: '已注册的组件包',
        loaded: '已加载',
      },
      runtime: {
        title: '运行信息',
        subtitle: '版本、诊断与编译状态',
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
      api: {
        title: '接口',
        subtitle: '点击接口复制 import 语句',
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

function DevCard({ title, subtitle, icon, tone, badge, defaultOpen = false, children }: {
  title: string;
  subtitle: string;
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
        <small>{subtitle}</small>
      </span>
      {badge ? <span className="dev-card-badge">{badge}</span> : null}
      <ChevronRightIcon className="dev-card-chevron" size={16} />
    </button>
    {open ? <div className="dev-card-body">{children}</div> : null}
  </section>;
}

function DevToggle({ label, hint, checked, onChange }: {
  label: string;
  hint: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return <button type="button" role="switch" aria-checked={checked} className="dev-option" onClick={() => onChange(!checked)}>
    <span className="dev-option-copy">
      <strong>{label}</strong>
      <small>{hint}</small>
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
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set(['engine']));
  const totalApis = API_GROUPS.reduce((sum, group) => sum + group.names.length, 0);
  const htmlDefault = JSON.stringify(props.htmlOptions) === JSON.stringify(DEFAULT_HTML_OPTIONS);
  const defaults = props.markdownBreaks === DEFAULT_CAPABILITIES.markdownBreaks
    && props.strict === DEFAULT_CAPABILITIES.strict
    && props.editorToolbar === DEFAULT_CAPABILITIES.toolbar
    && props.editorAuthoring === DEFAULT_CAPABILITIES.authoring
    && props.retainPreviewState === DEFAULT_CAPABILITIES.retain
    && htmlDefault;
  const badge = defaults ? copy.defaultBadge : copy.modifiedBadge;

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
        <DevCard title={copy.cards.compiler.title} subtitle={copy.cards.compiler.subtitle}
          icon={<CodeIcon />} tone="green" badge={badge}>
          <DevToggle label={copy.cards.compiler.markdownBreaks} hint={copy.cards.compiler.markdownBreaksHint}
            checked={props.markdownBreaks} onChange={props.onMarkdownBreaksChange} />
          <DevToggle label={copy.cards.compiler.strict} hint={copy.cards.compiler.strictHint}
            checked={props.strict} onChange={props.onStrictChange} />
        </DevCard>

        <DevCard title={copy.cards.html.title} subtitle={copy.cards.html.subtitle}
          icon={<FilesIcon />} tone="blue" badge={htmlDefault ? copy.defaultBadge : copy.modifiedBadge}>
          <DevToggle label={copy.cards.html.css} hint={copy.cards.html.cssHint}
            checked={props.htmlOptions.enableCss} onChange={enableCss => props.onHtmlOptionsChange({ ...props.htmlOptions, enableCss })} />
          <DevToggle label={copy.cards.html.javascript} hint={copy.cards.html.javascriptHint}
            checked={props.htmlOptions.enableJavaScript} onChange={enableJavaScript => props.onHtmlOptionsChange({ ...props.htmlOptions, enableJavaScript })} />
          <DevToggle label={copy.cards.html.extendedHtml} hint={copy.cards.html.extendedHtmlHint}
            checked={props.htmlOptions.enableExtendedHtml} onChange={enableExtendedHtml => props.onHtmlOptionsChange({ ...props.htmlOptions, enableExtendedHtml })} />
        </DevCard>

        <DevCard title={copy.cards.editor.title} subtitle={copy.cards.editor.subtitle}
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
          <DevToggle label={copy.cards.editor.toolbar} hint={copy.cards.editor.toolbarHint}
            checked={props.editorToolbar} onChange={props.onEditorToolbarChange} />
          <DevToggle label={copy.cards.editor.authoring} hint={copy.cards.editor.authoringHint}
            checked={props.editorAuthoring} onChange={props.onEditorAuthoringChange} />
          <DevToggle label={copy.cards.editor.trial} hint={copy.cards.editor.trialHint}
            checked={props.retainPreviewState} onChange={props.onRetainPreviewStateChange} />
        </DevCard>

        <DevCard title={copy.cards.export.title} subtitle={copy.cards.export.subtitle}
          icon={<DownloadIcon />} tone="cyan">
          <DevAction label={copy.cards.export.open} icon={<DownloadIcon />} onClick={props.onExport} />
          <DevAction label={copy.cards.export.markdown} icon={<FileIcon />} onClick={props.onDownloadMarkdown} />
        </DevCard>

        <DevCard title={copy.cards.document.title} subtitle={copy.cards.document.subtitle}
          icon={<FileIcon />} tone="purple">
          <DevAction label={copy.cards.document.import} icon={<UploadIcon />} onClick={() => file.current?.click()} />
          {props.activeKind === 'example' ? <>
            <DevAction label={copy.cards.document.saveCopy} icon={<CopyIcon />} onClick={props.onSaveCopy} />
            <DevAction label={copy.cards.document.restoreExample} icon={<RestoreIcon />} onClick={props.onRestoreExample} />
          </> : null}
          <DevAction label={copy.cards.document.runAgain} icon={<PlayIcon />} onClick={props.onRunAgain} />
        </DevCard>

        <DevCard title={copy.cards.extensions.title} subtitle={copy.cards.extensions.subtitle}
          icon={<PuzzleIcon />} tone="pink" badge={String(props.extensions.length)}>
          {props.extensions.length ? <ul className="dev-extension-list">
            {props.extensions.map(extension => <li key={extension.id}>
              <span><code>{extension.id}</code><small>{extension.title}</small></span>
              <span className="dev-loaded">{copy.cards.extensions.loaded}</span>
            </li>)}
          </ul> : <p className="dev-empty">{copy.defaultBadge}</p>}
        </DevCard>

        <DevCard title={copy.cards.runtime.title} subtitle={copy.cards.runtime.subtitle}
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

        <DevCard title={copy.cards.api.title} subtitle={copy.cards.api.subtitle}
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
