import React from 'react';
import { 
  MapPin, 
  Award, 
  User, 
  Users,
  Monitor, 
  Globe, 
  Radio, 
  Zap, 
  Microchip, 
  Settings,
  Clock,
  ChevronRight,
  Info,
  Quote
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Department {
  id: string;
  icon: React.ReactNode;
  dept: string;
  title: string;
  description: string;
  intake: string;
  duration: string;
  color: string;
}

const DEPARTMENTS: Department[] = [
  {
    id: 'comp',
    icon: <Monitor size={24} />,
    dept: 'DEPARTMENT OF COMP',
    title: 'BE in Computer Engineering',
    description: 'Focus on software development, AI, data science, and computer architecture.',
    intake: '120 Students',
    duration: '4 Years',
    color: 'bg-indigo-600'
  },
  {
    id: 'it',
    icon: <Globe size={24} />,
    dept: 'DEPARTMENT OF IT',
    title: 'BE in Information Technology',
    description: 'Specialization in cloud computing, cybersecurity, and enterprise systems.',
    intake: '60 Students',
    duration: '4 Years',
    color: 'bg-blue-500'
  },
  {
    id: 'extc',
    icon: <Radio size={24} />,
    dept: 'DEPARTMENT OF EXTC',
    title: 'BE in Electronics & Telecomm.',
    description: 'Advanced study of communication networks, signal processing, and RF engineering.',
    intake: '60 Students',
    duration: '4 Years',
    color: 'bg-rose-500'
  },
  {
    id: 'elec',
    icon: <Zap size={24} />,
    dept: 'DEPARTMENT OF ELECTRICAL',
    title: 'BE in Electrical Engineering',
    description: 'Core engineering in power systems, renewable energy, and control systems.',
    intake: '60 Students',
    duration: '4 Years',
    color: 'bg-amber-500'
  },
  {
    id: 'ece',
    icon: <Microchip size={24} />,
    dept: 'DEPARTMENT OF ECE',
    title: 'BE in Electronics & Communication',
    description: 'Focus on embedded systems, VLSI design, and microelectronics.',
    intake: '60 Students',
    duration: '4 Years',
    color: 'bg-emerald-500'
  },
  {
    id: 'mech',
    icon: <Settings size={24} />,
    dept: 'DEPARTMENT OF MECH',
    title: 'BE in Mechanical Engineering',
    description: 'Study of thermodynamics, robotics, manufacturing, and design.',
    intake: '120 Students',
    duration: '4 Years',
    color: 'bg-slate-600'
  }
];

interface CurriculumProps {
  searchQuery?: string;
}

export const Curriculum: React.FC<CurriculumProps> = ({ searchQuery = '' }) => {
  const filteredDepts = DEPARTMENTS.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.dept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Hero Section */}
      <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1920&auto=format&fit=crop" 
          alt="College Building" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-6xl font-display font-black text-white mb-4 leading-tight">
              Global Institute of <br /> Engineering & Technology
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90 text-sm sm:text-base font-medium">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-indigo-400" />
                Silicon Valley Campus, CA
              </div>
              <div className="flex items-center gap-2">
                <Award size={18} className="text-indigo-400" />
                Accredited A++ Grade
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-none border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-none">
                  <Info size={24} />
                </div>
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">About the Institution</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                Established in 1995, GIET is a premier engineering institution dedicated to fostering innovation and excellence in technical education. Our campus features state-of-the-art laboratories, a world-class research center, and strong industry partnerships with leading tech giants. We empower students to solve real-world problems through a blend of theoretical knowledge and hands-on experience.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-none border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-none overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-md">
                  <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop" 
                    alt="Principal" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Quote size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Principal's Message</span>
                  </div>
                  <h3 className="text-lg font-display font-black text-slate-900 dark:text-white mb-1">Dr. Sarah Johnson, Ph.D.</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    "Our mission is to bridge the gap between academia and industry, ensuring our graduates are not just engineers, but visionary leaders of tomorrow."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Student Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-indigo-600 p-8 rounded-none text-white shadow-2xl shadow-indigo-500/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white/20 rounded-none flex items-center justify-center backdrop-blur-md">
                  <User size={24} />
                </div>
                <h2 className="text-xl font-display font-black">Student Profile</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Current Course</p>
                  <p className="text-lg font-bold">B.Tech in Computer Science & Engineering</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Year / Sem</p>
                    <p className="font-bold">3rd Year / 6th Sem</p>
                  </div>
                  <div>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Roll Number</p>
                    <p className="font-bold">CSE-2023-042</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center justify-between mb-2">
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Academic Standing</p>
                <p className="font-black">8.8 CGPA</p>
              </div>
              <div className="h-2 bg-white/20 rounded-none overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '88%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-white rounded-none"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Departments Grid */}
        <div className="mt-16 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white">Our Departments</h2>
            {searchQuery && (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                Found {filteredDepts.length} results
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDepts.map((dept, idx) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-none border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-4 ${dept.color} text-white rounded-none shadow-lg`}>
                    {dept.icon}
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-none">
                    NBA Accredited
                  </span>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{dept.dept}</p>
                <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                  {dept.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                  {dept.description}
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium flex items-center gap-2">
                      <Users size={14} /> Annual Intake
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold">{dept.intake}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium flex items-center gap-2">
                      <Clock size={14} /> Duration
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold">{dept.duration}</span>
                  </div>
                </div>

                <button className="w-full py-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 font-black rounded-none transition-all flex items-center justify-center gap-2 group/btn">
                  View Department Details
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>

          {filteredDepts.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-none border border-dashed border-slate-200 dark:border-slate-800">
              <Monitor size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
              <h3 className="text-xl font-display font-black text-slate-900 dark:text-white">No departments found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
