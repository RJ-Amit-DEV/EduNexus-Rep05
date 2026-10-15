import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { UserRole } from './types';
import { cn } from './lib/utils';

// --- Components (Code-Split via React.lazy for high performance) ---
import { Auth } from './components/Auth';
import { Sidebar, Header } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const StudentDashboard = React.lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const VideoFocusPlayer = React.lazy(() => import('./components/VideoFocusPlayer').then(m => ({ default: m.VideoFocusPlayer })));
const QuizZone = React.lazy(() => import('./components/QuizZone').then(m => ({ default: m.QuizZone })));
const Curriculum = React.lazy(() => import('./components/Curriculum').then(m => ({ default: m.Curriculum })));
const SmartScheduler = React.lazy(() => import('./components/SmartScheduler').then(m => ({ default: m.SmartScheduler })));
const TeacherDashboard = React.lazy(() => import('./components/Dashboards').then(m => ({ default: m.TeacherDashboard })));
const ParentDashboard = React.lazy(() => import('./components/Dashboards').then(m => ({ default: m.ParentDashboard })));
const NoticeBoard = React.lazy(() => import('./components/NoticeBoard').then(m => ({ default: m.NoticeBoard })));
const DoubtSolver = React.lazy(() => import('./components/DoubtSolver').then(m => ({ default: m.DoubtSolver })));
const ProfileSettings = React.lazy(() => import('./components/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const AboutDevelopers = React.lazy(() => import('./components/AboutDevelopers').then(m => ({ default: m.AboutDevelopers })));
const SmartNotes = React.lazy(() => import('./components/SmartNotes').then(m => ({ default: m.SmartNotes })));
const VisionBoard = React.lazy(() => import('./components/VisionBoard').then(m => ({ default: m.VisionBoard })));

import type { Notice } from './components/NoticeBoard';
import type { Message } from './components/DoubtSolver';
import { db, auth } from './firebase';
import { ProfileData, ConsistencyData } from './types';
import { DEFAULT_NOTICES, DEFAULT_MESSAGES, isPrivilegedTeamMember } from './constants';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { collection, onSnapshot, query, where, orderBy, limit, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';

const ModuleLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading Module...' }) => (
  <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="relative">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </p>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisionBoardOpen, setIsVisionBoardOpen] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    uid: '',
    name: '',
    email: '',
    role: 'student',
    avatar: '',
    about: '',
    college: '',
    course: '',
    semester: '',
    department: '',
    designation: '',
    experience: '',
    childName: '',
    relationship: '',
    contact: ''
  });

  const [consistencyData, setConsistencyData] = useState<ConsistencyData>({
    score: 0,
    attendance: 0,
    quizPassRate: 0,
    deadlinesMet: 0,
    studyHours: 0
  });

  const [childAcademicRecord, setChildAcademicRecord] = useState<any>(null);
  const [childConsistency, setChildConsistency] = useState<ConsistencyData | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const updateProfile = async (newData: Partial<ProfileData>) => {
    if (!user) return;
    
    try {
      const updatedProfile = { ...profileData, ...newData, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfileData(prev => ({ ...prev, ...newData }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  // Logic to calculate consistency score based on real data
  useEffect(() => {
    if (!user || !isLoggedIn || !auth.currentUser) return;

    const deadlinesPath = `users/${auth.currentUser.uid}/deadlines`;
    const q = query(collection(db, deadlinesPath));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.size;
      const completed = snapshot.docs.filter(doc => doc.data().completed).length;
      
      const completionRate = total > 0 ? (completed / total) * 100 : 80; // Default to 80 if no deadlines
      
      // Update consistency data
      setConsistencyData(prev => ({
        ...prev,
        deadlinesMet: Math.round(completionRate),
        // We can also derive other metrics if we have more data
      }));
    }, (error) => {
      console.error("Error fetching deadlines for score:", error);
    });

    return () => unsubscribe();
  }, [user, isLoggedIn]);

  useEffect(() => {
    const calculateScore = () => {
      const { attendance, quizPassRate, deadlinesMet, studyHours } = consistencyData;
      const normalizedStudyHours = Math.min((studyHours / 50) * 100, 100);
      
      const newScore = Math.round(
        (quizPassRate * 0.4) + 
        (attendance * 0.3) + 
        (deadlinesMet * 0.2) + 
        (normalizedStudyHours * 0.1)
      );
      
      if (consistencyData.score !== newScore) {
        setConsistencyData(prev => ({ ...prev, score: newScore }));
        
        // Persist to Firestore if logged in
        if (user && role === 'student') {
          updateProfile({ consistencyData: { ...consistencyData, score: newScore } } as any);
        }
      }
    };

    calculateScore();
  }, [consistencyData.attendance, consistencyData.quizPassRate, consistencyData.deadlinesMet, consistencyData.studyHours]);

  // Handle Parent-Child Data Sync
  useEffect(() => {
    if (!isLoggedIn || role !== 'parent' || !profileData.childName) {
      setChildAcademicRecord(null);
      setChildConsistency(null);
      return;
    }

    // 1. Find child's consistency data from their user document
    const usersQuery = query(collection(db, 'users'), where('name', '==', profileData.childName), limit(1));
    const unsubscribeChildUser = onSnapshot(usersQuery, (snapshot) => {
      if (!snapshot.empty) {
        const childDoc = snapshot.docs[0].data();
        if (childDoc.consistencyData) {
          setChildConsistency(childDoc.consistencyData);
        }
      }
    }, (error) => {
      console.warn("Child user sync note:", error);
    });

    // 2. Find child's academic record (IA marks) from teacher's students collection
    const studentsQuery = query(collection(db, 'students'), where('name', '==', profileData.childName), limit(1));
    const unsubscribeChildStudent = onSnapshot(studentsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const studentData = snapshot.docs[0].data();
        setChildAcademicRecord({
          rollNo: studentData.rollNo,
          sem4: studentData.sem4,
          ia1: studentData.ia1,
          ia2: studentData.ia2,
          batch: studentData.batch || "INFTT-1",
          college: studentData.college || "Institute of Engineering & Technology",
          course: studentData.course || "B.E. Information Technology"
        });
      }
    }, (error) => {
      console.warn("Child student sync note:", error);
    });

    return () => {
      unsubscribeChildUser();
      unsubscribeChildStudent();
    };
  }, [isLoggedIn, role, profileData.childName]);

  // Handle Student's Academic Record Sync (from Teacher's List)
  const [studentAcademicRecord, setStudentAcademicRecord] = useState<any>(null);
  useEffect(() => {
    if (!isLoggedIn || role !== 'student' || !profileData.name) {
      setStudentAcademicRecord(null);
      return;
    }

    const q = query(collection(db, 'students'), where('name', '==', profileData.name), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setStudentAcademicRecord(snapshot.docs[0].data());
      }
    }, (error) => {
      console.warn("Student academic record sync note:", error);
    });

    return () => unsubscribe();
  }, [isLoggedIn, role, profileData.name]);

  // Shared State for Notices and Doubt Solver
  const [notices, setNotices] = useState<Notice[]>(DEFAULT_NOTICES);
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({ notices: 0, doubts: 0 });
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Cleanup previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        // Listen to profile changes in real-time
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as ProfileData;
            setProfileData(userData);
            setRole(userData.role);
            setIsLoggedIn(true);
            setShowRoleSelection(false);
            
            // Set default tab based on role if on dashboard
            if (activeTab === 'dashboard') {
              if (userData.role === 'teacher') setActiveTab('my-class');
              else if (userData.role === 'parent') setActiveTab('performance');
            }
          } else {
            // New user, need to select role
            setIsLoggedIn(false);
            setShowRoleSelection(true);
          }
          setIsLoading(false);
        }, (error) => {
          // Only handle error if we still have a current user (to avoid logout race conditions)
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
          setIsLoading(false);
        });
      } else {
        // Check if there is an active local demo session
        const localUserStr = localStorage.getItem('eduplan_local_user');
        if (localUserStr) {
          try {
            const parsed = JSON.parse(localUserStr);
            if (parsed && parsed.role) {
              setProfileData(parsed);
              setRole(parsed.role);
              setIsLoggedIn(true);
              setShowRoleSelection(false);
              setIsLoading(false);
              if (parsed.role === 'parent') {
                setChildAcademicRecord({
                  rollNo: "INFTT-1-042",
                  name: "Aarav Sharma",
                  sem4: "9.24",
                  ia1: 19,
                  ia2: 18,
                  attendance: 92,
                  quizPass: 88,
                  batch: "INFTT-1",
                  college: "Institute of Engineering & Technology",
                  course: "B.E. Information Technology"
                });
              } else if (parsed.role === 'student') {
                setStudentAcademicRecord({
                  rollNo: "INFTT-1-042",
                  name: "Aarav Sharma",
                  sem4: "9.24",
                  ia1: 19,
                  ia2: 18,
                  attendance: 92,
                  quizPass: 88,
                  batch: "INFTT-1",
                  college: "Institute of Engineering & Technology",
                  course: "B.E. Information Technology"
                });
              }
              return;
            }
          } catch (e) {
            console.error("Failed to parse local demo user", e);
          }
        }

        setIsLoggedIn(false);
        setRole(null);
        setShowRoleSelection(false);
        setIsLoading(false);
        setProfileData({
          uid: '',
          name: '',
          email: '',
          role: 'student',
          avatar: '',
          about: '',
          college: '',
          course: '',
          semester: '',
          department: '',
          designation: '',
          experience: '',
          childName: '',
          relationship: '',
          contact: ''
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotices(DEFAULT_NOTICES);
      setMessages(DEFAULT_MESSAGES);
      setUnreadCounts({ notices: 0, doubts: 0 });
      return;
    }

    // Listen for notices with specific filters
    const noticesQuery = query(collection(db, 'notices'), orderBy('date', 'desc'), limit(50));
    const unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
      const seenIds = new Set<string>();
      const allNotices: Notice[] = [];
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        const baseId = doc.id || (data && data.id) || `notice-${idx}`;
        const uniqueId = seenIds.has(baseId) ? `${baseId}-${idx}` : baseId;
        seenIds.add(uniqueId);
        allNotices.push({
          ...data,
          id: uniqueId
        } as Notice);
      });
      
      // Filter notices based on role and target
      const filtered = allNotices.filter(n => {
        if (role === 'teacher') return true;
        
        // Defaults to 'all' if not specified (legacy notices)
        const audience = n.targetAudience || 'all';
        if (audience === 'all') return true;
        
        const targetRoll = n.targetRollNo ? String(n.targetRollNo).trim() : '';
        const userRoll = profileData.rollNo ? String(profileData.rollNo).trim() : '';
        
        if (role === 'student') {
          const studentRecRoll = studentAcademicRecord?.rollNo ? String(studentAcademicRecord.rollNo).trim() : '';
          if (audience === 'students') return true;
          if (audience === 'specific') {
            return targetRoll !== '' && (targetRoll === userRoll || targetRoll === studentRecRoll);
          }
        }
        
        if (role === 'parent') {
          const childRoll = childAcademicRecord?.rollNo ? String(childAcademicRecord.rollNo).trim() : '';
          if (audience === 'parents') return true;
          if (audience === 'specific') {
            // Parent sees notice if it targets their own roll (if any) or their child's roll
            return targetRoll !== '' && (targetRoll === userRoll || targetRoll === childRoll);
          }
        }
        return false;
      });
      
      setNotices(filtered.length > 0 ? filtered : DEFAULT_NOTICES);
    }, (error) => {
      console.warn("Firestore Notice Sync (using defaults):", error);
      setNotices(DEFAULT_NOTICES);
    });

    // Listen for messages
    const messagesQuery = query(collection(db, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const seenMsgIds = new Set<string>();
      const newMessages: Message[] = [];
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        const baseId = doc.id || (data && data.id) || `msg-${idx}`;
        const uniqueId = seenMsgIds.has(baseId) ? `${baseId}-${idx}` : baseId;
        seenMsgIds.add(uniqueId);
        newMessages.push({
          ...data,
          id: uniqueId
        } as Message);
      });
      setMessages(newMessages.length > 0 ? newMessages : DEFAULT_MESSAGES);
    }, (error) => {
      console.warn("Firestore Message Sync (using defaults):", error);
      setMessages(DEFAULT_MESSAGES);
    });

    return () => {
      unsubscribeNotices();
      unsubscribeMessages();
    };
  }, [isLoggedIn, role, profileData.rollNo, childAcademicRecord?.rollNo]);

  // Handle unread counts logic
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    // Reset unread counts when tab is active
    if (activeTab === 'notices') {
      if (notices.length > 0) {
        localStorage.setItem(`lastNoticeId_${user.uid}`, notices[0].id);
      }
      setUnreadCounts(prev => ({ ...prev, notices: 0 }));
    }
    if (activeTab === 'doubts') {
      if (messages.length > 0) {
        localStorage.setItem(`lastMessageId_${user.uid}`, messages[messages.length - 1].id);
      }
      setUnreadCounts(prev => ({ ...prev, doubts: 0 }));
    }

    // Calculate unread notices (only when not on the notices tab)
    if (notices.length > 0 && activeTab !== 'notices') {
      const lastId = localStorage.getItem(`lastNoticeId_${user.uid}`);
      if (lastId) {
        const index = notices.findIndex(n => n.id === lastId);
        setUnreadCounts(prev => ({ ...prev, notices: index === -1 ? notices.length : index }));
      } else {
        setUnreadCounts(prev => ({ ...prev, notices: notices.length }));
      }
    }

    // Calculate unread doubts (only when not on the doubts tab)
    if (messages.length > 0 && activeTab !== 'doubts') {
      const lastId = localStorage.getItem(`lastMessageId_${user.uid}`);
      if (lastId) {
        const index = messages.findLastIndex(m => m.id === lastId);
        setUnreadCounts(prev => ({ ...prev, doubts: index === -1 ? messages.length : messages.length - 1 - index }));
      } else {
        setUnreadCounts(prev => ({ ...prev, doubts: messages.length }));
      }
    }
  }, [isLoggedIn, activeTab, notices, messages, user?.uid]);

  const handleLogin = async (selectedRole: UserRole) => {
    try {
      let loggedInUser = auth.currentUser;
      
      if (!loggedInUser) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        loggedInUser = result.user;
      }
      
      // Check if profile exists
      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      
      if (!userDoc.exists()) {
        // Create initial profile
        const initialProfile: ProfileData = {
          uid: loggedInUser.uid,
          name: loggedInUser.displayName || 'New User',
          email: loggedInUser.email || '',
          role: selectedRole,
          avatar: loggedInUser.photoURL || '',
          about: `I am a ${selectedRole} at EduPlan AI.`,
          college: '',
          course: '',
          semester: '',
          department: '',
          designation: '',
          experience: '',
          childName: '',
          relationship: '',
          contact: ''
        };
        
        await setDoc(doc(db, 'users', loggedInUser.uid), {
          ...initialProfile,
          updatedAt: serverTimestamp()
        });
        
        setProfileData(initialProfile);
        setRole(selectedRole);
      } else {
        const userData = userDoc.data() as ProfileData;
        const isPrivileged = isPrivilegedTeamMember(loggedInUser.email) || isPrivilegedTeamMember(userData.email);

        // If privileged developer, allow any role selection smoothly
        if (isPrivileged) {
          const updatedProfile: ProfileData = {
            ...userData,
            role: selectedRole,
            isPrivileged: true,
            about: userData.about || `I am a ${selectedRole} at EduPlan AI.`,
            updatedAt: serverTimestamp()
          };
          try {
            await setDoc(doc(db, 'users', loggedInUser.uid), updatedProfile, { merge: true });
          } catch (e) {
            console.warn("Could not sync updated role to cloud, updating locally:", e);
          }
          setProfileData(updatedProfile);
          setRole(selectedRole);
        } else {
          // Normal users are bound to their single persistent role in the database
          setProfileData(userData);
          setRole(userData.role);
        }
      }
      
      setIsLoggedIn(true);
      setShowRoleSelection(false);
      setAuthError(null);
      
      const effectiveRole = isPrivilegedTeamMember(loggedInUser.email) ? selectedRole : (role || selectedRole);
      if (effectiveRole === 'teacher') setActiveTab('my-class');
      else if (effectiveRole === 'parent') setActiveTab('performance');
      else setActiveTab('dashboard');

      
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return; // User cancelled popup, ignore
      }
      console.error("Login Error:", error);
      
      let message = "Unable to sign in with Google.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "Firebase domain unauthorized: Ensure your browser is accessing http://localhost:3000 (not 127.0.0.1) or the authorized deployment URL.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Google Sign-In popup was blocked by your browser. Please allow popups for this domain to sign in.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Network connection failed. Please check your internet connectivity.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
    }
  };

  const handleTeamDirectLogin = async (teamEmail: string, selectedRole: UserRole) => {
    const teamMemberNames: Record<string, string> = {
      'amitjadhav4306@gmail.com': 'Prof. Amit Jadhav',
      'guptakunal4575@gmail.com': 'Kunal Gupta',
      'krishnagosavi880@gmail.com': 'Krishna Gosavi',
      'rushabhhirave@gmail.com': 'Rushabh Hirave'
    };

    const name = teamMemberNames[teamEmail.toLowerCase()] || teamEmail.split('@')[0];
    const uid = `dev-${teamEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    const devProfile: ProfileData = {
      uid,
      name,
      email: teamEmail,
      role: selectedRole,
      isPrivileged: true,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=256`,
      about: `Core Team Developer & ${selectedRole === 'teacher' ? 'Faculty Mentor' : selectedRole === 'parent' ? 'Academic Supervisor' : 'Lead Researcher'} at EduPlan AI.`,
      college: 'Institute of Engineering & Technology',
      course: 'B.E. Information Technology',
      department: 'Information Technology',
      designation: selectedRole === 'teacher' ? 'Associate Professor & Class In-charge' : 'Student Lead',
      experience: selectedRole === 'teacher' ? '15+ Years' : undefined,
      semester: selectedRole === 'student' ? 'Semester 4' : undefined,
      rollNo: selectedRole === 'student' ? 'INFTT-1-001' : undefined
    };

    try {
      if (db) {
        await setDoc(doc(db, 'users', uid), {
          ...devProfile,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Could not sync to cloud directly, storing locally:", e);
    }

    setProfileData(devProfile);
    setRole(selectedRole);
    setIsLoggedIn(true);
    setShowRoleSelection(false);
    setAuthError(null);
    localStorage.setItem('eduplan_local_user', JSON.stringify({ ...devProfile, isPrivileged: true }));

    if (selectedRole === 'teacher') setActiveTab('my-class');
    else if (selectedRole === 'parent') setActiveTab('performance');
    else setActiveTab('dashboard');
  };

  const handleDemoLogin = (selectedRole: UserRole) => {
    let demoProfile: ProfileData;
    if (selectedRole === 'teacher') {
      demoProfile = {
        uid: 'demo-faculty-01',
        name: 'Prof. Amit Jadhav',
        email: 'amit.jadhav@eduplan.local',
        role: 'teacher',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        about: 'Associate Professor & Class In-charge (INFT Division 1) with 15+ years of pedagogical experience.',
        college: 'Institute of Engineering & Technology',
        department: 'Information Technology',
        designation: 'Associate Professor & Class In-charge',
        experience: '15 Years'
      };
      setActiveTab('my-class');
    } else if (selectedRole === 'parent') {
      demoProfile = {
        uid: 'demo-parent-01',
        name: 'Sunita Sharma',
        email: 'sunita.sharma@eduplan.local',
        role: 'parent',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        about: 'Parent of Aarav Sharma (INFT Semester 4).',
        childName: 'Aarav Sharma',
        relationship: 'Mother',
        contact: '+91 98200 12345'
      };
      setChildAcademicRecord({
        rollNo: "INFTT-1-042",
        name: "Aarav Sharma",
        sem4: "9.24",
        ia1: 19,
        ia2: 18,
        attendance: 92,
        quizPass: 88,
        batch: "INFTT-1",
        college: "Institute of Engineering & Technology",
        course: "B.E. Information Technology"
      });
      setActiveTab('performance');
    } else {
      demoProfile = {
        uid: 'demo-student-01',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@eduplan.local',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        about: 'Information Technology student passionate about software architecture & AI.',
        college: 'Institute of Engineering & Technology',
        course: 'B.E. Information Technology',
        semester: 'Semester 4',
        rollNo: 'INFTT-1-042'
      };
      setStudentAcademicRecord({
        rollNo: "INFTT-1-042",
        name: "Aarav Sharma",
        sem4: "9.24",
        ia1: 19,
        ia2: 18,
        attendance: 92,
        quizPass: 88,
        batch: "INFTT-1",
        college: "Institute of Engineering & Technology",
        course: "B.E. Information Technology"
      });
      setActiveTab('dashboard');
    }

    setProfileData(demoProfile);
    setRole(selectedRole);
    setIsLoggedIn(true);
    setShowRoleSelection(false);
    setAuthError(null);
    localStorage.setItem('eduplan_local_user', JSON.stringify({ ...demoProfile, isLocalDemo: true }));
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('eduplan_local_user');
      if (auth.currentUser) {
        await signOut(auth);
      }
      setIsLoggedIn(false);
      setRole(null);
      setUser(null);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    const isPrivileged = isPrivilegedTeamMember(profileData.email) || profileData.isPrivileged || profileData.email?.includes('eduplan.local');
    if (!isPrivileged) return;

    setRole(newRole);
    const updatedProfile = {
      ...profileData,
      role: newRole,
      isPrivileged: true
    };
    setProfileData(updatedProfile);

    // If local demo session exists, persist there
    const localUserStr = localStorage.getItem('eduplan_local_user');
    if (localUserStr) {
      try {
        const parsed = JSON.parse(localUserStr);
        localStorage.setItem('eduplan_local_user', JSON.stringify({ ...parsed, role: newRole }));
      } catch (e) {}
    }

    // Set appropriate initial tab for target role
    if (newRole === 'teacher') setActiveTab('my-class');
    else if (newRole === 'parent') setActiveTab('performance');
    else setActiveTab('dashboard');

    // Sync to Firestore if authenticated
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { role: newRole, isPrivileged: true, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn("Could not sync role change to Firestore:", e);
      }
    }
  };

  const handleResetAccount = async () => {

    if (!user) return;
    
    const confirmReset = window.confirm(
      "Are you sure you want to reset your account? This will delete your profile and all your data (deadlines, schedules, notes). You will be logged out and can choose a new role next time."
    );
    
    if (!confirmReset) return;

    try {
      setIsLoading(true);
      // Delete user document
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Sign out
      await signOut(auth);
      
      // Reset local state
      setIsLoggedIn(false);
      setRole(null);
      setUser(null);
      setActiveTab('dashboard');
      
      alert("Account reset successfully. You can now log in again and choose a different role.");
    } catch (error) {
      console.error("Reset Account Error:", error);
      alert("Failed to reset account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthError(null);
      // onAuthStateChanged in useEffect will handle the rest
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return; // User cancelled, ignore
      }
      console.error("Sign In Error:", error);
      let message = "Unable to sign in with Google.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "Firebase domain unauthorized: Ensure your browser is accessing http://localhost:3000 (not 127.0.0.1) or the authorized deployment URL.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Google Sign-In popup was blocked by your browser. Please allow popups for this domain to sign in.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-300">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mb-8"
        >
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-900 dark:text-white font-display font-black text-xl tracking-tight">EduPlan AI</p>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Auth 
        onLogin={handleLogin} 
        onGoogleSignIn={handleGoogleSignIn} 
        onTeamDirectLogin={handleTeamDirectLogin}
        initialStep={showRoleSelection ? 'role' : 'landing'} 
        authError={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  const renderContent = () => {
    if (role === 'student') {
      switch (activeTab) {
        case 'dashboard': return <StudentDashboard onNavigate={setActiveTab} notices={notices} searchQuery={searchQuery} academicRecord={studentAcademicRecord} profileData={profileData} />;
        case 'quiz': return <QuizZone />;
        case 'video': return (
          <div className="p-8">
            <VideoFocusPlayer />
          </div>
        );
        case 'curriculum': return <Curriculum searchQuery={searchQuery} />;
        case 'scheduler': return <SmartScheduler searchQuery={searchQuery} />;
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={true} searchQuery={searchQuery} />;
        case 'doubts': return <DoubtSolver messages={messages} setMessages={setMessages} userRole="student" userName={profileData.name} searchQuery={searchQuery} />;
        case 'notes': return <SmartNotes />;
        case 'about-devs': return <AboutDevelopers />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <StudentDashboard onNavigate={setActiveTab} notices={notices} searchQuery={searchQuery} academicRecord={studentAcademicRecord} profileData={profileData} />;
      }
    } else if (role === 'teacher') {
      switch (activeTab) {
        case 'my-class': return <TeacherDashboard teacherName={profileData.name} searchQuery={searchQuery} notices={notices} />;
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={false} searchQuery={searchQuery} authorName={profileData.name} />;
        case 'doubts': return <DoubtSolver messages={messages} setMessages={setMessages} userRole="teacher" userName={profileData.name} searchQuery={searchQuery} />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <TeacherDashboard teacherName={profileData.name} searchQuery={searchQuery} />;
      }
    } else if (role === 'parent') {
      switch (activeTab) {
        case 'performance': return <ParentDashboard childData={childAcademicRecord} searchQuery={searchQuery} parentName={profileData.name} />;
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={true} searchQuery={searchQuery} />;
        case 'college-info':
        case 'blogs':
        case 'contact':
          return <ParentDashboard childData={childAcademicRecord} activeTab={activeTab} searchQuery={searchQuery} parentName={profileData.name} />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <ParentDashboard childData={childAcademicRecord} activeTab={activeTab} searchQuery={searchQuery} parentName={profileData.name} />;
      }
    }
    return null;
  };

  const getHeaderTitle = () => {
    if (role === 'student') {
      const titles: Record<string, string> = {
        dashboard: 'Student Dashboard',
        curriculum: 'My Curriculum',
        video: 'Video Focus Player',
        scheduler: 'Smart AI Scheduler',
        quiz: 'Interactive Quiz Zone',
        notices: 'Notice Board',
        doubts: 'Doubt Solver',
        notes: 'Smart Notes',
        'about-devs': 'About Developers',
        settings: 'Profile Settings'
      };
      return titles[activeTab] || 'EduPlan AI';
    }
    if (role === 'teacher') {
      const titles: Record<string, string> = {
        'my-class': 'My Class (INFTT-1)',
        notices: 'Notice Board',
        doubts: 'Doubt Solver',
        settings: 'Profile Settings'
      };
      return titles[activeTab] || 'Teacher Portal';
    }
    if (role === 'parent') {
      const titles: Record<string, string> = {
        performance: 'Student Performance',
        notices: 'Notice Board',
        'college-info': 'College & Course Info',
        blogs: 'Parenting & Mental Health Blogs',
        contact: 'Contact Faculty',
        settings: 'Profile Settings'
      };
      return titles[activeTab] || 'Parent Portal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <Sidebar 
        role={role!} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        unreadCounts={unreadCounts}
        onRoleSwitch={handleRoleSwitch}
        userEmail={profileData.email}
        profile={profileData}
      />
      
      <main className={cn(
        "flex-1 min-h-screen flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-20" : "lg:ml-72",
        "ml-0"
      )}>
        <Header 
          title={getHeaderTitle() || 'EduNexus Portal'} 
          role={role || 'student'}
          onMenuClick={() => setIsMobileMenuOpen(true)} 
          profile={profileData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notices={notices}
          unreadNotices={unreadCounts.notices}
          onNavigate={setActiveTab}
          onRoleSwitch={handleRoleSwitch}
          onClearNotices={() => {
            if (notices.length > 0 && user) {
              setUnreadCounts(prev => ({ ...prev, notices: 0 }));
              localStorage.setItem(`lastNoticeId_${user.uid}`, notices[0].id);
            }
          }}
        />

        
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (role || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <React.Suspense fallback={<ModuleLoadingFallback label={`Loading ${getHeaderTitle()}...`} />}>
                {renderContent()}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="p-8 border-t border-slate-200/80 dark:border-slate-800/80 text-center text-slate-400 text-xs">
          <p>© 2026 EduNexus - Unified Educational Management & Adaptive Learning Ecosystem. All rights reserved.</p>
        </footer>
      </main>

      {/* Role-Specific Action Hub (Global Floating Button) */}
      <motion.button
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (role === 'parent') setActiveTab('contact');
          else if (role === 'student') setIsVisionBoardOpen(true);
          else if (role === 'teacher') setActiveTab('notices');
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <MessageSquare size={24} className="relative z-10" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-slate-900 animate-pulse" />
        
        {/* Tooltip hint */}
        <div className="absolute bottom-full right-0 mb-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all whitespace-nowrap">
          {role === 'student' ? 'Daily Vision & Goals' : role === 'parent' ? 'Contact Faculty' : 'Quick Broadcast'}
        </div>
      </motion.button>

      {/* Student Vision Board Modal */}
      <React.Suspense fallback={null}>
        <VisionBoard 
          isOpen={isVisionBoardOpen} 
          onClose={() => setIsVisionBoardOpen(false)} 
        />
      </React.Suspense>
    </div>
  );
};

export default App;
