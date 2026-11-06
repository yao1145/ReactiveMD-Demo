import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { LocalDocument } from 'reactive-md';
import type { EditorViewMode, ReactiveMarkdownEditorHandle } from 'reactive-md-editor';
import { documentOutline, flattenOutline, outlineHeadingAt, type OutlineHeading } from './document-outline-model';
import { useCopy } from '../ui/i18n';
import { CloseIcon, FilesIcon, OutlineIcon, SlidersIcon } from '../ui/icons';
import { useScrollContainer } from '../ui/use-scroll-container';
import './document-outline.css';

export type SidebarTab = 'documents' | 'outline' | 'devtools';

export interface OutlineWorkspaceProps {
  document: LocalDocument | null;
  source: string;
  documentKey: string;
  mode: EditorViewMode;
  onModeChange(mode: EditorViewMode): void;
  editor: RefObject<ReactiveMarkdownEditorHandle | null>;
  sidebarOpen: boolean;
  onSidebarOpenChange(open: boolean): void;
  sidebarTab: SidebarTab;
  onSidebarTabChange(tab: SidebarTab): void;
  documentsPanel: ReactNode;
  devtoolsPanel: ReactNode;
  children: ReactNode;
}

export function OutlineWorkspace({
  document,
  source,
  documentKey,
  mode,
  onModeChange,
  editor,
  sidebarOpen,
  onSidebarOpenChange,
  sidebarTab,
  onSidebarTabChange,
  documentsPanel,
  devtoolsPanel,
  children,
}: OutlineWorkspaceProps) {
  const copy = useCopy();
  const outlineCopy = copy.outline;
  const sidebarCopy = copy.sidebar;
  const root = useRef<HTMLDivElement>(null);
  const outlineScroll = useScrollContainer<HTMLElement>();
  const headings = useMemo(() => documentOutline(document), [document]);
  const flat = useMemo(() => flattenOutline(headings), [headings]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const current = document?.source === source;
  const outlineVisible = sidebarOpen && sidebarTab === 'outline';

  useEffect(() => { setCollapsed(new Set()); setActive(null); }, [documentKey]);

  function previewHeadings(): Map<string, HTMLElement> {
    const article = root.current?.querySelector('.preview-stage > .local-document');
    const elements = Array.from(article?.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]') ?? [])
      .filter(element => element.closest('.local-document') === article);
    const ranges = new Map(elements.map(element => [element.dataset.rmdSourceStart, element]));
    // Components may add their own headings. Only document anchors correspond
    // to source headings, and a changed/conditional tree must never shift indices.
    const anchored = elements.filter(element => element.id.startsWith('local-heading-'));
    const result = new Map<string, HTMLElement>();
    for (const heading of flat) {
      const exact = ranges.get(String(heading.range.start));
      const matches = anchored.length === flat.length ? [anchored[heading.index]]
        : anchored.filter(element => element.tagName === `H${heading.depth}` && element.textContent?.trim() === heading.title);
      const element = exact ?? (matches.length === 1 ? matches[0] : undefined);
      if (element) result.set(heading.key, element);
    }
    return result;
  }

  const sourcePosition = () => {
    if (!outlineVisible || !current || mode === 'preview') return;
    setActive(outlineHeadingAt(flat, editor.current?.getSelection().start ?? 0)?.key ?? null);
  };

  useEffect(() => {
    if (!outlineVisible || !current || sidebarTab !== 'outline') return;
    if (mode === 'edit') { sourcePosition(); return; }
    const preview = root.current?.querySelector('.editor-preview');
    if (!preview) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (mode === 'split' && editor.current?.getEditorElement()?.contains(window.document.activeElement)) return;
      const top = Math.max(0, preview.getBoundingClientRect().top) + 32;
      let next: string | null = flat[0]?.key ?? null;
      const elements = previewHeadings();
      for (const heading of flat) {
        const element = elements.get(heading.key);
        if (!element || !element.getClientRects().length) continue;
        if (element.getBoundingClientRect().top > top) break;
        next = heading.key;
      }
      setActive(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    preview.addEventListener('scroll', schedule, true);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(preview, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open'] });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      preview.removeEventListener('scroll', schedule, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [flat, mode, current, editor, outlineVisible, sidebarTab]);

  function close() {
    onSidebarOpenChange(false);
    window.document.getElementById('sidebar-toggle')?.focus();
  }

  function navigate(heading: OutlineHeading) {
    if (!current) return;
    setActive(heading.key);
    if (mode !== 'preview') editor.current?.selectRange(heading.range);
    if (mode !== 'edit') {
      const element = previewHeadings().get(heading.key);
      if (element) {
        for (let parent = element.parentElement; parent && parent !== root.current; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        if (mode === 'preview') {
          element.tabIndex = -1;
          element.focus({ preventScroll: true });
        }
        const preview = element.closest<HTMLElement>('.editor-preview');
        if (preview) {
          const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
          preview.scrollTop += element.getBoundingClientRect().top
            - preview.getBoundingClientRect().top - preview.clientTop - margin;
        }
      } else {
        onModeChange('edit');
        requestAnimationFrame(() => editor.current?.selectRange(heading.range));
      }
    }
    if (window.matchMedia('(max-width: 1099px)').matches) onSidebarOpenChange(false);
  }

  function branch(items: readonly OutlineHeading[]): ReactNode {
    return <ul className="outline-list">{items.map(heading => {
      const expanded = !collapsed.has(heading.key);
      const title = heading.title || outlineCopy.untitled;
      const hasActiveChild = flattenOutline(heading.children).some(item => item.key === active);
      return <li key={heading.key}>
        <div className={`outline-row${active === heading.key ? ' is-active' : ''}${hasActiveChild ? ' has-active-child' : ''}`}>
          {heading.children.length ? <button type="button" className="outline-disclosure" aria-expanded={expanded}
            aria-label={expanded ? outlineCopy.collapse(title) : outlineCopy.expand(title)}
            onClick={() => setCollapsed(previous => {
              const next = new Set(previous);
              if (expanded) next.add(heading.key); else next.delete(heading.key);
              return next;
            })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={expanded ? 'm3 6 5 5 5-5' : 'm6 3 5 5-5 5'} /></svg>
          </button> : <span className="outline-leaf" aria-hidden="true" />}
          <button type="button" className="outline-link" title={title} disabled={!current}
            aria-current={active === heading.key ? 'location' : undefined} onClick={() => navigate(heading)}>{title}</button>
        </div>
        {heading.children.length ? <div hidden={!expanded}>{branch(heading.children)}</div> : null}
      </li>;
    })}</ul>;
  }

  return <div ref={root} className={`workspace has-editor${sidebarOpen ? ' has-sidebar' : ''}`}
    onKeyUp={sourcePosition} onPointerUp={sourcePosition} onFocusCapture={sourcePosition}>
    {sidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label={sidebarCopy.close} onClick={close} /> : null}
    <aside id="document-sidebar" className="workspace-sidebar" hidden={!sidebarOpen} aria-label={sidebarCopy.region}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}>
      <div className="sidebar-tabs" role="tablist" aria-label={sidebarCopy.region}>
        <button type="button" role="tab" aria-selected={sidebarTab === 'documents'} title={sidebarCopy.documents}
          aria-label={sidebarCopy.documents} className="sidebar-tab"
          onClick={() => onSidebarTabChange('documents')}>
          <FilesIcon />
        </button>
        <button type="button" role="tab" aria-selected={sidebarTab === 'outline'} title={sidebarCopy.outline}
          aria-label={sidebarCopy.outline} className="sidebar-tab" id="outline-toggle"
          onClick={() => onSidebarTabChange('outline')}>
          <OutlineIcon />
        </button>
        <button type="button" role="tab" aria-selected={sidebarTab === 'devtools'} title={sidebarCopy.developerTools}
          aria-label={sidebarCopy.developerTools} className="sidebar-tab"
          onClick={() => onSidebarTabChange('devtools')}>
          <SlidersIcon />
        </button>
        <button type="button" className="icon-button sidebar-close" title={sidebarCopy.close}
          aria-label={sidebarCopy.close} onClick={close}>
          <CloseIcon />
        </button>
      </div>
      <div className="sidebar-body" role="tabpanel" hidden={sidebarTab !== 'documents'}>
        {documentsPanel}
      </div>
      <div className="sidebar-body" role="tabpanel" hidden={sidebarTab !== 'outline'}>
        <nav id="document-outline" aria-label={outlineCopy.heading} className="outline-scroll" ref={outlineScroll}>
          {headings.length ? branch(headings) : <p className="outline-empty">{outlineCopy.empty}</p>}
        </nav>
      </div>
      <div className="sidebar-body" role="tabpanel" hidden={sidebarTab !== 'devtools'}>
        {devtoolsPanel}
      </div>
    </aside>
    {children}
  </div>;
}
