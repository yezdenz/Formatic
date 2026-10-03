'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FolderActions({ id, initialName, parentId, destinations }: { id: string; initialName: string; parentId: string | null; destinations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [target, setTarget] = useState(parentId || '');
  const [error, setError] = useState('');
  async function update() {
    setError('');
    const response = await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: target || null }) });
    if (!response.ok) { setError((await response.json()).error || 'Could not update folder.'); return; }
    router.refresh();
  }
  async function remove() {
    if (!window.confirm('Delete this folder and all its subfolders and questions?')) return;
    const response = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (!response.ok) { setError((await response.json()).error || 'Could not delete folder.'); return; }
    router.push('/'); router.refresh();
  }
  return <details className="panel"><summary style={{ cursor: 'pointer', fontWeight: 800 }}>Manage folder</summary><div className="grid"><label>Name<input className="field" value={name} onChange={event => setName(event.target.value)} /></label><label>Parent folder<select className="field" value={target} onChange={event => setTarget(event.target.value)}><option value="">Top level</option>{destinations.filter(folder => folder.id !== id).map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div><div className="tabs"><button className="button" onClick={() => void update()}>Save changes</button><button className="button button-secondary" onClick={() => void remove()}>Delete folder</button></div>{error && <p className="error" role="alert">{error}</p>}</details>;
}
