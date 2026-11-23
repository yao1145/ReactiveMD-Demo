import { createContext, useContext, type ReactNode } from 'react';

export type Language = 'en' | 'zh';

/** The demo opens in English unless the visitor has chosen Chinese before. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** Persisted choice shared by the Playground and the embed page. */
export const LANGUAGE_STORAGE_KEY = 'reactive-md:language';

/**
 * Every piece of demo chrome lives here so the UI has one typed source of
 * truth for both languages. Values that depend on a number are functions;
 * everything else is a plain string.
 */
export interface DemoCopy {
  /** Value written to `document.documentElement.lang`. */
  htmlLang: 'en' | 'zh-CN';
  documentTitle: string;
  languageToggle: {
    /** Visible short label: the language the button switches to. */
    label: string;
    /** Language tag for the visible label. */
    labelLang: 'en' | 'zh-CN';
    /** Accessible name describing the action. */
    ariaLabel: string;
  };
  masthead: {
    eyebrow: string;
    viewSwitcher: string;
    playground: string;
    guide: string;
    themeLight: string;
    themeDark: string;
    repository: string;
    menu: string;
    language: string;
  };
  guide: {
    title: string;
    back: string;
  };
  authorTools: {
    ariaLabel: string;
    lightTheme: string;
    darkTheme: string;
    showSource: string;
    simpleView: string;
    importDocument: string;
    exportDocument: string;
  };
  exportDialog: {
    title: string;
    close: string;
    formatLegend: string;
    interactive: string;
    static: string;
    pdf: string;
    stateLegend: string;
    authorInitial: string;
    currentPreview: string;
    currentUnavailable: string;
    summaryLegend: string;
    summaryParameters: string;
    summaryImages: string;
    changed: (changed: number, total: number) => string;
    unchanged: (total: number) => string;
    noParameters: string;
    noCurrent: string;
    imageNone: string;
    compilePending: string;
    compileFailed: (message: string) => string;
    compileUnavailable: string;
    assetsLoading: string;
    assetsFailed: (message: string) => string;
    buildFailed: (message: string) => string;
    exportHtml: string;
    exportPdf: string;
    printPdf: string;
    pdfDownloadHint: string;
    pdfPrintHint: string;
    exportMarkdown: string;
    exportState: string;
    exportStateHint: string;
    exportStateUnavailable: string;
    preparing: string;
    cancel: string;
  };
  editor: {
    region: string;
    editView: string;
    previewView: string;
    viewSwitch: string;
    sourceLabel: string;
    diagnosticsRegion: string;
    diagnosticsHeading: string;
    diagnosticsCompiling: string;
    diagnosticsCount: (count: number) => string;
    diagnosticsNone: string;
    diagnosticsEmptyCompiling: string;
    locate: string;
    warning: string;
    error: string;
    position: (line: number, column: number) => string;
  };
  outline: {
    heading: string;
    empty: string;
    untitled: string;
    close: string;
    expand: (title: string) => string;
    collapse: (title: string) => string;
  };
  sidebar: {
    region: string;
    documents: string;
    outline: string;
    developerTools: string;
    close: string;
  };
  preview: {
    region: string;
    heading: string;
    startErrorTitle: string;
    preparing: string;
    staleTitle: string;
    staleBody: string;
    disabledTitle: string;
    disabledBody: string;
    enterFullscreen: string;
    exitFullscreen: string;
    showActions: string;
    hideActions: string;
  };
  streaming: {
    nav: string;
    title: string;
    region: string;
    controls: string;
    start: string;
    cancel: string;
    restore: string;
    finalize: string;
    speedLabel: string;
    speedValue: (tokensPerSecond: number) => string;
    progress: (revealed: number, total: number) => string;
    statusLabel: string;
    statusIdle: string;
    statusDraft: string;
    statusStreaming: string;
    statusFinalizing: string;
    statusDone: string;
    statusFailed: string;
    statusCancelled: string;
    count: (count: number) => string;
    sourceHeading: string;
    previewHeading: string;
    transientHeading: string;
    diagnosticsHeading: string;
    finalHeading: string;
    none: string;
  };
  status: {
    compileFailed: string;
    compiled: (diagnostics: number, duration: number, fallback: boolean) => string;
    compiling: string;
    compilingMainThread: string;
    waiting: string;
    unexpectedError: (message: string) => string;
  };
}

const ENGLISH: DemoCopy = {
  htmlLang: 'en',
  documentTitle: 'Reactive MD · Interactive Document Lab',
  languageToggle: {
    label: '中',
    labelLang: 'zh-CN',
    ariaLabel: 'Switch to Chinese',
  },
  masthead: {
    eyebrow: 'Local interactive document lab',
    viewSwitcher: 'View switcher',
    playground: 'Playground',
    guide: 'User Guide',
    themeLight: 'Light',
    themeDark: 'Dark',
    repository: 'GitHub repository',
    menu: 'Menu',
    language: 'Language',
  },
  guide: {
    title: 'User Guide',
    back: 'Back to Playground',
  },
  authorTools: {
    ariaLabel: 'Document tools',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    showSource: 'Show source',
    simpleView: 'Presentation mode',
    importDocument: 'Import',
    exportDocument: 'Export',
  },
  exportDialog: {
    title: 'Export document',
    close: 'Close export dialog',
    formatLegend: 'Output format',
    interactive: 'Interactive HTML',
    static: 'Static HTML',
    pdf: 'PDF',
    stateLegend: 'Starting values',
    authorInitial: 'Author initial values',
    currentPreview: 'Current preview state',
    currentUnavailable:
      'The current preview state is unavailable because no matching document is running.',
    summaryLegend: 'Export summary',
    summaryParameters: 'Parameters',
    summaryImages: 'Images',
    changed: (changed, total) =>
      `${changed} of ${total} public parameter${total === 1 ? '' : 's'} differ from the author initial values.`,
    unchanged: (total) =>
      `All ${total} public parameter${total === 1 ? '' : 's'} match the author initial values.`,
    noParameters: 'This document has no public parameters.',
    noCurrent: 'The current preview state cannot be compared or exported right now.',
    imageNone: 'No images: the HTML file will be completely self-contained.',
    compilePending: 'Waiting for the current source to finish compiling…',
    compileFailed: (message) => `Resolve compilation errors before exporting. ${message}`,
    compileUnavailable:
      'Export is available after the current source compiles.',
    assetsLoading: 'Checking the generated export assets…',
    assetsFailed: (message) =>
      `The generated export assets are missing or unreadable: ${message}. Run npm run build before exporting.`,
    buildFailed: (message) => `Export failed. ${message}`,
    exportHtml: 'Export HTML',
    exportPdf: 'Download PDF',
    printPdf: 'Print or save PDF',
    pdfDownloadHint:
      'The local dev server renders the PDF and downloads the file directly.',
    pdfPrintHint:
      'The browser print dialog opens for saving. The export trace records the print interaction as printed.',
    exportMarkdown: 'Download Markdown',
    exportState: 'Save current state',
    exportStateHint:
      'Download the current preview parameters as a reactive-md-state/v1 file for a CLI build.',
    exportStateUnavailable: 'Open a running preview to save its current parameters.',
    preparing: 'Preparing export…',
    cancel: 'Cancel',
  },
  editor: {
    region: 'Source editor',
    editView: 'Edit',
    previewView: 'Preview',
    viewSwitch: 'Editor view',
    sourceLabel: 'Reactive MD source',
    diagnosticsRegion: 'Compile and runtime diagnostics',
    diagnosticsHeading: 'Diagnostics',
    diagnosticsCompiling: 'Compiling',
    diagnosticsCount: (count) => `${count}`,
    diagnosticsNone: 'None',
    diagnosticsEmptyCompiling: 'Compiling the latest source…',
    locate: 'Locate in editor',
    warning: 'Warning',
    error: 'Error',
    position: (line, column) => `Line ${line} · Column ${column}`,
  },
  outline: {
    heading: 'Outline',
    empty: 'No headings yet',
    untitled: 'Untitled heading',
    close: 'Close outline',
    expand: (title) => `Expand ${title}`,
    collapse: (title) => `Collapse ${title}`,
  },
  sidebar: {
    region: 'Workbench sidebar',
    documents: 'Documents',
    outline: 'Outline',
    developerTools: 'Developer tools',
    close: 'Close sidebar',
  },
  preview: {
    region: 'Live preview',
    heading: 'Preview',
    startErrorTitle: 'Could not start document',
    preparing: 'Preparing interactive document…',
    staleTitle: 'Showing the last valid preview',
    staleBody: 'Fix the source errors to update the preview and resume author scripts.',
    disabledTitle: 'Preview disabled',
    disabledBody:
      'Fix the errors marked on the left; the preview returns automatically once compilation succeeds.',
    enterFullscreen: 'Fullscreen preview',
    exitFullscreen: 'Exit fullscreen',
    showActions: 'Show preview actions',
    hideActions: 'Hide preview actions',
  },
  streaming: {
    nav: 'Streaming',
    title: 'Streaming source sample',
    region: 'Streaming source sample',
    controls: 'Streaming run controls',
    start: 'Start',
    cancel: 'Cancel',
    restore: 'Restore example',
    finalize: 'Finalize snapshot',
    speedLabel: 'Streaming speed',
    speedValue: (tokensPerSecond) => `${tokensPerSecond} tps`,
    progress: (revealed, total) => `Revealed ${revealed} / ${total} tokens`,
    statusLabel: 'Run status',
    statusIdle: 'Idle',
    statusDraft: 'Draft',
    statusStreaming: 'Streaming',
    statusFinalizing: 'Applying final snapshot',
    statusDone: 'Complete',
    statusFailed: 'Final failed',
    statusCancelled: 'Cancelled',
    count: (count) => `${count}`,
    sourceHeading: 'Source',
    previewHeading: 'Live preview',
    transientHeading: 'Provisional diagnostics',
    diagnosticsHeading: 'Snapshot diagnostics',
    finalHeading: 'Final diagnostics',
    none: 'None',
  },
  status: {
    compileFailed: 'Compile failed',
    compiled: (diagnostics, duration, fallback) => {
      const base = diagnostics
        ? `Compiled · ${diagnostics} diagnostic${diagnostics === 1 ? '' : 's'}`
        : `Compiled · ${duration} ms`;
      return fallback ? `${base} · main thread` : base;
    },
    compiling: 'Compiling…',
    compilingMainThread: 'Compiling… · main thread',
    waiting: 'Waiting to compile',
    unexpectedError: (message) => `Unexpected document error: ${message}`,
  },
};

const CHINESE: DemoCopy = {
  htmlLang: 'zh-CN',
  documentTitle: 'Reactive MD · 交互文档实验室',
  languageToggle: {
    label: 'EN',
    labelLang: 'en',
    ariaLabel: '切换到英文',
  },
  masthead: {
    eyebrow: '本地交互文档实验室',
    viewSwitcher: '页面切换',
    playground: 'Playground',
    guide: '使用指南',
    themeLight: '浅色',
    themeDark: '深色',
    repository: 'GitHub 仓库',
    menu: '菜单',
    language: '语言',
  },
  guide: {
    title: '使用指南',
    back: '返回 Playground',
  },
  authorTools: {
    ariaLabel: '文档工具',
    lightTheme: '浅色主题',
    darkTheme: '深色主题',
    showSource: '显示源码',
    simpleView: '演示模式',
    importDocument: '导入',
    exportDocument: '导出',
  },
  exportDialog: {
    title: '导出文档',
    close: '关闭导出对话框',
    formatLegend: '输出格式',
    interactive: '交互式 HTML',
    static: '静态 HTML',
    pdf: 'PDF',
    stateLegend: '起始值',
    authorInitial: '作者初值',
    currentPreview: '当前预览状态',
    currentUnavailable: '当前没有正在运行且匹配的文档，无法使用预览状态。',
    summaryLegend: '导出摘要',
    summaryParameters: '参数',
    summaryImages: '图片',
    changed: (changed, total) => `${total} 个公开参数中有 ${changed} 个与作者初值不同。`,
    unchanged: (total) => `全部 ${total} 个公开参数都与作者初值相同。`,
    noParameters: '这份文档没有公开参数。',
    noCurrent: '当前预览状态暂时无法比较或导出。',
    imageNone: '没有图片：HTML 文件完全自包含。',
    compilePending: '正在等待当前源码编译完成…',
    compileFailed: (message) => `请修复编译错误后再导出。${message}`,
    compileUnavailable: '源码编译完成后即可导出。',
    assetsLoading: '正在检查生成的导出资源…',
    assetsFailed: (message) =>
      `生成的导出资源缺失或无法读取：${message}。请先运行 npm run build 再导出。`,
    buildFailed: (message) => `导出失败。${message}`,
    exportHtml: '导出 HTML',
    exportPdf: '下载 PDF',
    printPdf: '打印或保存 PDF',
    pdfDownloadHint: '本地开发服务器渲染 PDF 并直接下载文件。',
    pdfPrintHint: '浏览器打印窗口负责保存。导出追踪把打印交互记为 printed。',
    exportMarkdown: '下载 Markdown',
    exportState: '保存当前状态',
    exportStateHint: '把当前预览参数下载为 reactive-md-state/v1 文件，供 CLI 构建使用。',
    exportStateUnavailable: '请先打开正在运行的预览，再保存当前参数。',
    preparing: '正在准备导出…',
    cancel: '取消',
  },
  editor: {
    region: '源码编辑器',
    editView: '编辑',
    previewView: '预览',
    viewSwitch: '编辑视图',
    sourceLabel: 'Reactive MD 源码',
    diagnosticsRegion: '编译与运行诊断',
    diagnosticsHeading: '诊断',
    diagnosticsCompiling: '编译中',
    diagnosticsCount: (count) => `${count} 条`,
    diagnosticsNone: '无',
    diagnosticsEmptyCompiling: '正在编译最新源码…',
    locate: '在编辑器中定位',
    warning: '警告',
    error: '错误',
    position: (line, column) => `第 ${line} 行 · 第 ${column} 列`,
  },
  outline: {
    heading: '大纲',
    empty: '暂无标题',
    untitled: '未命名标题',
    close: '关闭大纲',
    expand: (title) => `展开 ${title}`,
    collapse: (title) => `折叠 ${title}`,
  },
  sidebar: {
    region: '工作区侧栏',
    documents: '文档',
    outline: '大纲',
    developerTools: '开发者工具',
    close: '关闭侧栏',
  },
  preview: {
    region: '实时预览',
    heading: '预览',
    startErrorTitle: '无法启动文档',
    preparing: '正在准备交互文档…',
    staleTitle: '正在显示上次成功的预览',
    staleBody: '修正源码错误后，预览会更新，作者脚本也会恢复。',
    disabledTitle: '预览已停用',
    disabledBody: '请修正左侧标记的错误，编译成功后预览会自动恢复。',
    enterFullscreen: '全屏预览',
    exitFullscreen: '退出全屏',
    showActions: '显示预览操作',
    hideActions: '隐藏预览操作',
  },
  streaming: {
    nav: '流式',
    title: '流式源码示例',
    region: '流式源码示例',
    controls: '流式运行控制',
    start: '开始',
    cancel: '取消',
    restore: '恢复示例',
    finalize: '提交最终快照',
    speedLabel: '流式速度',
    speedValue: (tokensPerSecond) => `${tokensPerSecond} tps`,
    progress: (revealed, total) => `已显示 ${revealed} / ${total} token`,
    statusLabel: '运行状态',
    statusIdle: '空闲',
    statusDraft: '草稿',
    statusStreaming: '流式生成中',
    statusFinalizing: '正在应用最终快照',
    statusDone: '已完成',
    statusFailed: '最终快照失败',
    statusCancelled: '已取消',
    count: (count) => `${count}`,
    sourceHeading: '源码',
    previewHeading: '实时预览',
    transientHeading: '临时诊断',
    diagnosticsHeading: '快照诊断',
    finalHeading: '最终诊断',
    none: '无',
  },
  status: {
    compileFailed: '编译失败',
    compiled: (diagnostics, duration, fallback) => {
      const base = diagnostics
        ? `已编译 · ${diagnostics} 条诊断`
        : `已编译 · ${duration} ms`;
      return fallback ? `${base} · 主线程` : base;
    },
    compiling: '编译中…',
    compilingMainThread: '编译中… · 主线程',
    waiting: '等待编译',
    unexpectedError: (message) => `文档出现未预期错误：${message}`,
  },
};

export const COPY: Record<Language, DemoCopy> = {
  en: ENGLISH,
  zh: CHINESE,
};

export function copyFor(language: Language): DemoCopy {
  return COPY[language];
}

const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE);

export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(LanguageContext);
}

/** Copy for the language currently provided by `LanguageProvider`. */
export function useCopy(): DemoCopy {
  return COPY[useLanguage()];
}

export function pick<T>(language: Language, en: T, zh: T): T {
  return language === 'zh' ? zh : en;
}
