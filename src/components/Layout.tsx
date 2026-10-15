import React, { useState } from 'react';
import { 
  LayoutDashboard, BookOpen, Video, BrainCircuit, Bell, MessageSquare, 
  GraduationCap, Settings, LogOut, BarChart3, Calendar, FileText, 
  Users, Search, ChevronDown, Menu, X, Moon, Sun, Code2, Lightbulb, 
  ShieldCheck, Sparkles, ExternalLink, CheckCircle2 
} from 'lucide-react';
import { UserRole, ProfileData } from '../types';
import { isPrivilegedTeamMember } from '../constants';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notice } from './NoticeBoard';

interface TopNavbarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (id: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  unreadCounts?: { [key: string]: number };
  onRoleSwitch?: (newRole: UserRole) => void;
  userEmail?: string;
  profile: ProfileData;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notices: Notice[];
  unreadNotices?: number;
  onClearNotices?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  role,
  activeTab,
  setActiveTab,
  onLogout,
  darkMode,
  toggleDarkMode,
  unreadCounts = {},
  onRoleSwitch,
  userEmail,
  profile,
  searchQuery,
  setSearchQuery,
  notices,
  unreadNotices = 0,
  onClearNotices
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
    { label: 'Team Info', icon: Code2, id: 'about-devs' },
  ];

  const teacherNavItems = [
    { label: 'Class Register', icon: Users, id: 'my-class' },
    { label: 'Notice & Circulars', icon: Bell, id: 'notices' },
    { label: 'Doubt Desk', icon: MessageSquare, id: 'doubts' },
  ];

  const parentNavItems = [
    { label: 'Performance', icon: BarChart3, id: 'performance' },
    { label: 'Department Circulars', icon: Bell, id: 'notices' },
    { label: 'Course Info', icon: BookOpen, id: 'college-info' },
    { label: 'Parent Advisory', icon: FileText, id: 'blogs' },
    { label: 'Faculty Directory', icon: MessageSquare, id: 'contact' },
  ];

  const navItems = role === 'student' ? studentNavItems : role === 'teacher' ? teacherNavItems : parentNavItems;
  const portalName = role === 'teacher' ? 'Faculty Portal' : role === 'parent' ? 'Parent Portal' : 'Student Portal';
  const userName = profile?.name || (role === 'teacher' ? 'Faculty Member' : role === 'parent' ? 'Guardian' : 'Student');

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Portal Title */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold">
              <GraduationCap size={22} />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">EduNexus</span>
              <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{portalName}</span>
            </div>
          </div>
        </div>

        {/* Center: Horizontal Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
          {navItems.map((item) => {
            const unread = unreadCounts[item.id] || (item.id === 'notices' ? unreadNotices : 0);
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon size={16} className={cn(isActive ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400")} />
                <span>{item.label}</span>
                {unread > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
                  )}>
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Search, Theme Toggle, Notifications, Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="hidden md:flex items-center relative w-48 lg:w-60">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features..."
              className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Notifications Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (showProfileMenu) setShowProfileMenu(false);
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotices > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Circulars & Notices</h4>
                      </div>
                      {unreadNotices > 0 && (
                        <button
                          onClick={onClearNotices}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notices.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500">No recent circulars found.</p>
                      ) : (
                        notices.slice(0, 5).map((n) => (
                          <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase">{(n as any).category || n.targetAudience || 'General'}</span>
                              <span className="text-[10px] text-slate-400">{n.date}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">{n.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
                      <button
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveTab('notices');
                        }}
                      >
                        Open Notice Board →
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Profile Shortcut & Settings */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                if (showNotifications) setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-xs">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userName.split(' ').map(n => n[0]).join().substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{userName}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase">{role}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden md:block" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-1"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{userEmail || profile?.email || 'eduplan.local'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveTab('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Settings size={15} className="text-slate-500" />
                      <span>Account Settings</span>
                    </button>

                    {onRoleSwitch && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          const nextRole = role === 'student' ? 'teacher' : role === 'teacher' ? 'parent' : 'student';
                          onRoleSwitch(nextRole);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        <Sparkles size={15} />
                        <span>Switch Portal Role</span>
                      </button>
                    )}

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors lg:hidden cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2"
          >
            <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                        : "bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    )}
                  >
                    <item.icon size={16} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export const Header: React.FC<any> = () => null;
export const Sidebar: React.FC<any> = () => null;
