/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Brain,
  MessageSquare,
  BarChart3,
  Calendar,
  FileText,
  Award,
  KeyRound,
  IdCard,
  UserCheck,
  Send,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { PRIVILEGED_TEAM_EMAILS } from '../constants';
import { 
  DEFAULT_TEACHER_CLASS_CODE, 
  generateStudentId, 
  generateParentId,
  deriveStudentIdFromParentId 
} from '../lib/id-generator';

export interface PortalLoginPayload {
  role: UserRole;
  name?: string;
  rollNo?: string;
  classCode?: string;
  studentId?: string;
  parentId?: string;
  teacherInviteCode?: string;
}

interface AuthProps {
  onLogin: (role: UserRole, payload?: PortalLoginPayload) => void;
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
  const [activeModal, setActiveModal] = useState<UserRole | 'team' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedTeamEmail, setSelectedTeamEmail] = useState(PRIVILEGED_TEAM_EMAILS[0]);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentClassCode, setStudentClassCode] = useState('');

  // Teacher Form State
  const [teacherName, setTeacherName] = useState('Prof. Amit Jadhav');
  const [teacherDept, setTeacherDept] = useState('Information Technology');
  const [teacherClassCode, setTeacherClassCode] = useState('');

  // Parent Form State
  const [parentAccessId, setParentAccessId] = useState('');
  const [parentName, setParentName] = useState('');

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

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRollNo.trim() || !studentClassCode.trim()) return;
    onLogin('student', { role: 'student', name: studentName.trim(), rollNo: studentRollNo.trim().toUpperCase(), classCode: studentClassCode.trim().toUpperCase() });
    setActiveModal(null);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherClassCode.trim()) return;
    onLogin('teacher', { role: 'teacher', name: teacherName.trim(), teacherInviteCode: teacherClassCode.trim() });
    setActiveModal(null);
  };

  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentAccessId.trim()) return;
    onLogin('parent', { role: 'parent', name: parentName.trim(), parentId: parentAccessId.trim().toUpperCase() });
    setActiveModal(null);
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSent(true);
    setTimeout(() => {
      setContactMessage('');
      setContactSent(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#070b14]/85 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
            EduNexus
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#portals" className="hover:text-white transition-colors">Portals</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          <span className="h-4 w-[1px] bg-slate-800" />
          <button onClick={() => setActiveModal('student')} className="hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer">
            <GraduationCap size={15} /> Students
          </button>
          <button onClick={() => setActiveModal('teacher')} className="hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer">
            <Users size={15} /> Teachers
          </button>
          <button onClick={() => setActiveModal('parent')} className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer">
            <Building2 size={15} /> Parents
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {onTeamDirectLogin && (
            <button
              onClick={() => setActiveModal('team')}
              className="hidden sm:flex px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={14} className="text-blue-400" />
              Team Access
            </button>
          )}

          <button
            onClick={() => onLogin('student', { role: 'student', name: studentName.trim(), rollNo: studentRollNo.trim().toUpperCase(), classCode: studentClassCode.trim().toUpperCase() })}
            className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 cursor-pointer transition-colors"
          >
            Sign In
          </button>

          <button 
            onClick={() => setActiveModal('student')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Host advisory if on 127.0.0.1 */}
      {isIpAddressHost && (
        <div className="w-full bg-blue-950/80 text-blue-200 border-b border-blue-900/60 px-4 py-2 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <Globe size={15} className="text-blue-400 shrink-0" />
            <span>You are accessing via IP. For optimal Google Sign-In, use localhost.</span>
          </div>
          <button 
            onClick={handleSwitchToLocalhost}
            className="hidden sm:inline-flex px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-[11px] cursor-pointer"
          >
            Switch to localhost:3000
          </button>
        </div>
      )}

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Auth Error Banner */}
        {authError && (
          <div className="max-w-4xl mx-auto px-4 mt-6">
            <div className="p-4 bg-amber-950/50 border border-amber-700/60 rounded-xl text-amber-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-100">Notice</p>
                <p className="mt-0.5 text-amber-300">{authError}</p>
              </div>
              {onClearError && (
                <button onClick={onClearError} className="text-xs font-bold text-amber-400 underline cursor-pointer">
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* 1. HERO SECTION (Screenshot 1 Match) */}
        <section className="relative px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Institutional Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Unified Educational Platform • Academic Year 2025–26</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6"
          >
            The smarter way to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">
              manage education
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl mb-10"
          >
            EduNexus brings students, teachers, and parents onto one intelligent platform — with AI-powered learning tools, real-time communication, and actionable progress insights.
          </motion.p>

          {/* 3 Portal Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full max-w-lg mb-10"
          >
            <button 
              onClick={() => setActiveModal('student')}
              className="flex-1 min-w-[150px] sm:min-w-[170px] px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Student Sign In</span>
              <ArrowRight size={16} />
            </button>

            <button 
              onClick={() => setActiveModal('teacher')}
              className="flex-1 min-w-[150px] sm:min-w-[170px] px-6 py-3.5 bg-[#121927] hover:bg-[#1b253b] text-slate-100 border border-slate-800 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Teacher Sign In</span>
            </button>

            <button 
              onClick={() => setActiveModal('parent')}
              className="flex-1 min-w-[150px] sm:min-w-[170px] px-6 py-3.5 bg-[#121927] hover:bg-[#1b253b] text-slate-100 border border-slate-800 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Parent Sign In</span>
            </button>
          </motion.div>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={15} />
              <span className="text-slate-300">No credit card required</span>
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <ShieldCheck size={15} />
              <span className="text-slate-300">FERPA compliant</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Sparkles size={15} />
              <span className="text-slate-300">Trusted by 500+ schools</span>
            </span>
          </div>

          {/* 4 Stats Bar (Screenshot 1 Match) */}
          <div className="w-full mt-20 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">50,000+</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Active Students</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">3,200+</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Educators</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">98%</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Satisfaction Rate</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">120+</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Partner Schools</p>
            </div>
          </div>
        </section>

        {/* 2. PLATFORM FEATURES SECTION (Screenshot 2 Match) */}
        <section id="features" className="px-4 sm:px-6 py-20 bg-[#0b101d] border-t border-b border-slate-800/80">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Platform Features</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
                Everything you need, built in
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                One platform that replaces ten fragmented tools. Designed for modern schools and institutions.
              </p>
            </div>

            {/* 6 Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                    <Brain size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">AI Study Plans</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Personalized multi-week learning roadmaps generated from each student's performance data, goals, and available study hours.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                    <MessageSquare size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Real-Time Messaging</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Live one-on-one and group chat rooms between students, teachers, and parents. Ask doubts, get answers — instantly.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
                    <BarChart3 size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Progress Analytics</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Detailed grade tracking, consistency scores, attendance trends, and XP streaks — all in one visual dashboard.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Smart Attendance</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    One-click attendance registers for teachers. Parents get instant alerts for absences. Students see their own attendance history.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Assignment & Homework</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Teachers assign, students submit, parents monitor. Complete lifecycle from posting to grading with AI-assisted scoring support.
                  </p>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="bg-[#121927] border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                    <Award size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Gamification & Badges</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Daily learning streaks, XP points, unlockable achievement badges, and leaderboards to keep students motivated and engaged.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BUILT FOR EVERY STAKEHOLDER (Screenshot 3 Match) */}
        <section id="portals" className="px-4 sm:px-6 py-24 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Built for every stakeholder
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Three purpose-built experiences, each tailored to the unique needs of students, educators, and parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Card */}
            <div className="bg-[#101726] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-6">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Student Portal</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Personalized learning paths, AI tutoring, assignment tracking, and gamified progress to keep students engaged.
                </p>

                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Adaptive AI study plans</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>24/7 doubt resolution</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Assignment & grade tracker</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Learning streaks & badges</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => setActiveModal('student')}
                className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <span>Access Student Portal</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Teacher Card */}
            <div className="bg-[#101726] border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-6">
                  <Users size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Teacher Portal</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Powerful classroom management tools — from one-click attendance and AI quiz generation to real-time doubt resolution.
                </p>

                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>Smart attendance register</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>AI-generated assessments</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>Classroom doubt hub</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>Assignment scoring & feedback</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => setActiveModal('teacher')}
                className="text-xs sm:text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <span>Access Teacher Portal</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Parent Card */}
            <div className="bg-[#101726] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-6">
                  <Building2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Parent Portal</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Stay connected with your child's academic journey — attendance, grades, progress scores, and teacher communication.
                </p>

                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Live attendance monitoring</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Academic progress reports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Direct teacher messaging</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>AI growth recommendations</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => setActiveModal('parent')}
                className="text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <span>Access Parent Portal</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* 4. CONTACT SECTION (Screenshot 4 Match) */}
        <section id="contact" className="px-4 sm:px-6 py-20 bg-[#0b101d] border-t border-slate-800/80">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Get In Touch</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Have questions about EduNexus?</h2>
            </div>

            <form onSubmit={handleSendMessage} className="bg-[#121927] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <textarea 
                rows={4}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                className="w-full px-4 py-3 bg-[#0a0f1c] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                required
              />

              <div className="flex items-center justify-between">
                {contactSent ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Check size={14} /> Message sent! Our team will respond shortly.
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">We typically reply within 24 hours.</span>
                )}

                <button 
                  type="submit"
                  disabled={!contactMessage.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* 5. FOOTER SECTION (With Big EduNexus Portal Text as requested) */}
      <footer id="about" className="bg-[#050811] border-t border-slate-800/80 pt-16 pb-12 px-4 sm:px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <GraduationCap size={18} />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">EduNexus</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
                The unified education management platform connecting students, teachers, and parents through intelligent tools.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Globe size={14} className="text-blue-400" />
                <span>Available worldwide</span>
              </div>
            </div>

            {/* Col 1 */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#portals" className="hover:text-white transition-colors">Portals</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Col 2 */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Portals</p>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><button onClick={() => setActiveModal('student')} className="hover:text-white transition-colors cursor-pointer">Student Login</button></li>
                <li><button onClick={() => setActiveModal('teacher')} className="hover:text-white transition-colors cursor-pointer">Teacher Login</button></li>
                <li><button onClick={() => setActiveModal('parent')} className="hover:text-white transition-colors cursor-pointer">Parent Login</button></li>
                <li><button onClick={() => setActiveModal('student')} className="hover:text-white transition-colors cursor-pointer">Create Account</button></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><span className="cursor-pointer hover:text-white transition-colors">About Us</span></li>
                <li><span className="cursor-pointer hover:text-white transition-colors">Blog</span></li>
                <li><span className="cursor-pointer hover:text-white transition-colors">Careers</span></li>
                <li><span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span></li>
                <li><span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          {/* Copyright & Secondary Links */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <p>© 2026 EduNexus. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="cursor-pointer hover:text-slate-400">Privacy Policy</span>
              <span className="cursor-pointer hover:text-slate-400">Terms of Service</span>
              <span className="cursor-pointer hover:text-slate-400">Cookie Policy</span>
            </div>
          </div>

          {/* THE BIG TEXT OF PORTAL NAME IN FOOTER (Requested by User) */}
          <div className="mt-14 pt-6 select-none pointer-events-none text-center overflow-hidden">
            <h1 className="text-[14vw] sm:text-[15vw] font-black tracking-widest text-slate-800/35 leading-none uppercase">
              EDUNEXUS
            </h1>
          </div>
        </div>
      </footer>

      {/* ===================== AUTH MODALS ===================== */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-left"
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* STUDENT MODAL */}
              {activeModal === 'student' && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Student Portal Access</h3>
                      <p className="text-xs text-slate-400">Enter your details and Teacher's Class Code</p>
                    </div>
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student Full Name</label>
                      <input 
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Roll Number</label>
                      <input 
                        type="text"
                        value={studentRollNo}
                        onChange={(e) => setStudentRollNo(e.target.value)}
                        placeholder="e.g. INFTT-1-042"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono placeholder-slate-500 outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <KeyRound size={13} className="text-amber-400" />
                          <span>Teacher Class Code</span>
                          <span className="text-[10px] text-amber-400 font-bold">(Required)</span>
                        </label>
                        <span className="text-[10px] text-amber-400 font-bold">(Required)</span>
                      </div>
                      <input 
                        type="text"
                        value={studentClassCode}
                        onChange={(e) => setStudentClassCode(e.target.value.toUpperCase())}
                        placeholder="Institution-issued teacher invite code"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs sm:text-sm text-white font-mono tracking-wider placeholder-slate-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Enrolls you under that teacher. Your teacher must already have registered your roll number in this class.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Enroll & Open Student Dashboard</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-[#0f172a] px-2">
                        or continue with
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLogin('teacher', { role: 'teacher', name: teacherName.trim(), teacherInviteCode: teacherClassCode.trim() })}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TEACHER MODAL */}
              {activeModal === 'teacher' && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Faculty & Teacher Portal</h3>
                      <p className="text-xs text-slate-400">Class management, student records & attendance</p>
                    </div>
                  </div>

                  <form onSubmit={handleTeacherSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Teacher Name & Title</label>
                      <input 
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="e.g. Prof. Amit Jadhav"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department</label>
                      <input 
                        type="text"
                        value={teacherDept}
                        onChange={(e) => setTeacherDept(e.target.value)}
                        placeholder="e.g. Information Technology"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <KeyRound size={13} className="text-indigo-400" />
                        <span>Institution Teacher Invitation Code</span>
                      </label>
                      <input 
                        type="text"
                        value={teacherClassCode}
                        onChange={(e) => setTeacherClassCode(e.target.value.trim())
                        placeholder="e.g. CLS-4921"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs sm:text-sm text-white font-mono tracking-wider outline-none focus:border-indigo-400"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Use the one-time invitation code supplied by your institution. Your class code will be generated after verification.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Open Teacher Dashboard</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-[#0f172a] px-2">
                        or continue with
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLogin('parent', { role: 'parent', name: parentName.trim(), parentId: parentAccessId.trim().toUpperCase() })}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </form>
                </div>
              )}

              {/* PARENT MODAL */}
              {activeModal === 'parent' && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Parent Portal Login</h3>
                      <p className="text-xs text-slate-400">Track your child's attendance & grades</p>
                    </div>
                  </div>

                  <form onSubmit={handleParentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent / Guardian Name</label>
                      <input 
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <IdCard size={14} className="text-emerald-400" />
                          <span>Student's Parent Access ID</span>
                          <span className="text-[10px] text-emerald-400 font-bold">(Key)</span>
                        </label>

                      </div>

                      <input 
                        type="text"
                        value={parentAccessId}
                        onChange={(e) => setParentAccessId(e.target.value.toUpperCase())}
                        placeholder="Institution-provided Parent Access ID"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs sm:text-sm text-white font-mono tracking-wider outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        This code is only an identifier, not proof of identity. Sign in with the Google account verified by your institution; the account must already be linked to this student.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>View Ward Academic Report</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-[#0f172a] px-2">
                        or continue with
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TEAM MODAL */}
              {activeModal === 'team' && onTeamDirectLogin && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Developer Team Access</h3>
                      <p className="text-xs text-slate-400">Instant role testing with privileged accounts</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Team Member</label>
                      <select 
                        value={selectedTeamEmail}
                        onChange={(e) => setSelectedTeamEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white outline-none cursor-pointer"
                      >
                        {PRIVILEGED_TEAM_EMAILS.map((email) => (
                          <option key={email} value={email}>{email}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 pt-2">
                      <button
                        onClick={() => { onTeamDirectLogin(selectedTeamEmail, 'student'); setActiveModal(null); }}
                        className="p-3 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        Student
                      </button>
                      <button
                        onClick={() => { onTeamDirectLogin(selectedTeamEmail, 'teacher'); setActiveModal(null); }}
                        className="p-3 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        Teacher
                      </button>
                      <button
                        onClick={() => { onTeamDirectLogin(selectedTeamEmail, 'parent'); setActiveModal(null); }}
                        className="p-3 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        Parent
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
