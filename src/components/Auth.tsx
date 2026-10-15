import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Users, 
  ArrowRight, 
  BookOpen, 
  AlertCircle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Globe,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { PRIVILEGED_TEAM_EMAILS } from '../constants';

interface AuthProps {
  onLogin: (role: UserRole) => void;
  onGoogleSignIn: () => void;
  onTeamDirectLogin?: (email: string, role: UserRole) => void;
  initialStep?: 'landing' | 'role';
  authError?: string | null;
  onClearError?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ 
  onLogin, 
  onGoogleSignIn, 
  onTeamDirectLogin,
  initialStep = 'landing',
  authError = null,
  onClearError
}) => {
  const [step, setStep] = useState<'landing' | 'role'>(initialStep);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedTeamEmail, setSelectedTeamEmail] = useState(PRIVILEGED_TEAM_EMAILS[0]);
  const [showTeamLoginModal, setShowTeamLoginModal] = useState(false);
  const [isIpAddressHost, setIsIpAddressHost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        setIsIpAddressHost(true);
      }
    }
  }, []);

  const handleSwitchToLocalhost = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.hostname = 'localhost';
      window.location.href = currentUrl.toString();
    }
  };

  const roles = [
    { 
      id: 'student' as UserRole, 
      title: 'Student Portal', 
      subtitle: 'Undergraduate & Postgraduate Learners',
      desc: 'Access personalized academic schedules, unit study plans, automated doubt desks, and internal continuous assessment records.', 
      icon: GraduationCap,
      accent: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      features: ['Personalized AI Study Timetables', 'Real-Time Doubt Clearance Desk', 'Internal Assessment (IA-1 & IA-2) Tracker']
    },
    { 
      id: 'teacher' as UserRole, 
      title: 'Faculty Portal', 
      subtitle: 'Professors & Academic Instructors',
      desc: 'Publish official department notices, track student batch attendance, supervise curriculum progression, and resolve student doubts.', 
      icon: Users,
      accent: 'from-indigo-600 to-purple-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      features: ['Official Department Notice Broadcasting', 'Division Attendance & Defaulter Registry', 'Curriculum Unit Syllabus Tracker']
    },
    { 
      id: 'parent' as UserRole, 
      title: 'Parent Portal', 
      subtitle: 'Guardians & Student Advocates',
      desc: "Monitor your ward's academic attendance, track unit test performance, review consistency metrics, and connect with faculty mentors.", 
      icon: Building2,
      accent: 'from-emerald-600 to-teal-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      features: ["Ward Attendance & Test Score Card", 'Academic Consistency Score Radar', 'Faculty Mentor Contact Directory']
    },
  ];

  const handleRoleSelect = async (role: UserRole) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await onLogin(role);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await onGoogleSignIn();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleTeamLogin = (role: UserRole) => {
    if (onTeamDirectLogin) {
      onTeamDirectLogin(selectedTeamEmail, role);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-none">EduPlan AI</span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Academic Management System</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onTeamDirectLogin && (
            <button
              onClick={() => setShowTeamLoginModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={14} />
              Team Sign-In
            </button>
          )}

          <button 
            onClick={() => setStep('role')}
            disabled={isAuthenticating}
            className={cn(
              "px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              isAuthenticating && "animate-pulse"
            )}
          >
            {isAuthenticating ? 'Authenticating...' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* 127.0.0.1 IP hostname banner advisory */}
      {isIpAddressHost && (
        <div className="w-full bg-indigo-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium shadow-xs">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <Globe size={16} className="text-indigo-300 shrink-0" />
            <span>
              You are accessing via <strong>{typeof window !== 'undefined' ? window.location.hostname : 'IP'}</strong>. Firebase Google Sign-In requires <strong>localhost</strong>.
            </span>
          </div>
          <button 
            onClick={handleSwitchToLocalhost}
            className="hidden sm:inline-flex px-3 py-1 bg-white text-indigo-900 font-bold rounded text-xs hover:bg-indigo-50 transition-colors cursor-pointer shadow-xs"
          >
            Switch to http://localhost:3000
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 max-w-7xl mx-auto w-full">
        {/* Auth Error Banner if present */}
        {authError && (
          <div className="w-full max-w-3xl mb-8 p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start gap-4 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-amber-900 dark:text-amber-100">Sign-in Notice & Resolution</p>
              <p className="mt-1 text-amber-800 dark:text-amber-300 leading-relaxed font-medium">{authError}</p>
              
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center gap-3">
                {isIpAddressHost && (
                  <button 
                    onClick={handleSwitchToLocalhost}
                    className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Open http://localhost:3000
                  </button>
                )}

                {onTeamDirectLogin && (
                  <button 
                    onClick={() => setShowTeamLoginModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck size={14} />
                    Developer Team Instant Access
                  </button>
                )}

                {onClearError && (
                  <button 
                    onClick={onClearError}
                    className="text-xs font-bold text-amber-900 dark:text-amber-200 underline cursor-pointer ml-auto"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'landing' ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center flex flex-col items-center w-full max-w-3xl my-auto"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800 mb-6">
                <ShieldCheck size={14} /> Official Institutional Portal • Academic Year 2025–26
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.15]">
                Integrated Academic & Learning System with <span className="text-indigo-600 dark:text-indigo-400">EduPlan AI</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-10 max-w-2xl">
                Single sign-on institutional platform connecting students, faculty members, and parents for real-time curriculum tracking, notices, assessment analytics, and academic mentoring.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setStep('role')}
                  disabled={isAuthenticating}
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-base shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Select Your Portal
                  <ArrowRight size={18} />
                </button>
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className={cn(
                    "w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold rounded-xl text-base border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                    isAuthenticating && "animate-pulse"
                  )}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {isAuthenticating ? 'Signing in...' : 'Sign In with Google'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="role"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              <div className="text-center mb-10 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Choose Your Academic Role
                </h2>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
                  Select your institutional affiliation to sign in with your Google account.
                </p>
              </div>

              {/* Role Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
                {roles.map((role, idx) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-xs", role.accent)}>
                          <role.icon size={22} />
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", role.badgeBg)}>
                          {role.id === 'teacher' ? 'Faculty' : role.id}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">{role.title}</h3>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3">{role.subtitle}</p>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-normal leading-relaxed mb-5">
                        {role.desc}
                      </p>

                      <div className="space-y-2 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Access Scope</p>
                        {role.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRoleSelect(role.id)}
                      disabled={isAuthenticating}
                      className={cn(
                        "w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs",
                        isAuthenticating && "animate-pulse"
                      )}
                    >
                      {isAuthenticating ? 'Signing in...' : `Continue as ${role.id === 'teacher' ? 'Faculty' : role.title}`}
                      {!isAuthenticating && <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => {
                    onClearError?.();
                    setStep('landing');
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  ← Back to Overview
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Developer Team Login Modal */}
      {showTeamLoginModal && onTeamDirectLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Developer Team Access</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct sign-in for core project team members</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTeamLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Team Developer Email
                </label>
                <div className="space-y-2">
                  {PRIVILEGED_TEAM_EMAILS.map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => setSelectedTeamEmail(email)}
                      className={cn(
                        "w-full p-2.5 rounded-lg border text-left text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                        selectedTeamEmail === email
                          ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <span>{email}</span>
                      {selectedTeamEmail === email && <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Choose Initial Portal Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'teacher', 'parent'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        handleTeamLogin(r);
                        setShowTeamLoginModal(false);
                      }}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer shadow-xs"
                    >
                      {r === 'teacher' ? 'Faculty' : r}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                Team developers have universal multi-role permissions and can switch roles at any time inside the portal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-6 border-t border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-slate-900">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          EduPlan AI • Institutional Learning & Academic Assessment Platform
        </p>
      </footer>
    </div>
  );
};


