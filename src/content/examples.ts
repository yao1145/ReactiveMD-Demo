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
  hint: string;
  source: string;
  titleZh: string;
  hintZh: string;
  sourceZh: string;
}

/** The subset of an example that follows the active demo language. */
export interface LocalizedExample {
  id: string;
  section: PlaygroundExample['section'];
  title: string;
  hint: string;
  source: string;
}

/** All playground documents use the explicit local-draft-3 syntax. */
const extensionExamples = (installedExtensions.examples ?? []) as readonly PlaygroundExample[];
export const EXAMPLES: PlaygroundExample[] = [
  {
    id: 'classroom', section: 'scenario',
    title: 'Classroom', titleZh: '课堂教学',
    hint: 'Build a square wave from sine waves, derive its Fourier coefficients and inspect convergence.',
    hintZh: '用正弦波拼出方波，推导傅里叶系数，观察部分和与跳跃附近的振荡。',
    source: lf(classroomSource), sourceZh: lf(classroomZhSource),
  },
  {
    id: 'proposal', section: 'scenario',
    title: 'Proposal', titleZh: '方案展示',
    hint: 'Discuss a four-week trial with a shopping list, a live budget and a delivery schedule.',
    hintZh: '带着采购清单、可调整预算和实施时间表，讨论一项四周试用方案。',
    source: lf(proposalSource), sourceZh: lf(proposalZhSource),
  },
  {
    id: 'minimal-budget', section: 'scenario',
    title: 'Workshop budget', titleZh: '工作坊预算',
    hint: 'Adjust the budget, switch component modes, and export the result as PDF.',
    hintZh: '调整预算、切换组件模式，再把计算结果导出为 PDF。',
    source: lf(minimalBudgetSource), sourceZh: lf(minimalBudgetZhSource),
  },
  {
    id: 'survey', section: 'scenario',
    title: 'Survey', titleZh: '活动调研',
    hint: 'Choose a time and topics, then prepare a personal summary for the organiser.',
    hintZh: '填写时间、兴趣与材料偏好，生成一份可发给组织者的个人摘要。',
    source: lf(surveySource), sourceZh: lf(surveyZhSource),
  },
  {
    id: SURVEY_EXAMPLE_ID, section: 'scenario',
    title: 'Open-air cinema', titleZh: '露天电影夜',
    hint: 'Preview the survey online. Run npm run dev locally to submit a reply and watch two live tallies.',
    hintZh: '线上可预览问卷。运行本地开发服务后，可提交回复并查看两块实时计票板。',
    source: lf(networkSurveySource), sourceZh: lf(networkSurveyZhSource),
  },
  {
    id: 'blog', section: 'scenario',
    title: 'Blog', titleZh: '博客长文',
    hint: 'Reread Zhu Ziqing with a personal reflection, switch reading notes and leave a thought of your own.',
    hintZh: '重读《背影》，在文学短评和生活随记之间，留一句自己的阅读旁注。',
    source: lf(blogSource), sourceZh: lf(blogZhSource),
  },
  {
    id: 'features', section: 'feature',
    title: 'Repair day', titleZh: '社区维修日',
    hint: 'Plan and run a one-day repair café: brief, programme, budget, floor plan and the day itself in one continuous document.',
    hintZh: '从活动简报、维修项目、预算和场地布置，到当天运行与交接，用一篇连续文档完成社区维修日。',
    source: lf(featuresSource), sourceZh: lf(featuresZhSource),
  },
  {
    id: 'sci-fi-theme', section: 'reference',
    title: 'Sci-fi theme', titleZh: '科幻主题',
    hint: 'Open a console-style document styled by the bundled sci-fi theme, then change its controls.',
    hintZh: '打开一篇由内置科幻主题渲染的控制台风格文档，并操作其中的控件。',
    source: lf(sciFiThemeSource), sourceZh: lf(sciFiThemeZhSource),
  },
  {
    id: 'diagnostics',
    section: 'debug',
    title: 'Diagnostics',
    hint: 'Intentionally broken source',
    source: lf(diagnosticsSource),
    titleZh: '调试示例',
    hintZh: '故意写错的源码',
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

/** Resolve an example's title, hint and source for the active language. */
export function localizedExample(example: PlaygroundExample, language: Language): LocalizedExample {
  return language === 'zh'
    ? { id: example.id, section: example.section, title: example.titleZh, hint: example.hintZh, source: example.sourceZh }
    : { id: example.id, section: example.section, title: example.title, hint: example.hint, source: example.source };
}

/** Every example resolved for the active language, in catalog order. */
export function localizedExamples(language: Language): LocalizedExample[] {
  return EXAMPLES.map((example) => localizedExample(example, language));
}

/** Shorthand for the active-language source of one example. */
export function exampleSource(example: PlaygroundExample, language: Language): string {
  return localizedExample(example, language).source;
}
