import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import type { Language } from './i18n';
import {
  MAX_DOCUMENT_NAME_LENGTH,
  MAX_FOLDER_NAME_LENGTH,
  activeFolders,
  documentInTrash,
  folderInTrash,
  trashedRoots,
  type LibraryDocument,
  type LibraryFolder,
  type LibraryMode,
  type LibrarySaveStatus,
  type LibrarySnapshot,
} from './document-library';
import {
  ChevronRightIcon,
  FileIcon,
  FilePlusIcon,
  FilesIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilIcon,
  RestoreIcon,
  TrashIcon,
} from './icons';
import type { LocalizedExample } from './examples';
import { useScrollContainer } from './use-scroll-container';
import './document-tree.css';

export interface DocumentTreeCopy {
  region: string;
  newFile: string;
  newFolder: string;
  rename: string;
  moveToTrash: string;
  restore: string;
  deleteForever: string;
  emptyTrash: string;
  emptyTrashConfirm: string;
  deleteConfirm: (name: string) => string;
  delete: string;
  cancel: string;
  close: string;
  examples: string;
  documents: string;
  trash: string;
  untitled: string;
  importedName: string;
  copySuffix: string;
  newFolderName: string;
  noDocuments: string;
  trashEmpty: string;
  collapse: (name: string) => string;
  expand: (name: string) => string;
  saving: string;
  saved: string;
  failed: string;
  retry: string;
  corrupt: string;
  unavailable: string;
  sections: Record<LocalizedExample['section'], string>;
}

export const TREE_COPY: Record<Language, DocumentTreeCopy> = {
  en: {
    region: 'Document manager',
    newFile: 'New document',
    newFolder: 'New folder',
    rename: 'Rename',
    moveToTrash: 'Move to trash',
    restore: 'Restore',
    deleteForever: 'Delete permanently',
    emptyTrash: 'Empty trash',
    emptyTrashConfirm: 'Delete everything in Trash permanently? This cannot be undone.',
    deleteConfirm: (name) => `Delete “${name}” permanently? This cannot be undone.`,
    delete: 'Delete',
    cancel: 'Cancel',
    close: 'Close sidebar',
    examples: 'Examples',
    documents: 'Documents',
    trash: 'Trash',
    untitled: 'Untitled document',
    importedName: 'Imported document',
    copySuffix: ' copy',
    newFolderName: 'New folder',
    noDocuments: 'No documents yet',
    trashEmpty: 'Trash is empty',
    collapse: (name) => `Collapse ${name}`,
    expand: (name) => `Expand ${name}`,
    saving: 'Saving',
    saved: 'Saved',
    failed: 'Not saved',
    retry: 'Retry save',
    corrupt: 'Saved documents could not be read completely. Valid entries were kept.',
    unavailable: 'Browser storage is unavailable. Documents stay in this tab only.',
    sections: {
      scenario: 'Scenarios',
      feature: 'Feature demo',
      legacy: 'Component tours',
      reference: 'Extensions',
      debug: 'Diagnostics',
    },
  },
  zh: {
    region: '文档管理',
    newFile: '新建文档',
    newFolder: '新建文件夹',
    rename: '重命名',
    moveToTrash: '移到回收站',
    restore: '恢复',
    deleteForever: '永久删除',
    emptyTrash: '清空回收站',
    emptyTrashConfirm: '永久删除回收站中的全部内容？此操作无法撤销。',
    deleteConfirm: (name) => `永久删除“${name}”？此操作无法撤销。`,
    delete: '删除',
    cancel: '取消',
    close: '关闭侧栏',
    examples: '示例',
    documents: '文档',
    trash: '回收站',
    untitled: '未命名文档',
    importedName: '导入的文档',
    copySuffix: ' 副本',
    newFolderName: '新建文件夹',
    noDocuments: '还没有文档',
    trashEmpty: '回收站为空',
    collapse: (name) => `收起 ${name}`,
    expand: (name) => `展开 ${name}`,
    saving: '保存中',
    saved: '已保存',
    failed: '未保存',
    retry: '重试保存',
    corrupt: '已保存的文档未能完整读取，有效条目已保留。',
    unavailable: '浏览器存储不可用，文档只保存在当前标签页。',
    sections: {
      scenario: '场景',
      feature: '功能演示',
      legacy: '组件示例',
      reference: '扩展',
      debug: '诊断',
    },
  },
};

type TreeSelection =
  | { kind: 'document'; id: string }
  | { kind: 'folder'; id: string }
  | { kind: 'example'; id: string }
  | { kind: 'root' }
  | { kind: 'trash' }
  | null;

type RenameState = { kind: 'document' | 'folder'; id: string; value: string };

type ConfirmState =
  | { kind: 'empty-trash' }
  | { kind: 'delete'; target: { kind: 'document' | 'folder'; id: string; name: string } }
  | null;

interface RowProps {
  depth: number;
  icon: ReactNode;
  label: string;
  expanded?: boolean;
  hasChildren?: boolean;
  active?: boolean;
  muted?: boolean;
  dropActive?: boolean;
  draggable?: boolean;
  nodeId?: string;
  nodeKind?: 'document' | 'folder' | 'example' | 'root' | 'trash';
  trailing?: ReactNode;
  onClick(): void;
  onToggle?(): void;
  onDragStart?(event: DragEvent<HTMLDivElement>): void;
  onDragOver?(event: DragEvent<HTMLDivElement>): void;
  onDragLeave?(event: DragEvent<HTMLDivElement>): void;
  onDrop?(event: DragEvent<HTMLDivElement>): void;
  renaming?: { value: string; maxLength: number; onChange(value: string): void; onCommit(): void; onCancel(): void } | null;
  labels: DocumentTreeCopy;
}

function TreeRow(props: RowProps) {
  const { depth, icon, label, expanded, hasChildren, active, muted, trailing } = props;
  return (
    <div
      className={`tree-row${active ? ' is-active' : ''}${muted ? ' is-muted' : ''}${props.dropActive ? ' is-drop-target' : ''}`}
      style={{ paddingLeft: 6 + depth * 14 }}
      role="treeitem"
      data-tree-id={props.nodeId}
      data-tree-kind={props.nodeKind}
      aria-selected={active || undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      {hasChildren ? (
        <button
          type="button"
          className={`tree-disclosure${expanded ? ' is-open' : ''}`}
          aria-label={expanded ? props.labels.collapse(label) : props.labels.expand(label)}
          onClick={(event) => { event.stopPropagation(); props.onToggle?.(); }}
        >
          <ChevronRightIcon size={14} />
        </button>
      ) : <span className="tree-disclosure-spacer" aria-hidden="true" />}
      <span className="tree-icon" aria-hidden="true">{icon}</span>
      {props.renaming ? (
        <input
          className="tree-rename"
          autoFocus
          value={props.renaming.value}
          maxLength={props.renaming.maxLength}
          aria-label={label}
          onChange={(event) => props.renaming?.onChange(event.target.value)}
          onBlur={props.renaming.onCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); props.renaming?.onCommit(); }
            if (event.key === 'Escape') { event.preventDefault(); props.renaming?.onCancel(); }
          }}
        />
      ) : (
        <button type="button" className="tree-label" title={label} onClick={props.onClick}>
          {label}
        </button>
      )}
      {trailing ? <span className="tree-trailing">{trailing}</span> : null}
    </div>
  );
}

export interface DocumentTreeProps {
  snapshot: LibrarySnapshot;
  examples: readonly LocalizedExample[];
  language: Language;
  activeMode: LibraryMode;
  activeExampleId: string | null;
  onCreateDocument(folderId: string | null): string | null;
  onCreateFolder(parentId: string | null): { id: string; name: string } | null;
  onSelectDocument(id: string): void;
  onSelectExample(id: string): void;
  onRename(kind: 'document' | 'folder', id: string, name: string): void;
  onTrash(kind: 'document' | 'folder', id: string): void;
  onRestore(kind: 'document' | 'folder', id: string): void;
  onDelete(kind: 'document' | 'folder', id: string): void;
  onEmptyTrash(): void;
  onMoveDocument(id: string, folderId: string | null): void;
  onMoveFolder(id: string, parentId: string | null): void;
  onRetry(): void;
}

const TREE_MIME = 'application/x-reactive-md-tree';

const SECTION_ORDER: readonly LocalizedExample['section'][] = [
  'scenario', 'feature', 'legacy', 'reference', 'debug',
];

export function DocumentTree(props: DocumentTreeProps) {
  const { snapshot, examples, activeMode, activeExampleId } = props;
  const copy = TREE_COPY[props.language];
  const scrollRef = useScrollContainer<HTMLDivElement>();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['examples']));
  const [selected, setSelected] = useState<TreeSelection>(null);
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const foldersById = useMemo(
    () => new Map(snapshot.folders.map(folder => [folder.id, folder])),
    [snapshot.folders],
  );
  const documentsById = useMemo(
    () => new Map(snapshot.documents.map(document => [document.id, document])),
    [snapshot.documents],
  );
  const activeFolderList = useMemo(
    () => activeFolders({ documents: snapshot.documents, folders: snapshot.folders, selectedId: snapshot.selectedId }),
    [snapshot.documents, snapshot.folders, snapshot.selectedId],
  );
  const trash = useMemo(
    () => trashedRoots({ documents: snapshot.documents, folders: snapshot.folders, selectedId: snapshot.selectedId }),
    [snapshot.documents, snapshot.folders, snapshot.selectedId],
  );
  const rootFolders = activeFolderList.filter(folder => folder.parentId === null);
  const rootDocuments = snapshot.documents.filter(document => (
    document.folderId === null && !documentInTrash(document, snapshot.folders)
  ));

  useEffect(() => {
    setSelected(previous => {
      if (previous?.kind === 'folder' && foldersById.has(previous.id)) return previous;
      if (activeMode === 'example' && activeExampleId) return { kind: 'example', id: activeExampleId };
      if (activeMode === 'documents' && snapshot.selectedId) return { kind: 'document', id: snapshot.selectedId };
      return previous?.kind === 'folder' ? previous : null;
    });
  }, [activeMode, activeExampleId, snapshot.selectedId, foldersById]);

  function toggle(key: string) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function openFolder(key: string) {
    setExpanded(previous => new Set(previous).add(key));
  }

  function dragStart(kind: 'document' | 'folder', id: string) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData(TREE_MIME, JSON.stringify({ kind, id }));
      event.dataTransfer.effectAllowed = 'move';
    };
  }

  function moveFromDrag(event: DragEvent<HTMLDivElement>, folderId: string | null): boolean {
    const raw = event.dataTransfer.getData(TREE_MIME);
    if (!raw) return false;
    try {
      const item = JSON.parse(raw) as { kind?: string; id?: string };
      if (!item.id) return false;
      if (item.kind === 'document') props.onMoveDocument(item.id, folderId);
      else if (item.kind === 'folder') props.onMoveFolder(item.id, folderId);
      return true;
    } catch {
      return false;
    }
  }

  function folderDragOver(folderId: string) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDropTarget(folderId);
    };
  }

  function folderDrop(folderId: string) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      moveFromDrag(event, folderId);
      setDropTarget(null);
    };
  }

  function dragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
  }

  function parentFolderForNewItem(): string | null {
    if (selected?.kind === 'folder') {
      const folder = foldersById.get(selected.id);
      return folder && !folderInTrash(folder, snapshot.folders) ? folder.id : null;
    }
    if (selected?.kind === 'document') {
      const document = documentsById.get(selected.id);
      if (!document || documentInTrash(document, snapshot.folders)) return null;
      const folder = document.folderId ? foldersById.get(document.folderId) : null;
      return folder && !folderInTrash(folder, snapshot.folders) ? folder.id : null;
    }
    return null;
  }

  function createDocument() {
    const parent = parentFolderForNewItem();
    if (parent) openFolder(`folder:${parent}`);
    const id = props.onCreateDocument(parent);
    if (id) setSelected({ kind: 'document', id });
  }

  function createFolder() {
    const parent = parentFolderForNewItem();
    const folder = props.onCreateFolder(parent);
    if (!folder) return;
    if (parent) openFolder(`folder:${parent}`);
    openFolder(`folder:${folder.id}`);
    setSelected({ kind: 'folder', id: folder.id });
    setRenaming({ kind: 'folder', id: folder.id, value: folder.name });
  }

  function startRename() {
    if (selected?.kind === 'document') {
      const document = documentsById.get(selected.id);
      if (document) setRenaming({ kind: 'document', id: document.id, value: document.name });
    } else if (selected?.kind === 'folder') {
      const folder = foldersById.get(selected.id);
      if (folder) setRenaming({ kind: 'folder', id: folder.id, value: folder.name });
    }
  }

  function commitRename() {
    const current = renaming;
    if (!current) return;
    const name = current.value.trim();
    setRenaming(null);
    if (name) props.onRename(current.kind, current.id, name);
  }

  const target = useMemo(() => {
    if (selected?.kind === 'document') {
      const document = documentsById.get(selected.id);
      if (document) return {
        kind: 'document' as const,
        id: document.id,
        name: document.name,
        trashed: documentInTrash(document, snapshot.folders),
      };
    }
    if (selected?.kind === 'folder') {
      const folder = foldersById.get(selected.id);
      if (folder) return {
        kind: 'folder' as const,
        id: folder.id,
        name: folder.name,
        trashed: folderInTrash(folder, snapshot.folders),
      };
    }
    return null;
  }, [selected, documentsById, foldersById, snapshot.folders]);

  const trashCount = trash.documents.length + trash.folders.length;
  const newItemDisabled = selected?.kind === 'trash' || (target?.trashed ?? false);

  function rootRow(folder: LibraryFolder, depth: number): ReactNode {
    const key = `folder:${folder.id}`;
    const open = expanded.has(key);
    const children = activeFolderList.filter(item => item.parentId === folder.id);
    const documents = snapshot.documents.filter(document => (
      document.folderId === folder.id && !documentInTrash(document, snapshot.folders)
    ));
    return <div key={folder.id} className="tree-branch" role="group">
      <TreeRow
        depth={depth}
        icon={<FolderIcon />}
        label={folder.name}
        nodeId={folder.id}
        nodeKind="folder"
        expanded={open}
        hasChildren={children.length > 0 || documents.length > 0}
        active={selected?.kind === 'folder' && selected.id === folder.id}
        dropActive={dropTarget === folder.id}
        onClick={() => { setSelected({ kind: 'folder', id: folder.id }); toggle(key); }}
        onToggle={() => toggle(key)}
        onDragOver={folderDragOver(folder.id)}
        onDragLeave={dragLeave}
        onDrop={folderDrop(folder.id)}
        renaming={renaming?.kind === 'folder' && renaming.id === folder.id ? {
          value: renaming.value,
          maxLength: MAX_FOLDER_NAME_LENGTH,
          onChange: value => setRenaming(current => current ? { ...current, value } : current),
          onCommit: commitRename,
          onCancel: () => setRenaming(null),
        } : null}
        labels={copy}
      />
      {open ? <>
        {children.map(child => rootRow(child, depth + 1))}
        {documents.map(document => documentRow(document, depth + 1))}
      </> : null}
    </div>;
  }

  function documentRow(document: LibraryDocument, depth: number, withinTrash = false): ReactNode {
    return <TreeRow
      key={document.id}
      depth={depth}
      icon={<FileIcon />}
      label={document.name}
      nodeId={document.id}
      nodeKind="document"
      active={selected?.kind === 'document' && selected.id === document.id}
      muted={withinTrash || documentInTrash(document, snapshot.folders)}
      draggable={!withinTrash}
      onDragStart={dragStart('document', document.id)}
      onClick={() => {
        setSelected({ kind: 'document', id: document.id });
        props.onSelectDocument(document.id);
      }}
      renaming={renaming?.kind === 'document' && renaming.id === document.id ? {
        value: renaming.value,
        maxLength: MAX_DOCUMENT_NAME_LENGTH,
        onChange: value => setRenaming({ ...renaming, value }),
        onCommit: commitRename,
        onCancel: () => setRenaming(null),
      } : null}
      labels={copy}
    />;
  }

  function trashFolderRow(folder: LibraryFolder, depth: number): ReactNode {
    const key = `trash:folder:${folder.id}`;
    const open = expanded.has(key);
    const children = snapshot.folders.filter(item => item.parentId === folder.id);
    const documents = snapshot.documents.filter(document => document.folderId === folder.id);
    return <div key={folder.id} className="tree-branch" role="group">
      <TreeRow
        depth={depth}
        icon={<FolderIcon />}
        label={folder.name}
        nodeId={folder.id}
        nodeKind="folder"
        expanded={open}
        hasChildren={children.length > 0 || documents.length > 0}
        active={selected?.kind === 'folder' && selected.id === folder.id}
        muted
        onClick={() => { setSelected({ kind: 'folder', id: folder.id }); toggle(key); }}
        onToggle={() => toggle(key)}
        labels={copy}
      />
      {open ? <>
        {children.map(child => trashFolderRow(child, depth + 1))}
        {documents.map(document => documentRow(document, depth + 1, true))}
      </> : null}
    </div>;
  }

  const exampleGroups = SECTION_ORDER
    .map(section => ({ section, items: examples.filter(example => example.section === section) }))
    .filter(group => group.items.length > 0);

  return <section className="document-tree" aria-label={copy.region}>
    <div className="tree-toolbar" role="toolbar" aria-label={copy.region}>
      <button type="button" className="icon-button" title={copy.newFile} aria-label={copy.newFile}
        disabled={newItemDisabled} onClick={createDocument}>
        <FilePlusIcon />
      </button>
      <button type="button" className="icon-button" title={copy.newFolder} aria-label={copy.newFolder}
        disabled={newItemDisabled} onClick={createFolder}>
        <FolderPlusIcon />
      </button>
      {target?.trashed ? <>
        <button type="button" className="icon-button" title={copy.restore} aria-label={copy.restore}
          onClick={() => props.onRestore(target.kind, target.id)}>
          <RestoreIcon />
        </button>
        <button type="button" className="icon-button is-danger" title={copy.deleteForever} aria-label={copy.deleteForever}
          onClick={() => setConfirm({ kind: 'delete', target: { kind: target.kind, id: target.id, name: target.name } })}>
          <TrashIcon />
        </button>
      </> : <button type="button" className="icon-button" title={copy.moveToTrash} aria-label={copy.moveToTrash}
        disabled={!target}
        onClick={() => target && props.onTrash(target.kind, target.id)}>
        <TrashIcon />
      </button>}
      <button type="button" className="icon-button" title={copy.rename} aria-label={copy.rename}
        disabled={!target || target.trashed} onClick={startRename}>
        <PencilIcon />
      </button>
    </div>

    <div className="tree-scroll" role="tree" aria-label={copy.region} ref={scrollRef}>
      <div className="tree-branch" role="group">
        <TreeRow
          depth={0}
          icon={<FilesIcon />}
          label={copy.examples}
          expanded={expanded.has('examples')}
          hasChildren={exampleGroups.length > 0}
          onClick={() => toggle('examples')}
          onToggle={() => toggle('examples')}
          labels={copy}
        />
        {expanded.has('examples') ? exampleGroups.map(group => {
          const key = `examples:${group.section}`;
          const open = expanded.has(key);
          return <div key={group.section} className="tree-branch" role="group">
            <TreeRow
              depth={1}
              icon={<FolderIcon />}
              label={copy.sections[group.section]}
              expanded={open}
              hasChildren
              onClick={() => toggle(key)}
              onToggle={() => toggle(key)}
              labels={copy}
            />
            {open ? group.items.map(example => <TreeRow
              key={example.id}
              depth={2}
              icon={<FileIcon />}
              label={example.title}
              nodeId={example.id}
              nodeKind="example"
              active={activeMode === 'example' && activeExampleId === example.id}
              onClick={() => {
                setSelected({ kind: 'example', id: example.id });
                props.onSelectExample(example.id);
              }}
              labels={copy}
            />) : null}
          </div>;
        }) : null}
      </div>

      <div className="tree-divider" role="separator" />

      <div
        className={`tree-branch${dropTarget === 'root' ? ' is-drop-root' : ''}`}
        role="group"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropTarget('root');
        }}
        onDragLeave={dragLeave}
        onDrop={(event) => {
          event.preventDefault();
          moveFromDrag(event, null);
          setDropTarget(null);
        }}
      >
        <TreeRow
          depth={0}
          icon={<FilesIcon />}
          label={copy.documents}
          nodeId="documents"
          nodeKind="root"
          active={selected?.kind === 'root'}
          onClick={() => setSelected({ kind: 'root' })}
          labels={copy}
        />
        {rootFolders.map(folder => rootRow(folder, 1))}
        {rootDocuments.map(document => documentRow(document, 1))}
        {rootFolders.length === 0 && rootDocuments.length === 0
          ? <p className="tree-empty">{copy.noDocuments}</p>
          : null}
      </div>

      <div className="tree-divider" role="separator" />

      <div className="tree-branch" role="group">
        <TreeRow
          depth={0}
          icon={<TrashIcon />}
          label={copy.trash}
          nodeId="trash"
          nodeKind="trash"
          expanded={expanded.has('trash')}
          hasChildren={trashCount > 0}
          active={selected?.kind === 'trash'}
          onClick={() => { setSelected({ kind: 'trash' }); toggle('trash'); }}
          onToggle={() => toggle('trash')}
          trailing={trashCount > 0 && expanded.has('trash') ? (
            <button
              type="button"
              className="icon-button is-small is-danger"
              title={copy.emptyTrash}
              aria-label={copy.emptyTrash}
              onClick={(event) => { event.stopPropagation(); setConfirm({ kind: 'empty-trash' }); }}
            >
              <TrashIcon size={14} />
            </button>
          ) : null}
          labels={copy}
        />
        {expanded.has('trash') ? <>
          {trash.folders.map(folder => trashFolderRow(folder, 1))}
          {trash.documents.map(document => documentRow(document, 1, true))}
          {trashCount === 0 ? <p className="tree-empty">{copy.trashEmpty}</p> : null}
        </> : null}
      </div>
    </div>

    {confirm ? <div className="tree-confirm" role="alert">
      <p>{confirm.kind === 'empty-trash' ? copy.emptyTrashConfirm : copy.deleteConfirm(confirm.target.name)}</p>
      <div className="tree-confirm-actions">
        <button type="button" className="button button-danger" onClick={() => {
          if (confirm.kind === 'empty-trash') props.onEmptyTrash();
          else props.onDelete(confirm.target.kind, confirm.target.id);
          setConfirm(null);
        }}>{copy.delete}</button>
        <button type="button" className="button button-quiet" onClick={() => setConfirm(null)}>{copy.cancel}</button>
      </div>
    </div> : null}

    <div className={`tree-status is-${snapshot.saveStatus}`} role="status" aria-live="polite">
      <span className="tree-status-dot" aria-hidden="true" />
      <span>{statusLabel(snapshot.saveStatus, copy)}</span>
      {snapshot.saveStatus === 'failed' ? <button type="button" className="button button-quiet"
        onClick={props.onRetry}>{copy.retry}</button> : null}
    </div>
    {snapshot.problem ? <p className="tree-problem" role="alert">
      {snapshot.problem === 'corrupt' ? copy.corrupt : copy.unavailable}
    </p> : null}
  </section>;
}

function statusLabel(status: LibrarySaveStatus, copy: DocumentTreeCopy): string {
  return status === 'saving' ? copy.saving : status === 'failed' ? copy.failed : copy.saved;
}
