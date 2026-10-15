import React from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, GraduationCap, Code2, Heart, Briefcase } from 'lucide-react';

const DEVELOPERS = [
  {
    name: "Amit Jadhav",
    email: "amitjadhav4306@gmail.com",
    role: "Project Lead & Full Stack Architect",
    academics: "B.E. in Information Technology",
    experience: "React, Firebase Architecture, AI Integration",
    initials: "AJ",
    color: "from-indigo-600 to-blue-600",
    github: "https://github.com/amitjadhav",
    linkedin: "https://linkedin.com"
  },
  {
    name: "Kunal Gupta",
    email: "guptakunal4575@gmail.com",
    role: "Frontend Engineer & UI/UX Designer",
    academics: "B.E. in Information Technology",
    experience: "Tailwind CSS, Component Architecture, Responsive UI",
    initials: "KG",
    color: "from-purple-600 to-indigo-600",
    github: "https://github.com/kunalgupta",
    linkedin: "https://linkedin.com"
  },
  {
    name: "Krishna Gosavi",
    email: "krishnagosavi880@gmail.com",
    role: "Backend & Cloud Services Specialist",
    academics: "B.E. in Information Technology",
    experience: "Firestore Security Rules, Real-Time Data Sync",
    initials: "KG",
    color: "from-blue-600 to-cyan-600",
    github: "https://github.com/krishnagosavi",
    linkedin: "https://linkedin.com"
  },
  {
    name: "Rushabh Hirave",
    email: "rushabhhirave@gmail.com",
    role: "AI & Educational Systems Developer",
    academics: "B.E. in Information Technology",
    experience: "Gemini API Integration, Curriculum Analytics",
    initials: "RH",
    color: "from-emerald-600 to-teal-600",
    github: "https://github.com/rushabhhirave",
    linkedin: "https://linkedin.com"
  }
];

export const AboutDevelopers: React.FC = () => {
  return (
    <div className="p-4 sm:p-10 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-bold uppercase tracking-widest"
        >
          <Code2 size={16} />
          The Team Behind EduPlan AI
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight"
        >
          Meet Our <span className="text-indigo-600 dark:text-indigo-400">Developers</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium"
        >
          A group of passionate students dedicated to revolutionizing the learning experience through artificial intelligence.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {DEVELOPERS.map((dev, index) => (
          <motion.div
            key={dev.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            whileHover={{ y: -6 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="relative mb-6">
                <div className={`w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${dev.color} flex flex-col items-center justify-center text-white shadow-inner group-hover:scale-[1.02] transition-transform`}>
                  <span className="text-4xl font-black font-mono tracking-wider">{dev.initials}</span>
                  <span className="text-[11px] font-mono text-white/80 mt-1 uppercase tracking-widest">{dev.academics.split('in')[1]?.trim() || 'INFT'}</span>
                </div>
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  <a 
                    href={`mailto:${dev.email}`}
                    title={dev.email}
                    className="w-7 h-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Mail size={13} />
                  </a>
                  <a 
                    href={dev.github} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-7 h-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Github size={13} />
                  </a>
                  <a 
                    href={dev.linkedin} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-7 h-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Linkedin size={13} />
                  </a>
                </div>
              </div>

              <div className="text-center space-y-3 pt-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{dev.name}</h3>
                  <p className="text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">{dev.role}</p>
                </div>

                <div className="space-y-2.5 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                      <GraduationCap size={13} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{dev.academics}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                      <Briefcase size={13} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expertise</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">{dev.experience}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-indigo-600 rounded-[40px] p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-none"
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
            <Heart size={14} className="text-rose-400 fill-rose-400" />
            Our Mission
          </div>
          <h3 className="text-3xl sm:text-4xl font-display font-black tracking-tight">
            "Made for <span className="text-indigo-200">Students</span>, by <span className="text-indigo-200">Students</span>"
          </h3>
          <p className="text-indigo-100 max-w-2xl mx-auto text-lg font-medium">
            We understand the challenges of modern education because we live them every day. EduPlan AI is our contribution to making learning more accessible, personalized, and efficient for everyone.
          </p>
          <div className="pt-4">
            <button className="px-8 py-4 bg-white text-indigo-600 font-display font-black rounded-2xl hover:bg-indigo-50 transition-all shadow-xl">
              CONTACT THE TEAM
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
