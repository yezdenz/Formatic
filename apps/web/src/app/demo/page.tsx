'use client';
import { FormEvent, useRef, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { DashboardFrame } from '@/components/DashboardFrame';
import { RepositoryList, type RepositoryFolder } from '@/components/RepositoryList';
import { StudyStackTable } from '@/components/study/StudyStackTable';
import { PracticeEngine } from '@/components/study/PracticeEngine';
import { FlashcardDeck } from '@/components/study/FlashcardDeck';

type PreviewFolder = RepositoryFolder & { parentId: string | null; teamCode: string };

export default function DemoPage() {
  const [name, setName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [editingCode, setEditingCode] = useState(true);
  const [folders, setFolders] = useState<PreviewFolder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [mode, setMode] = useState<'stack' | 'practice' | 'cards'>('stack');
  const folderDetails = useRef<HTMLDetailsElement>(null);

  function enterPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredName = String(new FormData(event.currentTarget).get('username') || '').trim();
    if (enteredName) setName(enteredName);
  }
  function saveCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(code)) return;
    setTeamCode(code);
    setFolderId(null);
    setEditingCode(false);
  }
  function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const folderName = String(new FormData(form).get('folderName') || '').trim();
    if (!folderName) return;
    setFolders(current => [...current, { id: crypto.randomUUID(), name: folderName, parentId: folderId, teamCode }]);
    form.reset();
    if (folderDetails.current) folderDetails.current.open = false;
  }
  function renameFolder(id: string, newName: string) {
    setFolders(current => current.map(item => item.id === id ? { ...item, name: newName } : item));
  }
  function startOver() {
    setName(''); setTeamCode(''); setCodeInput(''); setEditingCode(true);
    setFolders([]); setFolderId(null); setMode('stack');
  }

  const currentFolder = folders.find(item => item.id === folderId && item.teamCode === teamCode);
  const visibleFolders = folders.filter(item => item.teamCode === teamCode && item.parentId === (currentFolder?.id ?? null));
  const trail: PreviewFolder[] = [];
  let ancestor = currentFolder;
  while (ancestor) {
    trail.unshift(ancestor);
    ancestor = folders.find(item => item.id === ancestor?.parentId && item.teamCode === teamCode);
  }
  const newItemLabel = !currentFolder ? 'course' : currentFolder.parentId ? 'subfolder' : 'folder';
  const newFolderAction = teamCode ? <details className="new-folder" ref={folderDetails}><summary className="button"><Plus size={14} /> New {newItemLabel}</summary><form className="panel" onSubmit={createFolder}><label>{newItemLabel === 'course' ? 'Course' : 'Folder'} name<input className="field" aria-label={`${newItemLabel === 'course' ? 'Course' : 'Folder'} name`} name="folderName" maxLength={100} required placeholder={newItemLabel === 'course' ? 'e.g. Biology 101' : 'e.g. Unit 1'} /></label><button className="button" type="submit">Create {newItemLabel === 'course' ? 'course' : 'folder'}</button></form></details> : undefined;

  if (!name) return <main className="preview-login-shell"><section className="preview-login-card">
    <div className="preview-login-brand"><span className="brand-mark"><BookOpen size={22} /></span><span>FORMATIC</span></div>
    <p className="eyebrow">CLASS REPOSITORY</p><h1>Welcome in.</h1><p className="preview-login-copy">Sign in to your class workspace.</p>
    <form onSubmit={enterPreview}><label>Username<input className="field" name="username" autoComplete="off" minLength={2} maxLength={50} required placeholder="Enter a username" /></label>
      <label>Passcode<input className="field" name="passcode" type="password" autoComplete="off" minLength={8} required placeholder="At least 8 characters" /></label>
      <button className="button preview-login-submit" type="submit">Continue to repository</button></form>
    <p className="preview-login-note">Interactive preview. Nothing entered here is sent or saved.</p>
  </section></main>;

  if (currentFolder) return <DashboardFrame name={name} preview onRepository={() => setFolderId(null)}><nav className="folder-path" aria-label="Folder path"><button type="button" onClick={() => setFolderId(null)}>Courses</button>{trail.map(item => <span key={item.id}>/ <button type="button" onClick={() => setFolderId(item.id)}>{item.name}</button></span>)}</nav><button className="button button-secondary" onClick={() => setFolderId(currentFolder.parentId)}>← Back to {currentFolder.parentId ? 'parent folder' : 'courses'}</button><div className="page-heading" style={{ marginTop: 28 }}><div><p className="eyebrow">{currentFolder.parentId ? 'CLASS FOLDER' : 'COURSE'}</p><h1>{currentFolder.name}</h1><p>Organize this {currentFolder.parentId ? 'folder' : 'course'} with folders and study materials.</p></div></div>
    <RepositoryList folders={visibleFolders.map(item => ({ ...item, canRename: true }))} onOpen={setFolderId} onRename={renameFolder} action={newFolderAction} />
    <nav className="tabs" aria-label="Study modes"><button className={`button ${mode === 'stack' ? '' : 'button-secondary'}`} onClick={() => setMode('stack')}>StudyStack</button><button className={`button ${mode === 'practice' ? '' : 'button-secondary'}`} onClick={() => setMode('practice')}>Practice test</button><button className={`button ${mode === 'cards' ? '' : 'button-secondary'}`} onClick={() => setMode('cards')}>Flashcards</button></nav>
    {mode === 'stack' && <StudyStackTable questions={[]} />}{mode === 'practice' && <PracticeEngine questions={[]} />}{mode === 'cards' && <FlashcardDeck questions={[]} />}
  </DashboardFrame>;

  return <DashboardFrame name={name} preview onRepository={() => setFolderId(null)}>
    <div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Hello, {name}.</h1><p>Your class courses start here.</p></div><button className="button button-secondary" onClick={startOver}>Start over</button></div>
    <section className="team-panel"><div className="team-panel-copy"><h2>Team workspace</h2><p>Set your section code to create or join a shared repository.</p></div><div className="team-control">
      {teamCode && !editingCode ? <button className="team-code" type="button" onClick={() => setEditingCode(true)}>TEAM CODE <strong>{teamCode}</strong></button> : <form className="preview-code-form" onSubmit={saveCode}><label className="sr-only" htmlFor="preview-code">Team code</label><input id="preview-code" className="field" value={codeInput} onChange={event => setCodeInput(event.target.value.toUpperCase())} placeholder="e.g. TS31" maxLength={12} pattern="[A-Z0-9]{2,12}" required /><button className="button" type="submit">Set code</button></form>}
    </div></section>
    <RepositoryList title="Courses" itemLabel="Course" folders={visibleFolders.map(item => ({ ...item, canRename: true }))} onOpen={setFolderId} onRename={renameFolder} action={newFolderAction} />
  </DashboardFrame>;
}
