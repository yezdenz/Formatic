'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateFolder({ parentId }: { parentId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    const response = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId }) });
    if (!response.ok) { setError((await response.json()).error || 'Could not create folder.'); return; }
    setName(''); router.refresh();
  }
  return <form className="panel" onSubmit={create}><label>{parentId ? 'New subfolder' : 'New folder'}<input className="field" value={name} onChange={event => setName(event.target.value)} maxLength={100} required /></label><button className="button">Create folder</button>{error && <p className="error">{error}</p>}</form>;
}
