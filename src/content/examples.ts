import type { Language } from '../ui/i18n';
import { SURVEY_EXAMPLE_ID } from '../network/survey-contract';
import networkSurveySource from '../../content/examples/local/scenarios/network-survey.reactive.md?raw';
import networkSurveyZhSource from '../../content/examples/local/scenarios/network-survey-zh.reactive.md?raw';
import * as installedExtensions from '../../extensions';
import featuresSource from '../../content/examples/local/showcase/features.reactive.md?raw';
import diagnosticsSource from '../../content/examples/local/diagnostics.reactive.md?raw';
import featuresZhSource from '../../content/examples/local/showcase/zh/features.reactive.md?raw';
import diagnosticsZhSource from '../../content/examples/local/zh/diagnostics.reactive.md?raw';
import classroomSource from '../../content/examples/local/scenarios/classroom.reactive.md?raw';
import classroomZhSource from '../../content/examples/local/scenarios/classroom-zh.reactive.md?raw';
import proposalSource from '../../content/examples/local/scenarios/proposal.reactive.md?raw';
import proposalZhSource from '../../content/examples/local/scenarios/proposal-zh.reactive.md?raw';
import minimalBudgetSource from '../../content/examples/local/scenarios/minimal-budget.reactive.md?raw';
import minimalBudgetZhSource from '../../content/examples/local/scenarios/minimal-budget-zh.reactive.md?raw';
import surveySource from '../../content/examples/local/scenarios/survey.reactive.md?raw';
import surveyZhSource from '../../content/examples/local/scenarios/survey-zh.reactive.md?raw';
import blogSource from '../../content/examples/local/scenarios/blog.reactive.md?raw';
import blogZhSource from '../../content/examples/local/scenarios/blog-zh.reactive.md?raw';
import sciFiThemeSource from '../../content/examples/local/showcase/sci-fi-theme.reactive.md?raw';
import sciFiThemeZhSource from '../../content/examples/local/showcase/zh/sci-fi-theme.reactive.md?raw';
import authorCssSource from '../../content/examples/local/showcase/author-css.reactive.md?raw';
import authorCssZhSource from '../../content/examples/local/showcase/zh/author-css.reactive.md?raw';
import authorJavaScriptSource from '../../content/examples/local/showcase/author-javascript.reactive.md?raw';
import authorJavaScriptZhSource from '../../content/examples/local/showcase/zh/author-javascript.reactive.md?raw';
import extendedHtmlSource from '../../content/examples/local/showcase/extended-html.reactive.md?raw';
import extendedHtmlZhSource from '../../content/examples/local/showcase/zh/extended-html.reactive.md?raw';

/** Source offsets address the exact text the editor holds. Vite's `?raw` import
 * keeps the file's line endings, and a Windows checkout is CRLF while
 * CodeMirror stores LF, which shifts every preview source range by one column
 * per preceding line. Normalize once at import so both agree. */
const lf = (text: string): string => text.replace(/\r\n?/g, '\n');

/** One standalone document, its navigation section and both translations. */
export interface PlaygroundExample {
  id: string;
  section: 'scenario' | 'feature' | 'reference' | 'debug';
  title: string;
  source: string;
  titleZh: string;
  sourceZh: string;
}

/** The subset of an example that follows the active demo language. */
export interface LocalizedExample {
  id: string;
  section: PlaygroundExample['section'];
  title: string;
  source: string;
}

/** All playground documents use the explicit local-draft-3 syntax. */
const extensionExamples = (installedExtensions.examples ?? []) as readonly PlaygroundExample[];
export const EXAMPLES: PlaygroundExample[] = [
  {
    id: 'classroom', section: 'scenario',
    title: 'Classroom', titleZh: '课堂教学',
    source: lf(classroomSource), sourceZh: lf(classroomZhSource),
  },
  {
    id: 'proposal', section: 'scenario',
    title: 'Proposal', titleZh: '方案展示',
    source: lf(proposalSource), sourceZh: lf(proposalZhSource),
  },
  {
    id: 'minimal-budget', section: 'scenario',
    title: 'Workshop budget', titleZh: '工作坊预算',
    source: lf(minimalBudgetSource), sourceZh: lf(minimalBudgetZhSource),
  },
  {
    id: 'survey', section: 'scenario',
    title: 'Survey', titleZh: '活动调研',
    source: lf(surveySource), sourceZh: lf(surveyZhSource),
  },
  {
    id: SURVEY_EXAMPLE_ID, section: 'scenario',
    title: 'Open-air cinema', titleZh: '露天电影夜',
    source: lf(networkSurveySource), sourceZh: lf(networkSurveyZhSource),
  },
  {
    id: 'blog', section: 'scenario',
    title: 'Blog', titleZh: '博客长文',
    source: lf(blogSource), sourceZh: lf(blogZhSource),
  },
  {
    id: 'features', section: 'feature',
    title: 'Repair day', titleZh: '社区维修日',
    source: lf(featuresSource), sourceZh: lf(featuresZhSource),
  },
  {
    id: 'sci-fi-theme', section: 'reference',
    title: 'Sci-fi theme', titleZh: '科幻主题',
    source: lf(sciFiThemeSource), sourceZh: lf(sciFiThemeZhSource),
  },
  {
    id: 'author-css', section: 'reference',
    title: 'Author CSS', titleZh: '作者 CSS',
    source: lf(authorCssSource), sourceZh: lf(authorCssZhSource),
  },
  {
    id: 'author-javascript', section: 'reference',
    title: 'Author JavaScript', titleZh: '作者 JavaScript',
    source: lf(authorJavaScriptSource), sourceZh: lf(authorJavaScriptZhSource),
  },
  {
    id: 'extended-html', section: 'reference',
    title: 'Extended HTML', titleZh: '扩展 HTML',
    source: lf(extendedHtmlSource), sourceZh: lf(extendedHtmlZhSource),
  },
  {
    id: 'diagnostics',
    section: 'debug',
    title: 'Diagnostics',
    source: lf(diagnosticsSource),
    titleZh: '调试示例',
    sourceZh: lf(diagnosticsZhSource),
  },
  ...extensionExamples,
];

if (new Set(EXAMPLES.map(example => example.id)).size !== EXAMPLES.length) {
  throw new Error('Demo extensions conflict with a built-in example ID.');
}

export const DEFAULT_EXAMPLE_ID = 'classroom';

/** The feature group keeps the integrated component tour. */
export function isFeatureExample(example: Pick<PlaygroundExample, 'section'>): boolean {
  return example.section === 'feature';
}

/** Keep old game bookmarks useful after their packages were integrated. */
export function resolveExampleId(id: string | null | undefined): string | undefined {
  const resolved = id === 'tetris' || id === 'game-2048' ? 'games' : id;
  return EXAMPLES.some(example => example.id === resolved) ? resolved! : undefined;
}

/** Resolve an example's title and source for the active language. */
export function localizedExample(example: PlaygroundExample, language: Language): LocalizedExample {
  return language === 'zh'
    ? { id: example.id, section: example.section, title: example.titleZh, source: example.sourceZh }
    : { id: example.id, section: example.section, title: example.title, source: example.source };
}

/** Every example resolved for the active language, in catalog order. */
export function localizedExamples(language: Language): LocalizedExample[] {
  return EXAMPLES.map((example) => localizedExample(example, language));
}

/** Shorthand for the active-language source of one example. */
export function exampleSource(example: PlaygroundExample, language: Language): string {
  return localizedExample(example, language).source;
}
