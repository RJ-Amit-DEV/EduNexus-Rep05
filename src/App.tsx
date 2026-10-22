import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { UserRole } from './types';
import { cn } from './lib/utils';

// --- Components (Code-Split via React.lazy for high performance) ---
import { Auth } from './components/Auth';
import { TopNavbar } from './components/Layout';
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
import { PortalLoginPayload } from './components/Auth';
import { db, auth } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ProfileData, ConsistencyData, Student } from './types';
import { DEFAULT_NOTICES, DEFAULT_MESSAGES, isPrivilegedTeamMember } from './constants';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { collection, onSnapshot, query, where, orderBy, limit, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithCustomToken,
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';

const getDemoStudentRecord = (): Student | null => {
  try {
    const cached = localStorage.getItem('eduplan_local_students');
    if (cached) {
      const students: Student[] = JSON.parse(cached);
      const matches = students.filter(student =>
        student.studentId?.trim().toUpperCase() === 'STU-4042' ||
        student.parentId?.trim().toUpperCase() === 'PAR-4042'
      );
      if (matches.length === 1) return { ...matches[0], cgpa: matches[0].cgpa ?? matches[0].sem4 ?? '' };
      if (matches.length > 1) {
        console.error('Demo student IDs are duplicated; refusing to display ambiguous academic data.');
      }
      return null;
    }
  } catch (error) {
    console.warn('Unable to read the local demo student record:', error);
  }

  return {
    rollNo: 'INFTT-1-042',
    studentId: 'STU-4042',
    parentId: 'PAR-4042',
    name: 'Aarav Sharma',
    cgpa: '9.24',
    ia1: 19,
    ia2: 18,
    attendance: 92,
    quizPass: 88,
    batch: 'INFTT-1',
    college: 'Institute of Engineering & Technology',
    course: 'B.E. Information Technology'
  } as Student;
};

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
  const [studentAcademicRecord, setStudentAcademicRecord] = useState<any>(null);
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

  // Parent academic records are available only to an authenticated parent whose trusted
  // profile is linked to both the exact Parent ID and Student ID.
  useEffect(() => {
    if (!isLoggedIn || role !== 'parent') {
      setChildAcademicRecord(null);
      return;
    }
    if (profileData.uid.startsWith('demo-')) return;

    const studentDocId = (profileData as any).childStudentDocId;
    if (!auth.currentUser || auth.currentUser.uid !== profileData.uid || !studentDocId) {
      setChildAcademicRecord(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'students', studentDocId), snapshot => {
      setChildAcademicRecord(snapshot.exists() ? { id: snapshot.id, ...snapshot.data(), cgpa: snapshot.data().cgpa ?? snapshot.data().sem4 ?? '' } as Student : null);
    }, error => {
      console.error('Parent academic record access failed:', error);
      setChildAcademicRecord(null);
    });
    return () => unsubscribe();
  }, [isLoggedIn, role, profileData.uid, (profileData as any).childStudentDocId]);

  // Handle Student's Academic Record Sync (from Teacher's List)
  useEffect(() => {
    if (!isLoggedIn || role !== 'student') {
      return;
    }

    const studentDocId = (profileData as any).studentDocId;
    if (!auth.currentUser || auth.currentUser.uid !== profileData.uid || !studentDocId) {
      setStudentAcademicRecord(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'students', studentDocId), snapshot => {
      setStudentAcademicRecord(snapshot.exists() ? { id: snapshot.id, ...snapshot.data(), cgpa: snapshot.data().cgpa ?? snapshot.data().sem4 ?? '' } as Student : null);
    }, error => {
      console.error('Student academic record sync failed:', error);
      setStudentAcademicRecord(null);
    });
    return () => unsubscribe();
  }, [isLoggedIn, role, profileData.uid, (profileData as any).studentDocId]);

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
              // Restore only the explicitly labelled demo fixtures. Real portal sessions resolve by exact IDs.
              setChildAcademicRecord(null);
              setStudentAcademicRecord(null);
              if (parsed.uid === 'demo-parent-01') {
                setChildAcademicRecord(getDemoStudentRecord());
              } else if (parsed.uid === 'demo-student-01') {
                setStudentAcademicRecord(getDemoStudentRecord());
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
    // Demo/team portal sessions may be local-only and have no Firebase Auth identity.
    // Do not start Firestore listeners for those sessions; doing so creates predictable
    // permission errors and misleading "using defaults" warnings.
    if (!isLoggedIn || !auth.currentUser) {
      setNotices(DEFAULT_NOTICES);
      setMessages(DEFAULT_MESSAGES);
      setUnreadCounts({ notices: 0, doubts: 0 });
      return;
    }

    // Enrollment/profile snapshots can arrive one render after Firebase Auth changes.
    // Never pass an undefined classCode into a Firestore where() constraint.
    const classCode = typeof profileData.classCode === 'string' ? profileData.classCode.trim() : '';
    if (!classCode) {
      setNotices([]);
      setMessages([]);
      setUnreadCounts({ notices: 0, doubts: 0 });
      return;
    }

    // Query only audiences the signed-in role is permitted to read.
    // Firestore rules do not filter query results; each query must be authorized as a whole.
    const noticeCollection = collection(db, 'notices');
    const audienceQueries = role === 'teacher'
      ? [query(noticeCollection, where('classCode', '==', classCode), orderBy('date', 'desc'), limit(50))]
      : role === 'student'
        ? [
            query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'all'), orderBy('date', 'desc'), limit(50)),
            query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'students'), orderBy('date', 'desc'), limit(50)),
            query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'specific'), where('recipientUids', 'array-contains', auth.currentUser.uid), orderBy('date', 'desc'), limit(50))
          ]
        : role === 'parent'
          ? [
              query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'all'), orderBy('date', 'desc'), limit(50)),
              query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'parents'), orderBy('date', 'desc'), limit(50)),
              query(noticeCollection, where('classCode', '==', classCode), where('targetAudience', '==', 'specific'), where('recipientUids', 'array-contains', auth.currentUser.uid), orderBy('date', 'desc'), limit(50))
            ]
          : [];

    const noticeSnapshotsByQuery: Map<string, Notice>[] = audienceQueries.map(() => new Map<string, Notice>());
    const unsubscribeNotices = audienceQueries.map((noticeQuery, queryIndex) =>
      onSnapshot(noticeQuery, (snapshot) => {
        const currentQueryNotices = new Map<string, Notice>();
        snapshot.docs.forEach((noticeDoc) => {
          currentQueryNotices.set(noticeDoc.id, { ...noticeDoc.data(), id: noticeDoc.id } as Notice);
        });
        noticeSnapshotsByQuery[queryIndex] = currentQueryNotices;
        const mergedById = new Map<string, Notice>();
        noticeSnapshotsByQuery.forEach((queryNotices) => queryNotices.forEach((notice, id) => mergedById.set(id, notice)));
        const merged = Array.from(mergedById.values()).sort((left, right) => {
          const leftDate = left.date?.toMillis?.() ?? 0;
          const rightDate = right.date?.toMillis?.() ?? 0;
          return rightDate - leftDate;
        });
        setNotices(merged);
      }, (error) => {
        console.warn('Firestore notice audience query failed:', error);
        noticeSnapshotsByQuery[queryIndex].clear();
        const mergedById = new Map<string, Notice>();
        noticeSnapshotsByQuery.forEach((queryNotices) => queryNotices.forEach((notice, id) => mergedById.set(id, notice)));
        setNotices(Array.from(mergedById.values()));
      })
    );

    // Parents do not have access to classroom discussion messages.
    let unsubscribeMessages = () => {};
    if (role === 'teacher' || role === 'student') {
      const messagesQuery = query(collection(db, 'messages'), where('classCode', '==', classCode), orderBy('createdAt', 'asc'), limit(100));
      unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const seenMsgIds = new Set<string>();
        const newMessages: Message[] = [];
        snapshot.docs.forEach((messageDoc, idx) => {
          const data = messageDoc.data();
          const baseId = messageDoc.id || (data && data.id) || `msg-${idx}`;
          const uniqueId = seenMsgIds.has(baseId) ? `${baseId}-${idx}` : baseId;
          seenMsgIds.add(uniqueId);
          newMessages.push({ ...data, id: uniqueId } as Message);
        });
        setMessages(newMessages);
      }, (error) => {
        console.warn('Firestore message sync failed:', error);
        setMessages([]);
      });
    } else {
      setMessages([]);
    }

    return () => {
      unsubscribeNotices.forEach((unsubscribe) => unsubscribe());
      unsubscribeMessages();
    };
  }, [isLoggedIn, role, profileData.classCode, profileData.rollNo, childAcademicRecord?.rollNo]);

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

  const handleSwitchParentId = async (inputKey: string) => {
    const cleanKey = inputKey.trim().toUpperCase();
    if (!cleanKey) return;

    // Only the explicitly labelled demo may switch sample children. Real parents cannot
    // select a child by guessing another parent's short access code.
    if (!profileData.uid.startsWith('demo-')) {
      setAuthError('A parent-child link must be verified by the institution. Contact the school administrator to correct your linked student record.');
      return;
    }

    try {
      const localStr = localStorage.getItem('eduplan_local_students');
      const list: Student[] = localStr ? JSON.parse(localStr) : [];
      const matches = list.filter(student => student.parentId?.trim().toUpperCase() === cleanKey);
      if (matches.length !== 1) {
        setChildAcademicRecord(null);
        setAuthError(matches.length > 1 ? 'This demo Parent Access ID is duplicated.' : 'No demo student record found for that Parent Access ID.');
        return;
      }
      setChildAcademicRecord(matches[0]);
      setAuthError(null);
    } catch {
      setChildAcademicRecord(null);
      setAuthError('Unable to load the demo student record.');
    }
  };

  const handleLogin = async (selectedRole: UserRole, payload?: PortalLoginPayload) => {
    try {
      if (!payload) throw new Error('Enter the access details required for this portal.');
      setAuthError(null);
      const cleanName = payload.name?.trim();
      const functions = getFunctions(auth.app, 'us-central1');
      let signedInUser: User;
      let result: any;

      if (selectedRole === 'teacher') {
        let current = auth.currentUser;
        if (current) {
          const existingProfile = await getDoc(doc(db, 'users', current.uid));
          if (!existingProfile.exists() || existingProfile.data().role !== 'teacher') {
            await signOut(auth);
            current = null;
          }
        }
        signedInUser = current || (await signInWithPopup(auth, new GoogleAuthProvider())).user;
        const teacherInviteCode = payload.classCode?.trim().toUpperCase() || '';
        result = await httpsCallable(functions, 'createTeacherClass')({
          displayName: cleanName || signedInUser.displayName || 'Teacher',
          teacherInviteCode
        });
      } else {
        const accessCode = selectedRole === 'student'
          ? payload.studentAccessCode?.trim().toUpperCase()
          : payload.parentAccessCode?.trim().toUpperCase();
        if (!accessCode) throw new Error(selectedRole === 'student'
          ? 'Enter the unique student login code supplied by your teacher.'
          : 'Enter the parent access code supplied by your teacher.');
        result = await httpsCallable(functions, 'redeemPortalAccessCode')({
          role: selectedRole,
          accessCode,
          displayName: cleanName || 'Parent / Guardian'
        });
        const customToken = (result.data as { customToken?: string }).customToken;
        if (!customToken) throw new Error('The access service did not return a sign-in token. Please try again.');
        signedInUser = (await signInWithCustomToken(auth, customToken)).user;
      }

      const data = result.data as { classCode?: string; studentDocId?: string };
      const profileSnap = await getDoc(doc(db, 'users', signedInUser.uid));
      if (!profileSnap.exists()) throw new Error('Access was verified, but the user profile was not created. Please contact the administrator.');
      const trustedProfile = profileSnap.data() as ProfileData;
      if (trustedProfile.role !== selectedRole) throw new Error('This access credential is registered for a different portal.');

      if (selectedRole === 'student' || selectedRole === 'parent') {
        const studentDocId = data.studentDocId || (selectedRole === 'student' ? (trustedProfile as any).studentDocId : (trustedProfile as any).childStudentDocId);
        if (!studentDocId) throw new Error('No trusted student enrollment is linked to this account.');
        const studentSnap = await getDoc(doc(db, 'students', studentDocId));
        if (!studentSnap.exists()) throw new Error('The linked student record could not be found. Contact your teacher.');
        const record = { id: studentSnap.id, ...studentSnap.data(), cgpa: studentSnap.data().cgpa ?? studentSnap.data().sem4 ?? '' } as Student;
        if (selectedRole === 'student') setStudentAcademicRecord(record); else setChildAcademicRecord(record);
      }

      setProfileData(trustedProfile);
      setRole(selectedRole);
      setIsLoggedIn(true);
      setShowRoleSelection(false);
      setAuthError(null);
      setActiveTab(selectedRole === 'teacher' ? 'my-class' : selectedRole === 'parent' ? 'performance' : 'dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
      console.error('Secure portal sign-in failed:', error);
      const code = String(error.code || '');
      if (code === 'auth/unauthorized-domain') setAuthError('This website domain is not authorized for teacher Google sign-in in Firebase Authentication.');
      else if (code === 'functions/unavailable' || code === 'functions/internal') setAuthError('The access service is unavailable. Confirm Firebase Cloud Functions are deployed to us-central1.');
      else if (code === 'auth/popup-blocked') setAuthError('Google sign-in popup was blocked. Allow popups and try again.');
      else setAuthError(error.message || 'Unable to verify this portal access code.');
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
        childStudentId: 'STU-4042',
        parentId: 'PAR-4042',
        relationship: 'Mother',
        contact: '+91 98200 12345'
      };
      setChildAcademicRecord(getDemoStudentRecord());
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
        rollNo: 'INFTT-1-042',
        studentId: 'STU-4042',
        parentId: 'PAR-4042'
      };
      setStudentAcademicRecord(getDemoStudentRecord());
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
    // Privilege must come from the trusted team-email allowlist, not editable client profile data.
    const isPrivileged = isPrivilegedTeamMember(profileData.email);
    if (!isPrivileged) return;

    setRole(newRole);
    const updatedProfile = {
      ...profileData,
      role: newRole,
      isPrivileged: isPrivilegedTeamMember(profileData.email)
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
        await setDoc(doc(db, 'users', user.uid), { role: newRole, isPrivileged: isPrivilegedTeamMember(profileData.email), updatedAt: serverTimestamp() }, { merge: true });
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

  const handleGoogleSignIn = async (selectedRole: UserRole, payload: PortalLoginPayload) => {
    await handleLogin(selectedRole, payload);
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
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={true} searchQuery={searchQuery} classCode={profileData.classCode || ''} />;
        case 'doubts': return <DoubtSolver messages={messages} setMessages={setMessages} userRole="student" userName={profileData.name} classCode={profileData.classCode || ''} searchQuery={searchQuery} />;
        case 'notes': return <SmartNotes />;
        case 'about-devs': return <AboutDevelopers />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <StudentDashboard onNavigate={setActiveTab} notices={notices} searchQuery={searchQuery} academicRecord={studentAcademicRecord} profileData={profileData} />;
      }
    } else if (role === 'teacher') {
      switch (activeTab) {
        case 'my-class': return <TeacherDashboard teacherName={profileData.name} classCode={profileData.classCode || ''} searchQuery={searchQuery} notices={notices} />;
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={false} searchQuery={searchQuery} authorName={profileData.name} classCode={profileData.classCode || ''} />;
        case 'doubts': return <DoubtSolver messages={messages} setMessages={setMessages} userRole="teacher" userName={profileData.name} classCode={profileData.classCode || ''} searchQuery={searchQuery} />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <TeacherDashboard teacherName={profileData.name} classCode={profileData.classCode || ''} searchQuery={searchQuery} />;
      }
    } else if (role === 'parent') {
      switch (activeTab) {
        case 'performance': return <ParentDashboard childData={childAcademicRecord} searchQuery={searchQuery} parentName={profileData.name} parentId={profileData.parentId} studentId={profileData.childStudentId} onSwitchParentId={handleSwitchParentId} allowDemoLinking={profileData.uid.startsWith('demo-')} />;
        case 'notices': return <NoticeBoard notices={notices} setNotices={setNotices} isReadOnly={true} searchQuery={searchQuery} classCode={profileData.classCode || ''} />;
        case 'college-info':
        case 'blogs':
        case 'contact':
          return <ParentDashboard childData={childAcademicRecord} activeTab={activeTab} searchQuery={searchQuery} parentName={profileData.name} parentId={profileData.parentId} studentId={profileData.childStudentId} onSwitchParentId={handleSwitchParentId} allowDemoLinking={profileData.uid.startsWith('demo-')} />;
        case 'settings': return <ProfileSettings profile={profileData} onUpdate={updateProfile} onResetAccount={handleResetAccount} onRoleSwitch={handleRoleSwitch} />;
        default: return <ParentDashboard childData={childAcademicRecord} activeTab={activeTab} searchQuery={searchQuery} parentName={profileData.name} parentId={profileData.parentId} studentId={profileData.childStudentId} onSwitchParentId={handleSwitchParentId} allowDemoLinking={profileData.uid.startsWith('demo-')} />;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 w-full">
      <TopNavbar 
        role={role!} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        unreadCounts={unreadCounts}
        onRoleSwitch={handleRoleSwitch}
        userEmail={profileData.email}
        profile={profileData}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notices={notices}
        unreadNotices={unreadCounts.notices}
        onClearNotices={() => {
          if (notices.length > 0 && user) {
            setUnreadCounts(prev => ({ ...prev, notices: 0 }));
            localStorage.setItem(`lastNoticeId_${user.uid}`, notices[0].id);
          }
        }}
      />
      
      <main className="flex-1 min-h-screen flex flex-col w-full">

        
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

        <footer className="p-8 border-t border-slate-200/80 dark:border-slate-800/80 text-center text-slate-400 text-xs overflow-hidden">
          <p className="font-medium text-slate-500 dark:text-slate-400">© 2026 EduNexus - Unified Educational Management & Adaptive Learning Ecosystem. All rights reserved.</p>
          <div className="mt-6 select-none pointer-events-none text-center">
            <span className="text-[7vw] font-black tracking-widest text-slate-200/60 dark:text-slate-800/40 uppercase leading-none block">
              EDUNEXUS
            </span>
          </div>
        </footer>
      </main>

      {/* Role-Specific Action Hub (Global Floating Button) */}
      <motion.button
        type="button"
        aria-label={role === 'student' ? 'Open My Academic Goals' : role === 'parent' ? 'Contact Faculty' : 'Open Quick Broadcast'}
        title={role === 'student' ? 'My Academic Goals' : role === 'parent' ? 'Contact Faculty' : 'Quick Broadcast'}
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
