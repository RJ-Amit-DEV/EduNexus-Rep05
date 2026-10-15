import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Clock, 
  Lock, 
  CheckCheck,
  Users,
  Search,
  Trash2,
  X,
  AlertCircle,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, getDocs, writeBatch, query, limit, onSnapshot } from 'firebase/firestore';
import { ProfileData } from '../types';

export interface Message {
  id: string;
  sender: string;
  role: 'teacher' | 'student';
  content: string;
  timestamp: string;
  createdAt: any;
  authorId: string;
}

export interface DoubtSolverProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  userRole: 'teacher' | 'student';
  userName: string;
  searchQuery?: string;
}

const DEV_BYPASS_ACTIVE = true; // Set to true to test chat outside of Sundays

export const DoubtSolver: React.FC<DoubtSolverProps> = ({ messages, setMessages, userRole, userName, searchQuery = '' }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [isMembersVisible, setIsMembersVisible] = useState(false);
  const [members, setMembers] = useState<ProfileData[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes((localSearch || searchQuery).toLowerCase()) ||
    m.sender.toLowerCase().includes((localSearch || searchQuery).toLowerCase())
  );

  useEffect(() => {
    // Fetch members from Firestore
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const seenUids = new Set<string>();
      const membersList: ProfileData[] = [];
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        const baseUid = doc.id || (data && (data as any).uid) || `user-${idx}`;
        const uniqueUid = seenUids.has(baseUid) ? `${baseUid}-${idx}` : baseUid;
        seenUids.add(uniqueUid);
        membersList.push({
          ...data,
          uid: uniqueUid
        } as ProfileData);
      });
      setMembers(membersList);
    }, (error) => {
      console.warn("Firestore DoubtSolver members sync notice:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Close emoji picker when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Check if it's Sunday and between 10 AM and 12 PM
    const checkActive = () => {
      const now = new Date();
      const isSunday = now.getDay() === 0;
      const hours = now.getHours();
      setIsActive((isSunday && hours >= 10 && hours < 12) || DEV_BYPASS_ACTIVE);
    };

    checkActive();
    const interval = setInterval(checkActive, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, simulatedRole?: 'teacher' | 'student') => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !simulatedRole) || !isActive) return;

    try {
      const roleToUse = simulatedRole || userRole;
      const nameToUse = simulatedRole ? (simulatedRole === 'teacher' ? 'Prof. Sharma' : 'Rahul K.') : userName;
      
      const msg = {
        sender: nameToUse,
        role: roleToUse,
        content: newMessage || (simulatedRole === 'student' ? "Sir, can you explain the latest assignment?" : "Please check the notice board for updates."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        authorId: simulatedRole ? `sim-${simulatedRole}-123` : (auth.currentUser?.uid || `dev-${userRole}-${userName}`)
      };

      await addDoc(collection(db, 'messages'), msg);
      if (!simulatedRole) {
        setNewMessage('');
        setShowEmojiPicker(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear the entire chat history for everyone? This cannot be undone.")) return;
    setIsClearing(true);
    try {
      const q = query(collection(db, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing chat:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] p-3 sm:p-6 flex flex-col max-w-[1500px] mx-auto overflow-hidden font-sans font-medium">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-xl p-4 sm:p-6 flex items-center justify-between shadow-xs relative z-10">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
            <Users size={22} />
          </div>
          
          <AnimatePresence mode="wait">
            {isSearchVisible ? (
              <motion.div 
                key="search"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 max-w-md relative"
              >
                <input 
                  autoFocus
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search group messages..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <button 
                  onClick={() => { setIsSearchVisible(false); setLocalSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"
                >
                  <X size={15} />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="info"
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="space-y-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">INFTT-1 Academic Doubt Desk</h3>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-200 dark:border-indigo-800">Batch Live</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
                    {members.length} Enrolled Members • {isActive ? "Session Active" : "Scheduled Session"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {userRole === 'teacher' && (
            <button 
              onClick={() => handleSendMessage(undefined, 'student')}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              title="Post Student Inquiry Sample"
            >
              <UserPlus size={18} />
            </button>
          )}

          {!isSearchVisible && (
            <button 
              onClick={() => setIsSearchVisible(true)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              title="Search Messages"
            >
              <Search size={18} />
            </button>
          )}

          <button 
            onClick={() => setIsMembersVisible(true)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            title="View Members"
          >
            <MoreVertical size={18} />
          </button>

          {userRole === 'teacher' && (
            <button 
              onClick={handleClearChat}
              disabled={isClearing}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-xs rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all border border-rose-200 dark:border-rose-900/50 cursor-pointer"
            >
              <Trash2 size={14} />
              {isClearing ? "Clearing..." : "Reset Desk"}
            </button>
          )}
        </div>
      </div>

      {/* Members Modal */}
      <AnimatePresence>
        {isMembersVisible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMembersVisible(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Batch Members</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">INFTT-1 Doubt Clearing Desk</p>
                  </div>
                  <button 
                    onClick={() => setIsMembersVisible(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar space-y-2.5">
                  {/* Teachers */}
                  {members.filter(m => m.role === 'teacher').map((teacher, idx) => (
                    <div key={teacher.uid ? `${teacher.uid}-${idx}` : `teacher-${idx}`} className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {teacher.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{teacher.name}</h4>
                          <span className="px-1.5 py-0.2 bg-indigo-600 text-[9px] font-bold text-white rounded uppercase">Faculty</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{teacher.email}</p>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students ({members.filter(m => m.role === 'student').length})</p>
                  </div>

                  {/* Students */}
                  {members.filter(m => m.role === 'student').length === 0 && (
                    <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-1" size={24} />
                      <p className="text-xs font-semibold text-slate-400">No student profiles registered yet</p>
                    </div>
                  )}
                  
                  {members.filter(m => m.role === 'student').map((student, idx) => (
                    <div key={student.uid ? `${student.uid}-${idx}` : `student-${idx}`} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex items-center gap-3 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="w-9 h-9 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-sm">
                        {student.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            PIN: {student.rollNo || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {student.course || 'INFT-1 Batch'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-50 dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar relative"
      >
        <div className="flex justify-center mb-4">
          <div className="px-3.5 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-2xs">
            <Lock size={12} className="text-indigo-600 dark:text-indigo-400" />
            <span>Academic Doubt Clearing Session • INFT Department</span>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredMessages.map((msg, idx) => {
            const currentUserId = auth.currentUser?.uid || `dev-${userRole}-${userName}`;
            const isMe = msg.authorId === currentUserId;

            return (
              <motion.div 
                key={msg.id ? `${msg.id}-${idx}` : `msg-${idx}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex flex-col max-w-[85%] sm:max-w-[70%] relative z-10 w-full mb-3",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 mb-1 px-1",
                  isMe ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                    msg.role === 'teacher' ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}>
                    {msg.sender[0]}
                  </div>
                  <div className={cn("flex items-center gap-1.5", isMe ? "flex-row-reverse" : "flex-row")}>
                    <span className={cn(
                      "text-[11px] font-bold",
                      msg.role === 'teacher' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {isMe ? "You" : msg.sender}
                    </span>
                    {msg.role === 'teacher' && (
                      <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold rounded">
                        Faculty
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                  {userRole === 'teacher' && (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div className={cn(
                  "p-3.5 rounded-lg relative group transition-colors border text-sm",
                  isMe 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 shadow-2xs"
                )}>
                  <p className="font-normal leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                  
                  {isMe && (
                    <div className="mt-1 flex items-center justify-end gap-0.5 opacity-70">
                      <CheckCheck size={13} className="text-indigo-200" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center mb-3">
              <MessageSquare size={24} className="text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No messages found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Post a question or doubt to begin discussion with faculty and peers.</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl p-3 sm:p-4 shadow-xs relative z-30">
        {!isActive ? (
          <div className="flex items-center justify-center gap-2.5 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <Clock className="text-slate-400" size={16} />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Doubt Desk session schedule: Sundays 10:00 AM – 12:00 PM
            </p>
          </div>
        ) : (
          <div className="relative">
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 mb-3 z-50 shadow-xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
              >
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme={EmojiTheme.AUTO}
                  width={320}
                  height={360}
                />
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center">
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors",
                    showEmojiPicker && "text-indigo-600 bg-slate-100 dark:bg-slate-800"
                  )}
                  title="Insert Emoji"
                >
                  <Smile size={18} />
                </button>
              </div>

              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your academic inquiry or doubt here..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600 rounded-lg text-sm font-normal text-slate-800 dark:text-slate-200 outline-none transition-colors placeholder:text-slate-400"
              />

              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

