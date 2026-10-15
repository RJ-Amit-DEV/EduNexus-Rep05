import React, { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Video, Bell, MessageSquare, GraduationCap,
  Settings, LogOut, BarChart3, Calendar, FileText, Users, ChevronDown,
  Menu, X, Moon, Sun, Code2, Lightbulb, Sparkles, Search
} from 'lucide-react';
import { UserRole, ProfileData } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notice } from './NoticeBoard';

interface TopNavbarProps {
  role: UserRole; activeTab: string; setActiveTab: (id: string) => void;
  onLogout: () => void; darkMode: boolean; toggleDarkMode: () => void;
  unreadCounts?: { [key: string]: number }; onRoleSwitch?: (newRole: UserRole) => void;
  userEmail?: string; profile: ProfileData; searchQuery: string;
  setSearchQuery: (q: string) => void; notices: Notice[];
  unreadNotices?: number; onClearNotices?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  role, activeTab, setActiveTab, onLogout, darkMode, toggleDarkMode,
  unreadCounts = {}, onRoleSwitch, userEmail, profile, searchQuery,
  setSearchQuery, notices, unreadNotices = 0, onClearNotices
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const studentNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { label: 'Curriculum', icon: BookOpen, id: 'curriculum' },
    { label: 'Study Notes', icon: FileText, id: 'notes' },
    { label: 'AI Scheduler', icon: Calendar, id: 'scheduler' },
    { label: 'Quiz', icon: Lightbulb, id: 'quiz' },
    { label: 'Video Player', icon: Video, id: 'video' },
    { label: 'Doubt Solver', icon: MessageSquare, id: 'doubts' },
    { label: 'Notice Board', icon: Bell, id: 'notices' },
    { label: 'Team Info', icon: Code2, id: 'about-devs' }
  ];
  const teacherNavItems = [
    { label: 'Class Register', icon: Users, id: 'my-class' },
    { label: 'Notice & Circulars', icon: Bell, id: 'notices' },
    { label: 'Doubt Desk', icon: MessageSquare, id: 'doubts' }
  ];
  const parentNavItems = [
    { label: 'Performance', icon: BarChart3, id: 'performance' },
    { label: 'Department Circulars', icon: Bell, id: 'notices' },
    { label: 'Course Info', icon: BookOpen, id: 'college-info' },
    { label: 'Parent Advisory', icon: FileText, id: 'blogs' },
    { label: 'Faculty Directory', icon: MessageSquare, id: 'contact' }
  ];
  const navItems = role === 'student' ? studentNavItems : role === 'teacher' ? teacherNavItems : parentNavItems;
  const portalName = role === 'teacher' ? 'Faculty Portal' : role === 'parent' ? 'Parent Portal' : 'Student Portal';
  const userName = profile?.name || (role === 'teacher' ? 'Faculty Member' : role === 'parent' ? 'Guardian' : 'Student');

  const navButton = (item: typeof studentNavItems[number], mobile = false) => {
    const unread = unreadCounts[item.id] || (item.id === 'notices' ? unreadNotices : 0);
    const isActive = activeTab === item.id;
    return <button key={item.id} type="button" onClick={() => {
      setActiveTab(item.id);
      if (mobile) setIsMobileMenuOpen(false);
    }} aria-current={isActive ? 'page' : undefined}
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        mobile ? 'w-full justify-start px-3 py-3 text-sm' : 'px-3 py-2.5 text-xs xl:text-sm',
        isActive
          ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      )}>
      <item.icon size={16} className="shrink-0" />
      <span>{item.label}</span>
      {unread > 0 && <span className={cn('min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-bold', isActive ? 'bg-white/20 dark:bg-slate-900/10' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300')}>{unread}</span>}
    </button>;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
            <GraduationCap size={23} />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-xl">EduNexus</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">{portalName}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="relative">
            <button type="button" onClick={() => { setShowNotifications(v => !v); setShowProfileMenu(false); }}
              aria-label="Notifications" aria-expanded={showNotifications}
              className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800">
              <Bell size={19} />
              {unreadNotices > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />}
            </button>
            <AnimatePresence>
              {showNotifications && <>
                <button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)} />
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notices & circulars</h3>
                    {unreadNotices > 0 && <button onClick={onClearNotices} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Mark read</button>}
                  </div>
                  <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                    {notices.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">No recent notices.</p> : notices.slice(0, 5).map(n =>
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{(n as any).category || n.targetAudience || 'General'}</span>
                          <span className="text-[10px] text-slate-500">{typeof n.date === 'string' ? n.date : 'Recent'}</span>
                        </div>
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{n.content}</p>
                      </div>)}
                  </div>
                  <div className="border-t border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <button onClick={() => { setShowNotifications(false); setActiveTab('notices'); }} className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Open Notice Board →</button>
                  </div>
                </motion.div>
              </>}
            </AnimatePresence>
          </div>

          <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800">
            {darkMode ? <Sun size={19} className="text-amber-400" /> : <Moon size={19} />}
          </button>

          <div className="relative">
            <button type="button" onClick={() => { setShowProfileMenu(v => !v); setShowNotifications(false); }}
              aria-label="Open profile menu" aria-expanded={showProfileMenu}
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 text-xs font-bold text-white">
                {profile?.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden max-w-28 text-left md:block">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{userName}</p>
                <p className="text-[10px] font-medium capitalize text-slate-500 dark:text-slate-400">{role}</p>
              </div>
              <ChevronDown size={14} className="hidden text-slate-400 md:block" />
            </button>
            <AnimatePresence>
              {showProfileMenu && <>
                <button aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowProfileMenu(false)} />
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 z-50 mt-2 w-60 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{userName}</p>
                    <p className="truncate text-xs text-slate-500">{userEmail || profile?.email || 'EduNexus account'}</p>
                  </div>
                  <button onClick={() => { setShowProfileMenu(false); setActiveTab('settings'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Settings size={16} />Account settings</button>
                  {onRoleSwitch && <button onClick={() => { setShowProfileMenu(false); onRoleSwitch(role === 'student' ? 'teacher' : role === 'teacher' ? 'parent' : 'student'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"><Sparkles size={16} />Switch portal role</button>}
                  <button onClick={() => { setShowProfileMenu(false); onLogout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"><LogOut size={16} />Sign out</button>
                </motion.div>
              </>}
            </AnimatePresence>
          </div>

          <button type="button" onClick={() => setIsMobileMenuOpen(v => !v)} aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isMobileMenuOpen}
            className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <nav aria-label="Main navigation" className="mx-auto hidden max-w-[1600px] flex-wrap items-center justify-center gap-1 border-t border-slate-100 px-4 py-2 lg:flex dark:border-slate-800">
        {navItems.map(item => navButton(item))}
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && <motion.nav aria-label="Mobile navigation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{navItems.map(item => navButton(item, true))}</div>
          {role !== 'student' && <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500"><Search size={14} />Search notices</label>
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search notices..." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>}
        </motion.nav>}
      </AnimatePresence>
    </header>
  );
};

export const Header: React.FC<any> = () => null;
export const Sidebar: React.FC<any> = () => null;
