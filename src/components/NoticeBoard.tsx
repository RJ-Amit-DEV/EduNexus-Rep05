import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Paperclip, 
  Send, 
  History,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: any;
  attachments: { type: 'pdf' | 'image'; name: string }[];
  authorId: string;
  author?: string;
  targetAudience?: 'all' | 'students' | 'parents' | 'specific';
  targetRollNo?: string;
  recipientUids?: string[];
}

export interface NoticeBoardProps {
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  isReadOnly?: boolean;
  searchQuery?: string;
  authorName?: string;
  classCode: string;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ notices, isReadOnly = false, searchQuery = '', authorName, classCode }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'parents' | 'specific'>('all');
  const [targetRollNo, setTargetRollNo] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !auth.currentUser || !classCode) return;
    setIsPosting(true);
    try {
      let recipientUids: string[] = [];
      const recipientRollNo = targetRollNo.trim().toUpperCase();
      if (targetAudience === 'specific') {
        if (!recipientRollNo) throw new Error('Enter the student roll number for the specific notice.');
        const found = await getDocs(query(collection(db, 'students'),
          where('teacherUid', '==', auth.currentUser.uid),
          where('classCode', '==', classCode),
          where('rollNo', '==', recipientRollNo)));
        if (found.size !== 1) throw new Error('No student with that roll number exists in your class.');
        const student = found.docs[0].data();
        recipientUids = [student.studentUid, student.parentUid].filter((uid): uid is string => typeof uid === 'string' && uid.length > 0);
        if (!recipientUids.length) throw new Error('That student and parent have not linked their accounts yet.');
      }
      await addDoc(collection(db, 'notices'), {
        title: title.trim(), content: content.trim(), date: serverTimestamp(), attachments: [],
        authorId: auth.currentUser.uid, teacherUid: auth.currentUser.uid,
        author: authorName || auth.currentUser.displayName || 'Faculty Member',
        classCode, targetAudience, targetRollNo: targetAudience === 'specific' ? recipientRollNo : null,
        recipientUids
      });
      setTitle(''); setContent(''); setTargetRollNo('');
    } catch (error: any) {
      console.error('Error posting notice:', error);
      window.alert(error?.message || 'Unable to post notice.');
    } finally {
      setIsPosting(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Just now';
    if (typeof date === 'string') return date;
    if (date.toDate) return date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const deleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
        {/* Create Notice Form */}
        {!isReadOnly && (
          <div className="min-w-0 xl:col-span-7">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Plus size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Post New Notice</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Broadcast important updates to all students of INFTT-1.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Notice Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Internal Assessment Postponement"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Audience</label>
                    <select 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="all">Everyone</option>
                      <option value="students">Students Only</option>
                      <option value="parents">All Parents</option>
                      <option value="specific">Specific recipient (Firebase UID)</option>
                    </select>
                  </div>

                  {targetAudience === 'specific' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Student roll number</label>
                      <input 
                        type="text" 
                        value={targetRollNo}
                        onChange={(e) => setTargetRollNo(e.target.value)}
                        placeholder="e.g., INFTT-1-042"
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-none text-lg font-semibold text-slate-700 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Notice Content</label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type the detailed message here..."
                    rows={6}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <Paperclip size={18} />
                    Attach PDF
                  </button>
                  <button type="button" className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-none hover:bg-slate-200 transition-all text-sm">
                    <ImageIcon size={18} />
                    Add Image
                  </button>
                </div>

                <button 
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  POST NOTICE NOW <Send size={22} />
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Notice History */}
        <div className={cn("min-w-0", isReadOnly ? "xl:col-span-12" : "xl:col-span-5")}>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-3 text-lg font-extrabold sm:text-xl">
                <History className="text-indigo-600 dark:text-indigo-400" size={28} />
                {isReadOnly ? "Notice Board" : "Notice History"}
              </h3>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {notices.length} {isReadOnly ? "Active Notices" : "Posted"}
              </span>
            </div>

            <div className={cn(
              "space-y-4 overflow-y-auto pr-1 custom-scrollbar",
              isReadOnly ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0" : "max-h-[600px]"
            )}>
              <AnimatePresence mode="popLayout">
                {filteredNotices.length > 0 ? (
                  filteredNotices.map((notice, idx) => (
                    <motion.div 
                      key={notice.id ? `${notice.id}-${idx}` : `notice-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-indigo-800 dark:hover:bg-slate-800"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent -rotate-45 translate-x-12 -translate-y-12" />
                      
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            notice.targetAudience === 'specific' ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          )}>
                            <Bell size={20} />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="break-words text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300 sm:text-base">{notice.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {formatDate(notice.date)}
                              </p>
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                {notice.targetAudience === 'specific' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Specific recipient
                                  </>
                                ) : (
                                  notice.targetAudience === 'students' ? 'Students Only' : 
                                  notice.targetAudience === 'parents' ? 'Parents Only' : 'Everyone'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => deleteNotice(notice.id)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      
                      <p className="relative z-10 mb-5 line-clamp-3 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                        {notice.content}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {notice.attachments && notice.attachments.length > 0 ? (
                            notice.attachments.map((att, i) => (
                              <div key={`att-${notice.id || 'n'}-${i}-${att.name}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {att.type === 'pdf' ? <FileText size={12} className="text-rose-400" /> : <ImageIcon size={12} className="text-blue-400" />}
                                {att.name}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">No Attachments</span>
                          )}
                        </div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                          By: {notice.author || 'Faculty'}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <History size={40} className="text-white/20" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No notifications found in history.</p>
                    {searchQuery && <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Try clearing your search query "{searchQuery}"</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
