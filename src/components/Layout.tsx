import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  BrainCircuit, 
  Bell, 
  MessageSquare, 
  GraduationCap, 
  Settings, 
  LogOut,
  BarChart3,
  Calendar,
  FileText,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  Code2,
  Lightbulb,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { UserRole, NavItem, ProfileData } from '../types';
import { isPrivilegedTeamMember } from '../constants';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (id: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  unreadCounts?: { [key: string]: number };
  onRoleSwitch?: (newRole: UserRole) => void;
  userEmail?: string;
  profile?: ProfileData;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  activeTab, 
  setActiveTab, 
  onLogout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  darkMode,
  toggleDarkMode,
  unreadCounts = {},
  onRoleSwitch,
  userEmail,
  profile
}) => {
  const isPrivileged = isPrivilegedTeamMember(userEmail) || userEmail?.includes('eduplan.local');

  // Semantic Categories for Student
  const studentSections: NavSection[] = [
    {
      title: 'Core Academics',
      items: [
        { label: 'Academic Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { label: 'Curriculum & Units', icon: BookOpen, id: 'curriculum' },
        { label: 'Smart Study Notes', icon: FileText, id: 'notes' },
      ]
    },
    {
      title: 'AI Study Tools',
      items: [
        { label: 'AI Study Scheduler', icon: Calendar, id: 'scheduler' },
        { label: 'Quiz Assessment', icon: Lightbulb, id: 'quiz' },
        { label: 'Video Focus Player', icon: Video, id: 'video' },
        { label: 'Doubt Solver Desk', icon: MessageSquare, id: 'doubts' },
      ]
    },
    {
      title: 'Campus Life',
      items: [
        { label: 'Notice Board', icon: Bell, id: 'notices' },
        { label: 'Project Info & Team', icon: Code2, id: 'about-devs' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Account Settings', icon: Settings, id: 'settings' },
      ]
    }
  ];

  // Semantic Categories for Faculty / Teacher
  const teacherSections: NavSection[] = [
    {
      title: 'Classroom Administration',
      items: [
        { label: 'Class Register & Records', icon: Users, id: 'my-class' },
        { label: 'Notice & Circulars', icon: Bell, id: 'notices' },
      ]
    },
    {
      title: 'Student Support',
      items: [
        { label: 'Doubt Resolution Desk', icon: MessageSquare, id: 'doubts' },
      ]
    },
    {
      title: 'System Preferences',
      items: [
        { label: 'Faculty Profile Settings', icon: Settings, id: 'settings' },
      ]
    }
  ];

  // Semantic Categories for Parents / Guardians
  const parentSections: NavSection[] = [
    {
      title: 'Student Progress',
      items: [
        { label: 'Academic Performance', icon: BarChart3, id: 'performance' },
        { label: 'Department Circulars', icon: Bell, id: 'notices' },
      ]
    },
    {
      title: 'Institutional Engagement',
      items: [
        { label: 'College & Course Info', icon: BookOpen, id: 'college-info' },
        { label: 'Parent Advisory Articles', icon: FileText, id: 'blogs' },
        { label: 'Faculty Contact Directory', icon: MessageSquare, id: 'contact' },
      ]
    },
    {
      title: 'Account Settings',
      items: [
        { label: 'Parent Account Settings', icon: Settings, id: 'settings' },
      ]
    }
  ];

  const sections = role === 'student' ? studentSections : role === 'teacher' ? teacherSections : parentSections;

  const roleLabel = role === 'teacher' ? 'Faculty Portal' : role === 'parent' ? 'Parent Portal' : 'Student Portal';
  const roleBadgeColor = role === 'teacher' 
    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    : role === 'parent'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

  const userName = profile?.name || (role === 'teacher' ? 'Faculty Member' : role === 'parent' ? 'Guardian' : 'Student');
  const userSubtitle = role === 'student' 
    ? (profile?.rollNo || profile?.course || 'INFT Semester 4')
    : role === 'teacher' 
    ? (profile?.designation || 'Class In-charge')
    : (profile?.childName ? `Ward: ${profile.childName}` : 'Parent Account');

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "h-screen bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col fixed left-0 top-0 z-[60] shadow-sm transition-all duration-300 overflow-hidden lg:translate-x-0 select-none",
        isCollapsed ? "w-20" : "w-72",
        isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className={cn(
          "p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center transition-all",
          isCollapsed && !isMobileOpen ? "justify-center" : "gap-3"
        )}>
          <div className="relative group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={22} className="transition-transform group-hover:scale-110" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <div className="overflow-hidden whitespace-nowrap min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight">
                  EduNexus
                </h1>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", roleBadgeColor)}>
                  {roleLabel}
                </span>
              </div>
            </div>
          )}
          
          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-5 -right-3.5 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-md z-50 transition-all hover:scale-105 hidden lg:flex"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Grouped Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {sections.map((section, sIdx) => (
            <div key={section.title || sIdx} className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2.5 pb-1 pt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {section.title}
                  </span>
                </div>
              )}

              {isCollapsed && !isMobileOpen && sIdx > 0 && (
                <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const unread = unreadCounts[item.id] || 0;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (isMobileOpen) setIsMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center rounded-xl transition-all text-left font-medium text-xs relative group cursor-pointer",
                        isCollapsed && !isMobileOpen ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                        isActive 
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon 
                          size={18} 
                          className={cn(
                            "shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                          )} 
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">
                            {item.label}
                          </span>
                        )}
                      </div>
                      
                      {/* Floating tooltip for collapsed view */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg border border-slate-700/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[70] shadow-xl pointer-events-none">
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">{section.title}</p>
                        </div>
                      )}

                      {/* Unread badge */}
                      {unread > 0 && (!isCollapsed || isMobileOpen) && (
                        <span className={cn(
                          "px-2 py-0.5 font-mono text-[10px] font-bold rounded-full",
                          isActive 
                            ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" 
                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                        )}>
                          {unread}
                        </span>
                      )}

                      {unread > 0 && isCollapsed && !isMobileOpen && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Profile Card & Global Controls */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              {/* User Identity Details */}
              <div 
                onClick={() => {
                  setActiveTab('settings');
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className="flex items-center gap-3 cursor-pointer group"
                title="Manage Account & Settings"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-xs">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
                
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {userName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {userSubtitle}
                  </p>
                </div>
              </div>

              {/* Action Controls Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <button 
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                  title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
                >
                  {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
                  <span className="text-[11px]">{darkMode ? 'Light' : 'Dark'}</span>
                </button>

                <button 
                  onClick={onLogout}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors flex items-center gap-1.5"
                  title="Sign Out of Session"
                >
                  <LogOut size={15} />
                  <span className="text-[11px] font-semibold">Exit</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Profile Icon Controls */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setActiveTab('settings')}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-xs hover:scale-105 transition-transform"
                title={`${userName} (Settings)`}
              >
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                )}
              </button>
              
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={darkMode ? "Light Theme" : "Dark Theme"}
              >
                {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>

              <button 
                onClick={onLogout}
                className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  profile: ProfileData;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notices: any[];
  unreadNotices?: number;
  onClearNotices?: () => void;
  onNavigate?: (tab: string) => void;
  role?: UserRole;
  onRoleSwitch?: (newRole: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onMenuClick, 
  profile, 
  searchQuery, 
  setSearchQuery, 
  notices, 
  unreadNotices = 0, 
  onClearNotices,
  onNavigate,
  role = 'student',
  onRoleSwitch
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const isPrivileged = isPrivilegedTeamMember(profile.email) || profile.isPrivileged || profile.email?.includes('eduplan.local');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleNotifications = () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    if (newState && onClearNotices) {
      onClearNotices();
    }
  };

  const getSearchPlaceholder = () => {
    if (role === 'teacher') return 'Search student name, roll number, or circulars (⌘K)...';
    if (role === 'parent') return 'Search academic records, notices, or faculty (⌘K)...';
    return 'Search curriculum, modules, notes, or circulars (⌘K)...';
  };

  const getRoleTag = () => {
    if (role === 'teacher') return { label: 'Faculty Advisor', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' };
    if (role === 'parent') return { label: 'Parent / Guardian', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' };
    return { label: 'Student Cohort', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' };
  };

  const roleTag = getRoleTag();
  
  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Open Navigation Menu"
        >
          <Menu size={18} />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight leading-none truncate">
              {title}
            </h1>
            <span className={cn(
              "hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border",
              roleTag.color
            )}>
              {roleTag.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Academic Session 2025–26 • INFT Division 1
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Core Team Role Switcher */}
        {isPrivileged && onRoleSwitch && (
          <div className="hidden md:flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider px-2 flex items-center gap-1">
              <ShieldCheck size={12} /> Role:
            </span>
            {(['student', 'teacher', 'parent'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => onRoleSwitch(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer",
                  role === r
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                )}
              >
                {r === 'teacher' ? 'Faculty' : r}
              </button>
            ))}
          </div>
        )}

        {/* Global Search Bar */}
        <div className="relative hidden lg:block">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={15} />
          </div>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={getSearchPlaceholder()} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-14 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-xs w-56 xl:w-72 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-colors shadow-2xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-60">
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px] font-mono font-semibold text-slate-600 dark:text-slate-300">⌘K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Popover */}
          <div className="relative">
            <button 
              onClick={handleToggleNotifications}
              className={cn(
                "p-2 rounded-xl border transition-all relative cursor-pointer",
                showNotifications 
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
              )}
              title="Official Circulars & Notifications"
            >
              <Bell size={17} />
              {unreadNotices > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div 
                    onClick={() => setShowNotifications(false)}
                    className="fixed inset-0 z-40 bg-transparent"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                        <Bell size={14} className="text-indigo-600 dark:text-indigo-400" />
                        Official Circulars & Notices
                      </h3>
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-mono font-bold rounded-md border border-indigo-200 dark:border-indigo-800">
                        {notices.length} Total
                      </span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                      {notices.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">No recent notifications logged</p>
                        </div>
                      ) : (
                        notices.slice(0, 5).map((notice, i) => (
                          <div 
                            key={notice.id ? `${notice.id}-${i}` : `notice-${i}`} 
                            onClick={() => {
                              setShowNotifications(false);
                              if (onNavigate) onNavigate('notices');
                            }}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer text-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <Bell size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">{notice.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{notice.content}</p>
                                <p className="text-[10px] font-mono text-slate-400 pt-1">
                                  {notice.author} • {notice.date?.toDate ? notice.date.toDate().toLocaleDateString('en-GB') : 'Today'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
                      <button 
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        onClick={() => {
                          setShowNotifications(false);
                          if (onNavigate) onNavigate('notices');
                        }}
                      >
                        Open Complete Notice Board →
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="h-6 w-px bg-slate-200 dark:border-slate-800" />
          
          {/* Header Profile Shortcut */}
          <div 
            onClick={() => {
              if (onNavigate) onNavigate('settings');
            }}
            className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View Profile & Settings"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{profile.name}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase">{profile.role}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden shadow-2xs">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
