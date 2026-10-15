import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Rocket, Calendar, Flag, Award, Save, Loader2, Trophy } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface VisionBoardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisionBoard: React.FC<VisionBoardProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState({
    day1: '',
    month1: '',
    year1: '',
    year3: '',
    skills: ''
  });

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      const fetchGoals = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'users', auth.currentUser!.uid, 'content', 'visionBoard');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setGoals(docSnap.data() as any);
          }
        } catch (error) {
          console.error("Error fetching vision board:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGoals();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'content', 'visionBoard');
      await setDoc(docRef, {
        ...goals,
        updatedAt: serverTimestamp()
      }, { merge: true });
      onClose();
    } catch (error) {
      console.error("Error saving vision board:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">My Academic Goals</h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" 
                  />
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Gathering your dreams...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar">
                  <GoalCard 
                    icon={<Calendar size={20} />} 
                    title="Today's Mission" 
                    value={goals.day1} 
                    onChange={(v) => setGoals({...goals, day1: v})} 
                    placeholder="What will you conquer today?"
                    color="from-rose-500/10 to-rose-500/5 border-rose-100 dark:border-rose-900/30 text-rose-600"
                  />
                  <GoalCard 
                    icon={<Rocket size={20} />} 
                    title="Monthly Target" 
                    value={goals.month1} 
                    onChange={(v) => setGoals({...goals, month1: v})} 
                    placeholder="A mountain to climb this month..."
                    color="from-amber-500/10 to-amber-500/5 border-amber-100 dark:border-amber-900/30 text-amber-600"
                  />
                  <GoalCard 
                    icon={<Target size={20} />} 
                    title="1 Year Vision" 
                    value={goals.year1} 
                    onChange={(v) => setGoals({...goals, year1: v})} 
                    placeholder="Where do you see yourself?"
                    color="from-emerald-500/10 to-emerald-500/5 border-emerald-100 dark:border-emerald-900/30 text-emerald-600"
                  />
                  <GoalCard 
                    icon={<Flag size={20} />} 
                    title="3 Year Vision" 
                    value={goals.year3} 
                    onChange={(v) => setGoals({...goals, year3: v})} 
                    placeholder="The big picture..."
                    color="from-blue-500/10 to-blue-500/5 border-blue-100 dark:border-blue-900/30 text-blue-600"
                  />
                  <div className="md:col-span-2">
                    <GoalCard 
                      icon={<Award size={20} />} 
                      title="Skills To Master" 
                      value={goals.skills} 
                      onChange={(v) => setGoals({...goals, skills: v})} 
                      placeholder="List the superpowers you want to acquire..."
                      color="from-indigo-500/10 to-indigo-500/5 border-indigo-100 dark:border-indigo-900/30 text-indigo-600"
                    />
                  </div>
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-8">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center relative py-6 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-4 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                    <Trophy size={16} className="text-amber-500" />
                  </div>
                  <p className="text-xl font-display font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-2">
                    "Small aim is a crime; have a great aim."
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">— Dr. APJ Abdul Kalam</p>
                </motion.div>

                <button 
                  disabled={loading || saving}
                  onClick={handleSave}
                  className="w-full py-5 bg-indigo-600 text-white font-display font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                  MANIFEST MY VISION
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const GoalCard: React.FC<{ 
  icon: React.ReactNode, 
  title: string, 
  value: string, 
  onChange: (v: string) => void, 
  placeholder: string,
  color: string
}> = ({ icon, title, value, onChange, placeholder, color }) => (
  <div className={cn(
    "flex flex-col gap-3 p-5 rounded-3xl border-b-4 transition-all duration-300 hover:shadow-lg bg-gradient-to-br",
    color
  )}>
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
        {icon}
      </div>
      <label className="text-[11px] font-black uppercase tracking-[0.15em] opacity-80">
        {title}
      </label>
    </div>
    <textarea 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-none p-0 text-base font-semibold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 placeholder:font-medium resize-none h-20 custom-scrollbar"
      placeholder={placeholder}
    />
  </div>
);
