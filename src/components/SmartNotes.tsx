import React from 'react';
import { FileText, History, BrainCircuit, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const SmartNotes: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-200 dark:border-slate-800 p-12 sm:p-20 shadow-2xl shadow-slate-900/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 text-indigo-600">
          <BrainCircuit size={200} />
        </div>
        
        <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-indigo-200 rotate-3 relative z-10">
          <BrainCircuit size={48} />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Clock size={14} />
            Coming Soon
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Smart AI <span className="text-indigo-600">Notes</span>
          </h2>
          
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto mb-10">
            We're fine-tuning our AI to provide even more accurate, structured, and high-quality study notes. Stay tuned!
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold flex items-center gap-2">
              <FileText size={18} />
              PDF Export
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold flex items-center gap-2">
              <History size={18} />
              Note History
            </div>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-slate-400 text-sm font-medium">
        Estimated Launch: Q3 2026
      </p>
    </div>
  );
};
