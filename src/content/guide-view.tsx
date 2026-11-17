import { useCopy, useLanguage, type Language } from '../ui/i18n';
import { GuideDocument } from './guide-examples';
import guideEnSource from '../../content/guides/local-guide-en.md?raw';
import guideZhSource from '../../content/guides/local-guide-ch.md?raw';

const GUIDE_REPOSITORY = 'https://github.com/yao1145/ReactiveMD/blob/main';

// Resolve guide links from their repository directory when rendered in the demo.
function rewriteGuideLinks(source: string): string {
  return source.replace(/\]\(([^\s)]+)\)/g, (match, target: string) => {
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) return match;
    return `](${new URL(target, `${GUIDE_REPOSITORY}/docs/guides/`).href})`;
  });
}

const GUIDE_SOURCES: Record<Language, string> = {
  en: rewriteGuideLinks(guideEnSource),
  zh: rewriteGuideLinks(guideZhSource),
};

interface GuideViewProps {
  onBack(): void;
}

export function GuideView({ onBack }: GuideViewProps) {
  const language = useLanguage();
  const copy = useCopy();
  return (
    <main className="guide-view">
      <div className="guide-toolbar">
        <div>
          <h2>{copy.guide.title}</h2>
        </div>
        <div className="guide-actions">
          <button type="button" className="button button-secondary" onClick={onBack}>
            {copy.guide.back}
          </button>
        </div>
      </div>
      <div className="guide-paper">
        <GuideDocument source={GUIDE_SOURCES[language]} language={language} />
      </div>
    </main>
  );
}
