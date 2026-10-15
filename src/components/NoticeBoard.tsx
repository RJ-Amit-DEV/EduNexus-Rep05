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
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

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
}

export interface NoticeBoardProps {
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  isReadOnly?: boolean;
  searchQuery?: string;
  authorName?: string;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ notices, isReadOnly = false, searchQuery = '', authorName }) => {
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
    if (!title || !content) return;

    setIsPosting(true);
    try {
      const newNotice = {
        title,
        content,
        date: serverTimestamp(),
        attachments: [], // In a real app, we'd handle file uploads
        authorId: auth.currentUser?.uid || 'dev-teacher-id',
        author: authorName || auth.currentUser?.displayName || 'Faculty Member',
        targetAudience,
        targetRollNo: targetAudience === 'specific' ? targetRollNo : null
      };

      await addDoc(collection(db, 'notices'), newNotice);
      setTitle('');
      setContent('');
      setTargetRollNo('');
    } catch (error) {
      console.error("Error posting notice:", error);
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
    <div className="p-10 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Create Notice Form */}
        {!isReadOnly && (
          <div className="xl:col-span-7">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-none border border-slate-200 p-10 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-none flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Plus size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Post New Notice</h2>
                  <p className="text-slate-500 font-medium">Broadcast important updates to all students of INFTT-1.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Notice Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Internal Assessment Postponement"
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-none text-lg font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Audience</label>
                    <select 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-none text-lg font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">Everyone</option>
                      <option value="students">Students Only</option>
                      <option value="parents">All Parents</option>
                      <option value="specific">Specific Parent (Roll No)</option>
                    </select>
                  </div>

                  {targetAudience === 'specific' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Enter Roll Number</label>
                      <input 
                        type="text" 
                        value={targetRollNo}
                        onChange={(e) => setTargetRollNo(e.target.value)}
                        placeholder="e.g., 42"
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
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-none text-lg font-medium text-slate-600 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-none hover:bg-slate-200 transition-all text-sm">
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
                  className="w-full py-6 bg-indigo-600 text-white font-display font-black rounded-none shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  POST NOTICE NOW <Send size={22} />
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Notice History */}
        <div className={cn(isReadOnly ? "xl:col-span-12" : "xl:col-span-5")}>
          <div className="bg-slate-900 rounded-none p-10 text-white shadow-2xl shadow-slate-900/20 h-full">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-display font-black flex items-center gap-4">
                <History className="text-indigo-400" size={28} />
                {isReadOnly ? "Notice Board" : "Notice History"}
              </h3>
              <span className="px-4 py-1.5 bg-white/10 rounded-none text-[10px] font-black uppercase tracking-widest border border-white/10">
                {notices.length} {isReadOnly ? "Active Notices" : "Posted"}
              </span>
            </div>

            <div className={cn(
              "space-y-6 overflow-y-auto pr-4 custom-scrollbar",
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
                      className="p-8 bg-white/5 rounded-none border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent -rotate-45 translate-x-12 -translate-y-12" />
                      
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-none flex items-center justify-center shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px,-2px,10px_rgba(255,255,255,0.05)]",
                            notice.targetAudience === 'specific' ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
                          )}>
                            <Bell size={20} />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-bold text-lg leading-tight group-hover:text-indigo-300 transition-colors">{notice.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {formatDate(notice.date)}
                              </p>
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                {notice.targetAudience === 'specific' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Specific: Roll {notice.targetRollNo}
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
                            className="p-2 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-400/10 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6 line-clamp-3 relative z-10">
                        {notice.content}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-wrap gap-2">
                          {notice.attachments && notice.attachments.length > 0 ? (
                            notice.attachments.map((att, i) => (
                              <div key={`att-${notice.id || 'n'}-${i}-${att.name}`} className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-slate-400 border border-white/5">
                                {att.type === 'pdf' ? <FileText size={12} className="text-rose-400" /> : <ImageIcon size={12} className="text-blue-400" />}
                                {att.name}
                              </div>
                            ))
                          ) : (
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">No Attachments</span>
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
                    className="p-20 text-center border-2 border-dashed border-white/10 rounded-[48px]"
                  >
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <History size={40} className="text-white/20" />
                    </div>
                    <p className="text-slate-400 font-bold">No notifications found in history.</p>
                    {searchQuery && <p className="text-slate-600 text-xs mt-2 font-medium">Try clearing your search query "{searchQuery}"</p>}
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
