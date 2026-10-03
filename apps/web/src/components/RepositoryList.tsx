'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, FolderClosed, Pencil, Search, X } from 'lucide-react';

export type RepositoryFolder = { id: string; name: string; description?: string | null; canRename?: boolean };

export function RepositoryList({ folders, title = 'Folders', itemLabel = 'Folder', onOpen, onRename, action }: {
  folders: RepositoryFolder[];
  title?: string;
  itemLabel?: string;
  onOpen?: (id: string) => void;
  onRename?: (id: string, name: string) => void | Promise<void>;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shown = folders.filter(folder => folder.name.toLowerCase().includes(query.trim().toLowerCase()));

  function beginRename(folder: RepositoryFolder) { setEditingId(folder.id); setEditName(folder.name); setError(''); }
  async function saveRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editName.trim();
    if (!editingId || !name || name.length > 100) return;
    setBusy(true); setError('');
    try {
      if (onRename) await onRename(editingId, name);
      else {
        const response = await fetch(`/api/folders/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        if (!response.ok) throw new Error((await response.json()).error || 'Could not rename this item.');
        router.refresh();
      }
      setEditingId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not rename this item.'); }
    finally { setBusy(false); }
  }

  return <section className={`repository ${folders.length ? '' : 'repository-compact'}`} aria-label={title}>
    <div className="repository-toolbar"><div className="repository-title"><h2>{title}</h2><span className="repository-count">{folders.length}</span></div><div className="repository-actions">{folders.length > 0 && <label className="repository-search"><Search size={15} /><input aria-label={`Search ${title.toLowerCase()}`} placeholder={`Find a ${itemLabel.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /></label>}{action}</div></div>
    {folders.length > 0 && <div className="repository-column-head"><span>Name</span><span>Type</span><span /></div>}
    {shown.map(folder => editingId === folder.id ? <form className="repository-edit-row" key={folder.id} onSubmit={saveRename}><label className="sr-only" htmlFor={`rename-${folder.id}`}>Rename {folder.name}</label><input id={`rename-${folder.id}`} className="field" value={editName} onChange={event => setEditName(event.target.value)} maxLength={100} required autoFocus /><button className="button" disabled={busy} type="submit"><Check size={14} /> Save</button><button className="button button-secondary" type="button" onClick={() => setEditingId(null)}><X size={14} /> Cancel</button>{error && <p className="error" role="alert">{error}</p>}</form> : <div className="repository-entry" key={folder.id}>
      {onOpen ? <button className="repository-row" type="button" onClick={() => onOpen(folder.id)}><span className="repository-name"><span className="repository-icon"><FolderClosed size={19} /></span><span><strong>{folder.name}</strong><small>{folder.description || `Open ${itemLabel.toLowerCase()}`}</small></span></span><span className="repository-meta">{itemLabel}</span><ChevronRight className="repository-chevron" size={16} /></button> : <Link className="repository-row" href={`/folder/${folder.id}`}><span className="repository-name"><span className="repository-icon"><FolderClosed size={19} /></span><span><strong>{folder.name}</strong><small>{folder.description || `Open ${itemLabel.toLowerCase()}`}</small></span></span><span className="repository-meta">{itemLabel}</span><ChevronRight className="repository-chevron" size={16} /></Link>}
      {folder.canRename && <button className="repository-rename" type="button" aria-label={`Rename ${folder.name}`} title={`Rename ${folder.name}`} onClick={() => beginRename(folder)}><Pencil size={14} /></button>}
    </div>)}
    {folders.length > 0 && !shown.length && <div className="repository-empty">No {title.toLowerCase()} match your search.</div>}
    {folders.length > 0 && <div className="repository-footer">{folders.length} {folders.length === 1 ? itemLabel.toLowerCase() : `${itemLabel.toLowerCase()}s`} in this repository</div>}
  </section>;
}
