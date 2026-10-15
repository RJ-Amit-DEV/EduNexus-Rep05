import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Play, 
  Clock, 
  ChevronRight, 
  Zap, 
  Trophy, 
  Target, 
  ArrowUpRight,
  BookOpen,
  Lightbulb,
  FileText,
  Video,
  Bell,
  Paperclip,
  Plus,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DEADLINES } from '../constants';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ProfileData } from '../types';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
  notices: any[];
  searchQuery?: string;
  academicRecord?: any;
  profileData?: ProfileData;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  onNavigate, 
  notices, 
  searchQuery = '', 
  academicRecord,
  profileData 
}) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const userDisplayName = profileData?.name?.trim() || auth.currentUser?.displayName?.trim() || 'Student';
  const userFirstName = React.useMemo(() => {
    if (!userDisplayName) return 'Student';
    if (userDisplayName.startsWith('Prof.') || userDisplayName.startsWith('Dr.')) {
      return userDisplayName;
    }
    return userDisplayName.split(' ')[0] || 'Student';
  }, [userDisplayName]);

  const [deadlines, setDeadlines] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('eduplan_student_deadlines');
      return cached ? JSON.parse(cached) : DEADLINES;
    } catch {
      return DEADLINES;
    }
  });

  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newDeadline, setNewDeadline] = useState({
    title: '',
    date: getTodayString(),
    time: '17:00',
    color: 'bg-rose-500',
    priority: 'high',
    type: 'assignment'
  });

  const formatDeadlineDisplay = (dateStr: string, timeStr: string) => {
    if (!dateStr) return timeStr || 'Upcoming';
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let formattedTime = timeStr || '11:59 PM';
      if (timeStr && timeStr.includes(':') && !timeStr.toLowerCase().includes('m')) {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 || 12;
        formattedTime = `${formattedH}:${minutes} ${ampm}`;
      }

      if (dateStr === todayStr) {
        return `Today, ${formattedTime}`;
      } else if (dateStr === tomorrowStr) {
        return `Tomorrow, ${formattedTime}`;
      } else {
        const d = new Date(dateStr + 'T00:00:00');
        const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return `${formattedDate}, ${formattedTime}`;
      }
    } catch {
      return `${dateStr} ${timeStr}`.trim();
    }
  };

  useEffect(() => {
    let unsubscribeDeadlines: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const deadlinesPath = `users/${currentUser.uid}/deadlines`;
        const colRef = collection(db, deadlinesPath);

        unsubscribeDeadlines = onSnapshot(colRef, (snapshot) => {
          if (!snapshot.empty) {
            const seenIds = new Set<string>();
            const fetched: any[] = [];
            snapshot.docs.forEach((d, idx) => {
              const data = d.data();
              const baseId = d.id || (data && (data as any).id) || `deadline-${idx}`;
              const uniqueId = seenIds.has(baseId) ? `${baseId}-${idx}` : baseId;
              seenIds.add(uniqueId);
              fetched.push({
                ...data,
                id: uniqueId
              });
            });
            fetched.sort((a: any, b: any) => {
              if (a.createdAt && b.createdAt) {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
                return timeB - timeA;
              }
              return (a.date || '').localeCompare(b.date || '');
            });
            setDeadlines(fetched);
            try {
              localStorage.setItem('eduplan_student_deadlines', JSON.stringify(fetched));
            } catch {
              // ignore
            }
          } else {
            // Seed initial defaults into Firestore so the student has actionable deadlines
            const seedInitialDeadlines = async () => {
              for (const def of DEADLINES) {
                try {
                  await addDoc(colRef, {
                    title: def.title,
                    time: def.time,
                    date: getTodayString(),
                    color: def.color.includes('rose') ? 'bg-rose-500' : def.color.includes('amber') ? 'bg-amber-500' : def.color.includes('indigo') ? 'bg-indigo-500' : 'bg-emerald-500',
                    priority: def.priority || 'high',
                    type: def.type || 'assignment',
                    completed: def.completed || false,
                    createdAt: serverTimestamp()
                  });
                } catch (err) {
                  console.warn("Could not seed default deadline:", err);
                }
              }
            };
            seedInitialDeadlines();
          }
        }, (error) => {
          console.warn("Firestore error reading deadlines, using local cache:", error);
        });
      } else {
        try {
          const cached = localStorage.getItem('eduplan_student_deadlines');
          if (cached) setDeadlines(JSON.parse(cached));
        } catch {
          // ignore
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDeadlines) unsubscribeDeadlines();
    };
  }, []);

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newDeadline.title.trim()) {
      setFormError("Please enter a title for the deadline.");
      return;
    }

    const selectedDate = newDeadline.date || getTodayString();
    const formattedDisplayTime = formatDeadlineDisplay(selectedDate, newDeadline.time);

    const deadlinePayload = {
      title: newDeadline.title.trim(),
      date: selectedDate,
      time: formattedDisplayTime,
      color: newDeadline.color || 'bg-rose-500',
      priority: newDeadline.priority || 'high',
      type: newDeadline.type || 'assignment',
      completed: false,
      createdAt: serverTimestamp()
    };

    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const path = `users/${currentUser.uid}/deadlines`;
        const docRef = await addDoc(collection(db, path), deadlinePayload);
        
        const newEntry = { 
          id: docRef.id, 
          ...deadlinePayload, 
          createdAt: new Date().toISOString() 
        };
        setDeadlines(prev => {
          const updated = [newEntry, ...prev.filter(d => d.id !== docRef.id)];
          try {
            localStorage.setItem('eduplan_student_deadlines', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        const localEntry = {
          id: 'local_' + Date.now(),
          ...deadlinePayload,
          createdAt: new Date().toISOString()
        };
        setDeadlines(prev => {
          const updated = [localEntry, ...prev];
          try {
            localStorage.setItem('eduplan_student_deadlines', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      setShowAddDeadline(false);
      setNewDeadline({
        title: '',
        date: getTodayString(),
        time: '17:00',
        color: 'bg-rose-500',
        priority: 'high',
        type: 'assignment'
      });
    } catch (error: any) {
      console.warn("Error adding to Firestore, saving locally:", error);
      const fallbackEntry = {
        id: 'local_' + Date.now(),
        ...deadlinePayload,
        createdAt: new Date().toISOString()
      };
      setDeadlines(prev => {
        const updated = [fallbackEntry, ...prev];
        try {
          localStorage.setItem('eduplan_student_deadlines', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setShowAddDeadline(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeadline = async (id: string, currentStatus: boolean) => {
    setDeadlines(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, completed: !currentStatus } : d);
      try {
        localStorage.setItem('eduplan_student_deadlines', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const currentUser = auth.currentUser;
    if (currentUser && !id.startsWith('local_') && id !== '1' && id !== '2' && id !== '3' && id !== '4') {
      const path = `users/${currentUser.uid}/deadlines/${id}`;
      try {
        await updateDoc(doc(db, path), {
          completed: !currentStatus
        });
      } catch (error) {
        console.warn("Could not update deadline in Firestore:", error);
      }
    }
  };

  const deleteDeadline = async (id: string) => {
    setDeadlines(prev => {
      const updated = prev.filter(d => d.id !== id);
      try {
        localStorage.setItem('eduplan_student_deadlines', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const currentUser = auth.currentUser;
    if (currentUser && !id.startsWith('local_') && id !== '1' && id !== '2' && id !== '3' && id !== '4') {
      const path = `users/${currentUser.uid}/deadlines/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        console.warn("Could not delete deadline in Firestore:", error);
      }
    }
  };

  const filteredDeadlines = deadlines.filter(d => 
    (d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return 'Just now';
    if (typeof date === 'string') return date;
    if (date.toDate) return date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8 md:space-y-10 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-2xl"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-800">
              {profileData?.rollNo || academicRecord?.rollNo || 'Roll No: INFTT-1-001'}
            </span>
            <span>•</span>
            <span>{profileData?.course || academicRecord?.course || 'B.E. Information Technology'}</span>
            <span>•</span>
            <span>{profileData?.semester || 'Semester IV'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{userFirstName}!</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base font-medium leading-relaxed">
            {profileData?.college ? `${profileData.college} • ` : ''}Your personalized AI learning workspace is ready.
          </p>
        </motion.div>

        {/* Dynamic Quick Student Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sem SGPI</p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {academicRecord?.sem4 || '9.45'}
            </p>
          </div>
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attendance</p>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {academicRecord?.attendance ? `${academicRecord.attendance}%` : '94%'}
            </p>
          </div>
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">IA-1 Score</p>
            <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {academicRecord?.ia1 ?? 19}/20
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Main Content Area */}
        <div className="xl:col-span-8 space-y-6 sm:space-y-10">
          <section className="bg-slate-900 rounded-none sm:rounded-none p-6 sm:p-10 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <div className="relative">
                <Bell size={160} className="text-white/20 drop-shadow-[5px_10px_15px_rgba(255,255,255,0.1)] blur-[0.1px]" />
              </div>
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-xl sm:text-2xl font-display font-bold sm:font-black flex items-center gap-4">
                <Bell className="text-indigo-400" size={28} />
                Notice Board
              </h3>
              <button 
                onClick={() => onNavigate('notices')}
                className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {notices.slice(0, 2).map((notice, idx) => (
                <div key={notice.id ? `${notice.id}-${idx}` : `notice-${idx}`} className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer" onClick={() => onNavigate('notices')}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                      {formatDate(notice.date)}
                    </span>
                    {notice.attachments.length > 0 && <Paperclip size={14} className="text-slate-500" />}
                  </div>
                  <h4 className="text-lg font-bold mb-2 line-clamp-1">{notice.title}</h4>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Smart Scheduler Preview - Simplified */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Calendar className="text-indigo-600" size={24} />
                Smart AI Scheduler
              </h3>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs text-center">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Calendar size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active sessions right now</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">Your AI scheduler is ready to organize your day. Start by adding your first subject or vision task.</p>
              <button 
                onClick={() => onNavigate('scheduler')}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Go to Scheduler
              </button>
            </div>
          </section>

          {/* Study Tools Grid */}
          <section>
            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-6">AI Study Tools</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { title: 'AI Scheduler', icon: Calendar, id: 'scheduler', color: 'bg-amber-500', shadow: 'shadow-amber-100', desc: 'Study plans' },
                { title: 'Video Focus', icon: Video, color: 'bg-blue-500', shadow: 'shadow-blue-100', id: 'video', desc: 'Learning' },
                { title: 'Interactive Quiz', icon: Lightbulb, id: 'quiz', color: 'bg-indigo-600', shadow: 'shadow-indigo-100', desc: 'Test' },
                { title: 'Smart AI Notes', icon: FileText, id: 'notes', color: 'bg-emerald-500', shadow: 'shadow-emerald-100', desc: 'Insights' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => onNavigate(tool.id)}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all text-left group cursor-pointer shadow-xs"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3 shadow-xs",
                    tool.color,
                    tool.shadow
                  )}>
                    <tool.icon size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{tool.title}</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">{tool.desc}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Area */}
        <div className="xl:col-span-4 space-y-10">
          {/* Deadlines */}
          <section className="relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Clock className="text-rose-500 sm:w-6 sm:h-6" size={20} />
                Critical Deadlines
              </h3>
              <button 
                onClick={() => {
                  setFormError(null);
                  setShowAddDeadline(true);
                }}
                className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-xs"
                title="Add Deadline"
              >
                <Plus size={16} />
              </button>
            </div>

            {showAddDeadline && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-slate-700 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">Add Critical Deadline</h4>
                  <button 
                    onClick={() => setShowAddDeadline(false)} 
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleAddDeadline} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Maths IA Submission" 
                      required
                      value={newDeadline.title}
                      onChange={e => setNewDeadline({...newDeadline, title: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dark:text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Due Date <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        required
                        value={newDeadline.date}
                        onChange={e => setNewDeadline({...newDeadline, date: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Due Time
                      </label>
                      <input 
                        type="time" 
                        value={newDeadline.time}
                        onChange={e => setNewDeadline({...newDeadline, time: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Priority
                      </label>
                      <select
                        value={newDeadline.priority}
                        onChange={e => setNewDeadline({...newDeadline, priority: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-xs capitalize"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Type
                      </label>
                      <select
                        value={newDeadline.type}
                        onChange={e => setNewDeadline({...newDeadline, type: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-xs capitalize"
                      >
                        <option value="assignment">Assignment</option>
                        <option value="exam">Quiz / Exam</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Badge Color:</span>
                    <div className="flex gap-2">
                      {[
                        { color: 'bg-rose-500', name: 'Rose' },
                        { color: 'bg-amber-500', name: 'Amber' },
                        { color: 'bg-indigo-500', name: 'Indigo' },
                        { color: 'bg-emerald-500', name: 'Emerald' }
                      ].map(item => (
                        <button 
                          key={item.color}
                          type="button"
                          title={item.name}
                          onClick={() => setNewDeadline({...newDeadline, color: item.color})}
                          className={cn(
                            "w-7 h-7 rounded-full transition-all border-2",
                            item.color,
                            newDeadline.color === item.color ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent opacity-80"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowAddDeadline(false)}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Set Deadline</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="space-y-3">
              {filteredDeadlines.map((deadline: any, idx: number) => (
                <motion.div 
                  key={deadline.id ? `${deadline.id}-${idx}` : `deadline-${idx}`} 
                  whileHover={{ x: 2 }}
                  onClick={() => toggleDeadline(deadline.id, deadline.completed)}
                  className={cn(
                    "bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 sm:gap-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors group cursor-pointer",
                    deadline.completed && "opacity-50 bg-slate-50/50 dark:bg-slate-900/50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white shrink-0",
                    deadline.color || 'bg-rose-500'
                  )}>
                    {deadline.type === 'exam' ? <Trophy size={16} /> : <FileText size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate",
                        deadline.completed && "line-through text-slate-400 dark:text-slate-500"
                      )}>
                        {deadline.title}
                      </p>
                      {deadline.priority === 'high' && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 text-[9px] font-extrabold uppercase">
                          High
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 sm:mt-1">
                      {deadline.time || deadline.date}
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeadline(deadline.id, deadline.completed);
                    }}
                    title={deadline.completed ? "Mark incomplete" : "Mark completed"}
                    className={cn(
                      "p-2 rounded-full transition-all shrink-0",
                      deadline.completed ? "text-emerald-500" : "text-slate-300 hover:text-indigo-500"
                    )}
                  >
                    <CheckCircle2 size={20} />
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeadline(deadline.id);
                    }}
                    title="Delete deadline"
                    className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}

              {filteredDeadlines.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-medium text-sm bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                  No deadlines found. Click the + button above to add one.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
