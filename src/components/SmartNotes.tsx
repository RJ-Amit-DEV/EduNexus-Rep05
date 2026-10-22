import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FileDown, FilePlus2, FileText, Loader2, Pencil, Search, Trash2, X, Save, AlertCircle, Cloud, HardDrive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { db, auth } from '../firebase';

type StudyNote = {
  id: string;
  title: string;
  content: string;
  subject: string;
  updatedAt?: { toDate?: () => Date } | string | Date | null;
  createdAt?: { toDate?: () => Date } | string | Date | null;
};

const LOCAL_NOTES_KEY = 'edunexus_smart_notes_v1';

const readLocalNotes = (): StudyNote[] => {
  try {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const dateValue = (value: StudyNote['updatedAt']): number => {
  if (!value) return 0;
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  const parsed = new Date(value as string | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPlainText = (markdown: string): string =>
  markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');

export const SmartNotes: React.FC = () => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialSelectionDone = useRef(false);
  const user = auth.currentUser;

  useEffect(() => {
    initialSelectionDone.current = false;
    setIsLoading(true);
    setError(null);

    if (!user) {
      const localNotes = readLocalNotes().sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
      setNotes(localNotes);
      setIsLoading(false);
      return;
    }

    const notesPath = `users/${user.uid}/notes`;
    const notesQuery = query(collection(db, notesPath), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(notesQuery, snapshot => {
      const fetched = snapshot.docs.map(noteDoc => ({
        ...noteDoc.data(),
        id: noteDoc.id
      } as StudyNote));
      setNotes(fetched);
      setIsLoading(false);
      setError(null);
      if (!initialSelectionDone.current) {
        initialSelectionDone.current = true;
        if (fetched.length) {
          const first = fetched[0];
          setActiveId(first.id);
          setTitle(first.title || '');
          setSubject(first.subject || '');
          setContent(first.content || '');
        }
      }
    }, err => {
      console.error('Smart Notes sync failed:', err);
      setIsLoading(false);
      setError('Could not sync your notes with Firestore. Check your connection and permissions; local demo notes remain available.');
      const localNotes = readLocalNotes().sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
      setNotes(localNotes);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredNotes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter(note =>
      (note.title || '').toLowerCase().includes(needle) ||
      (note.subject || '').toLowerCase().includes(needle) ||
      (note.content || '').toLowerCase().includes(needle)
    );
  }, [notes, search]);

  const resetEditor = useCallback(() => {
    setActiveId(null);
    setTitle('');
    setSubject('');
    setContent('');
    setIsCreating(true);
    setNotice(null);
    setError(null);
  }, []);

  const openNote = (note: StudyNote) => {
    setActiveId(note.id);
    setTitle(note.title || '');
    setSubject(note.subject || '');
    setContent(note.content || '');
    setIsCreating(false);
    setNotice(null);
  };

  const saveNote = async () => {
    if (!title.trim()) {
      setError('Add a title before saving this note.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);

    const now = new Date().toISOString();
    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      content: content.trim(),
      updatedAt: user ? serverTimestamp() : now,
      ...(isCreating || !activeId ? { createdAt: user ? serverTimestamp() : now } : {})
    };

    try {
      if (user) {
        const notesPath = `users/${user.uid}/notes`;
        if (isCreating || !activeId || activeId.startsWith('local-')) {
          const created = await addDoc(collection(db, notesPath), payload);
          setActiveId(created.id);
          setIsCreating(false);
        } else {
          await updateDoc(doc(db, notesPath, activeId), payload);
        }
        setNotice('Note saved to your account.');
      } else {
        const localId = activeId || `local-${Date.now()}`;
        const localPayload: StudyNote = { id: localId, title: title.trim(), subject: subject.trim(), content: content.trim(), updatedAt: now, createdAt: now };
        const next = [localPayload, ...readLocalNotes().filter(note => note.id !== localId)];
        localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(next));
        setNotes(next);
        setActiveId(localId);
        setIsCreating(false);
        setNotice('Saved in this browser only. Sign in to sync notes across devices.');
      }
    } catch (err) {
      console.error('Unable to save note:', err);
      setError('Could not save the note. Please retry after checking your connection and account permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (note: StudyNote) => {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    setError(null);
    setNotice(null);
    try {
      if (user && !note.id.startsWith('local-')) {
        await deleteDoc(doc(db, `users/${user.uid}/notes`, note.id));
      } else {
        const next = readLocalNotes().filter(item => item.id !== note.id);
        localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(next));
        setNotes(next);
      }
      if (activeId === note.id) {
        setActiveId(null);
        setTitle('');
        setSubject('');
        setContent('');
        setIsCreating(false);
      }
      setNotice('Note deleted.');
    } catch (err) {
      console.error('Unable to delete note:', err);
      setError('Could not delete the note. Please retry.');
    }
  };

  const exportPdf = () => {
    if (!title.trim()) {
      setError('Choose or write a note before exporting.');
      return;
    }
    try {
      const pdf = new jsPDF();
      const margin = 16;
      const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      let y = 20;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      const titleLines = pdf.splitTextToSize(title.trim(), maxWidth);
      pdf.text(titleLines, margin, y);
      y += titleLines.length * 8 + 4;
      if (subject.trim()) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(11);
        pdf.text(pdf.splitTextToSize(subject.trim(), maxWidth), margin, y);
        y += 9;
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(toPlainText(content.trim()), maxWidth);
      const lineHeight = 5.5;
      for (const line of lines) {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }
      const safeName = title.trim().replace(/[^a-z0-9\-_ ]/gi, '').replace(/\s+/g, '-').slice(0, 70) || 'study-note';
      pdf.save(`${safeName}.pdf`);
      setError(null);
      setNotice('PDF export started.');
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Could not export this note to PDF.');
    }
  };

  const timestamp = (note: StudyNote) => {
    const ms = dateValue(note.updatedAt || note.createdAt);
    return ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently updated';
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            <FileText size={14} /> Study workspace
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Smart Notes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Create, organize, edit, preview, and export your study notes in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {user ? <Cloud size={14} /> : <HardDrive size={14} />}
            {user ? 'Synced to account' : 'Browser-only mode'}
          </span>
          <button onClick={resetEditor} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500">
            <FilePlus2 size={16} /> New note
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
          {error ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Save size={17} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{error || notice}</span>
          <button aria-label="Dismiss message" onClick={() => { setError(null); setNotice(null); }}><X size={16} /></button>
        </div>
      )}

      <div className="grid min-h-[620px] grid-cols-1 gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <p className="mt-3 text-xs font-semibold text-slate-400">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</p>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="animate-spin" size={16} /> Loading notes…</div>
            ) : filteredNotes.length ? filteredNotes.map(note => (
              <div key={note.id} className={`group rounded-xl border p-3 transition ${activeId === note.id ? 'border-indigo-300 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800/60'}`}>
                <button onClick={() => openNote(note)} className="w-full min-w-0 text-left">
                  <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{note.title || 'Untitled note'}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{note.subject || 'General'} · {timestamp(note)}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{(note.content || 'No content yet').slice(0, 90)}</span>
                </button>
                <div className="mt-2 flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                  <button aria-label={`Edit ${note.title}`} onClick={() => openNote(note)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-indigo-600 dark:hover:bg-slate-900"><Pencil size={14} /></button>
                  <button aria-label={`Delete ${note.title}`} onClick={() => deleteNote(note)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 size={14} /></button>
                </div>
              </div>
            )) : (
              <div className="px-4 py-10 text-center">
                <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">{search ? 'No matching notes' : 'No notes yet'}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{search ? 'Try a different search term.' : 'Create a note to start your personal study library.'}</p>
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><FileText size={17} className="text-indigo-600" /> {isCreating ? 'New note' : 'Note editor'}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowPreview(v => !v)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{showPreview ? 'Hide preview' : 'Show preview'}</button>
              <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><FileDown size={14} /> Export PDF</button>
              <button onClick={saveNote} disabled={isSaving || isLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? 'Saving…' : 'Save note'}</button>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Title
                <input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="e.g. Operating Systems — Process Scheduling" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Subject / Unit
                <input value={subject} maxLength={100} onChange={e => setSubject(e.target.value)} placeholder="e.g. OS · Unit 3" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Note content <span className="font-normal normal-case tracking-normal">(Markdown supported)</span>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={'# Key concepts\n\n- Important point\n- Example\n\n**Remember:** ...'} rows={showPreview ? 14 : 22} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            {showPreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><FileText size={14} /> Markdown preview</div>
                <div className="prose prose-sm max-w-none break-words text-slate-700 dark:prose-invert dark:text-slate-300">
                  {content.trim() ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-sm text-slate-400">Your formatted notes will appear here.</p>}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
