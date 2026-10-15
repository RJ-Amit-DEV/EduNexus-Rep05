import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Bell, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Search,
  Filter,
  Download,
  Calendar,
  Heart,
  Activity,
  Award,
  Save,
  BookOpen,
  Loader2,
  CheckCircle,
  History,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Check,
  X,
  Send,
  Brain,
  HeartHandshake,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { STUDENT_PERFORMANCE } from '../constants';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, setDoc, getDocs, addDoc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import { ConsistencyData } from '../types';
import { Notice } from './NoticeBoard';

interface Student {
  id: string;
  rollNo: string;
  name: string;
  sem4: string;
  ia1: number;
  ia2: number;
  attendance: number;
  quizPass: number;
}

const generateInitialStudents = () => {
  const students = [];
  const names = [
    "Aarav", "Aditi", "Advait", "Akash", "Ananya", "Arjun", "Avni", "Bhavya", "Chaitanya", "Deepak",
    "Esha", "Gaurav", "Ishani", "Kabir", "Kavya", "Manish", "Meera", "Nikhil", "Pooja", "Pranav",
    "Riya", "Rohan", "Saanvi", "Sameer", "Shreya", "Tushar", "Vanya", "Varun", "Vihaan", "Zoya"
  ];
  const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Joshi", "Patil", "Deshmukh", "Kulkarni", "Iyer", "Nair"];

  for (let i = 1; i <= 120; i++) {
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      students.push({
        id: `student-initial-${i}`,
        rollNo: `INFTT-1-${i.toString().padStart(3, '0')}`,
        name: `${firstName} ${lastName}`,
        sem4: (Math.random() * (10 - 6) + 6).toFixed(2),
        ia1: Math.floor(Math.random() * 21),
        ia2: Math.floor(Math.random() * 21),
        attendance: Math.floor(Math.random() * 41) + 60, // 60-100%
        quizPass: Math.floor(Math.random() * 31) + 70   // 70-100%
      });
  }
  return students;
};

const classEngagementData = [
  { name: '8 AM', value: 45 },
  { name: '10 AM', value: 85 },
  { name: '12 PM', value: 75 },
  { name: '2 PM', value: 90 },
  { name: '4 PM', value: 65 },
  { name: '6 PM', value: 40 },
];

const performanceData = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 68 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 82 },
  { name: 'Sat', score: 90 },
  { name: 'Sun', score: 88 },
];

const gradeDistribution = [
  { name: 'A+', value: 15, color: '#10B981' },
  { name: 'A', value: 35, color: '#4F46E5' },
  { name: 'B', value: 30, color: '#8B5CF6' },
  { name: 'C', value: 15, color: '#F59E0B' },
  { name: 'D', value: 5, color: '#F43F5E' },
];

interface TeacherDashboardProps {
  teacherName?: string;
  searchQuery?: string;
  notices?: Notice[];
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacherName = 'Prof. Amit Jadhav', searchQuery = '', notices = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState({ name: '', rollNo: '', sem4: '', ia1: 0, ia2: 0, attendance: 0, quizPass: 0 });

  // Sync internal searchTerm with global searchQuery
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    let unsubscribeStudents: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        const localCached = localStorage.getItem('eduplan_local_students');
        if (localCached) {
          try {
            setStudents(JSON.parse(localCached));
          } catch {
            const initial = generateInitialStudents();
            setStudents(initial);
            localStorage.setItem('eduplan_local_students', JSON.stringify(initial));
          }
        } else {
          const initial = generateInitialStudents();
          setStudents(initial);
          localStorage.setItem('eduplan_local_students', JSON.stringify(initial));
        }
        return;
      }

      const seedData = async () => {
        const hasSeeded = localStorage.getItem('students_seeded');
        if (hasSeeded) return;

        try {
          const snapshot = await getDocs(query(collection(db, 'students'), limit(1)));
          if (snapshot.empty) {
            localStorage.setItem('students_seeded', 'true');
            const initialData = generateInitialStudents();
            const batch = writeBatch(db);
            initialData.forEach((s) => {
              const newDocRef = doc(collection(db, 'students'));
              batch.set(newDocRef, s);
            });
            await batch.commit();
          } else {
            localStorage.setItem('students_seeded', 'true');
          }
        } catch (err) {
          console.error("Error seeding students:", err);
        }
      };

      await seedData();

      const q = query(collection(db, 'students'), orderBy('rollNo', 'asc'));
      unsubscribeStudents = onSnapshot(q, (snapshot) => {
        const seenIds = new Set<string>();
        const studentData: Student[] = [];
        snapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          const baseId = doc.id || (data && (data as any).id) || `student-${idx}`;
          const uniqueId = seenIds.has(baseId) ? `${baseId}-${idx}` : baseId;
          seenIds.add(uniqueId);
          studentData.push({
            ...data,
            id: uniqueId
          } as Student);
        });
        setStudents(studentData);
      }, (error) => {
        console.error("Firestore Error (students):", error);
        if (error.code === 'permission-denied') {
          setStudents([]);
        }
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, []);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateStudent = async (id: string) => {
    try {
      await updateDoc(doc(db, 'students', id), {
        name: editStudent.name,
        rollNo: editStudent.rollNo,
        sem4: editStudent.sem4,
        ia1: editStudent.ia1,
        ia2: editStudent.ia2,
        attendance: editStudent.attendance,
        quizPass: editStudent.quizPass
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating student record:", error);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "INFTT-1 Students");
    XLSX.writeFile(workbook, "INFTT-1_Student_List.xlsx");
  };

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'parents' | 'specific'>('all');
  const [targetRollNo, setTargetRollNo] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  
  // Table filtering and pagination state
  const [tableFilter, setTableFilter] = useState<'all' | 'at-risk' | 'remedial' | 'honors'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;
  const [reportGenerated, setReportGenerated] = useState(false);

  const handlePostNotice = async () => {
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'notices'), {
        title: noticeTitle,
        content: noticeContent,
        date: serverTimestamp(),
        author: teacherName,
        type: 'Academic',
        attachments: [],
        targetAudience,
        targetRollNo: targetAudience === 'specific' ? targetRollNo : null
      });
      setNoticeTitle('');
      setNoticeContent('');
      setTargetRollNo('');
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (error) {
      console.error("Error posting notice:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Metrics calculations
  const totalStudents = students.length || 1;
  const avgSem4 = (students.reduce((acc, s) => acc + parseFloat(s.sem4 || '0'), 0) / totalStudents).toFixed(2);
  const avgIa1 = (students.reduce((acc, s) => acc + (s.ia1 || 0), 0) / totalStudents).toFixed(1);
  const avgIa2 = (students.reduce((acc, s) => acc + (s.ia2 || 0), 0) / totalStudents).toFixed(1);
  const ia1PassCount = students.filter(s => (s.ia1 || 0) >= 8).length;
  const ia1PassPct = ((ia1PassCount / totalStudents) * 100).toFixed(0);
  const avgAttendance = (students.reduce((acc, s) => acc + (s.attendance || 0), 0) / totalStudents).toFixed(1);
  const atRiskAttendanceCount = students.filter(s => (s.attendance || 0) < 75).length;
  const remedialCount = students.filter(s => (s.ia1 || 0) < 8).length;
  const honorsCount = students.filter(s => (s.ia1 || 0) >= 15 && (s.ia2 || 0) >= 15).length;

  // Grade breakdown
  const gradeBreakdown = [
    { label: 'Excellent (15–20)', count: students.filter(s => s.ia1 >= 15).length, color: '#10B981' },
    { label: 'Good (10–14)', count: students.filter(s => s.ia1 >= 10 && s.ia1 < 15).length, color: '#4F46E5' },
    { label: 'Average (8–9)', count: students.filter(s => s.ia1 >= 8 && s.ia1 < 10).length, color: '#F59E0B' },
    { label: 'Remedial (<8)', count: students.filter(s => s.ia1 < 8).length, color: '#EF4444' },
  ];

  // Filtered students for Table
  const tableStudents = React.useMemo(() => {
    return filteredStudents.filter(s => {
      if (tableFilter === 'at-risk') return (s.attendance || 0) < 75;
      if (tableFilter === 'remedial') return (s.ia1 || 0) < 8;
      if (tableFilter === 'honors') return (s.ia1 || 0) >= 15 && (s.ia2 || 0) >= 15;
      return true;
    });
  }, [filteredStudents, tableFilter]);

  const totalPages = Math.max(1, Math.ceil(tableStudents.length / pageSize));
  const paginatedStudents = tableStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Formal Institutional Header */}
      <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                Dept. of Information Technology
              </span>
              <span>•</span>
              <span>Academic Year 2025–26</span>
              <span>•</span>
              <span>Semester IV</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Class Academic Portal: Division INFT-1
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Class Advisor: <span className="font-semibold text-slate-900 dark:text-slate-200">{teacherName}</span> • Total Registered Strength: <span className="font-semibold text-slate-900 dark:text-slate-200">{students.length} Students</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
              title="Download full student grade sheet in Microsoft Excel format"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              Export Roster (.XLSX)
            </button>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Synced
            </div>
          </div>
        </div>
      </header>

      {/* Formal Key Academic Indicators */}
      <section aria-label="Key Academic Indicators" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Sem-4 SGPI</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{avgSem4}</span>
            <span className="text-xs font-medium text-slate-400">/ 10.0</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp size={13} /> +0.28 vs Sem 3
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. IA-1 Score</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{avgIa1}</span>
            <span className="text-xs font-medium text-slate-400">/ 20.0</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Passing Benchmark: 8.0
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. IA-2 Score</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{avgIa2}</span>
            <span className="text-xs font-medium text-slate-400">/ 20.0</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            Evaluated for {students.length} students
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">IA-1 Clearance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{ia1PassPct}%</span>
            <span className="text-xs font-medium text-slate-400">({ia1PassCount}/{students.length})</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {remedialCount} need remedial
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Attendance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{avgAttendance}%</span>
            <span className="text-xs font-medium text-slate-400">avg</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {atRiskAttendanceCount} below 75% norm
          </p>
        </div>
      </section>





      {/* STUDENT RECORDS DIRECTORY / ROSTER TABLE */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Official Student Academic & Attendance Register
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive student marks, continuous evaluation scores, and attendance record
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium">
              <button
                onClick={() => { setTableFilter('all'); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded transition-colors",
                  tableFilter === 'all'
                    ? "bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                All ({filteredStudents.length})
              </button>
              <button
                onClick={() => { setTableFilter('at-risk'); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded transition-colors",
                  tableFilter === 'at-risk'
                    ? "bg-white dark:bg-slate-900 font-bold text-amber-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                Attendance &lt;75% ({atRiskAttendanceCount})
              </button>
              <button
                onClick={() => { setTableFilter('remedial'); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded transition-colors",
                  tableFilter === 'remedial'
                    ? "bg-white dark:bg-slate-900 font-bold text-rose-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                Remedial Needed ({remedialCount})
              </button>
              <button
                onClick={() => { setTableFilter('honors'); setCurrentPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded transition-colors",
                  tableFilter === 'honors'
                    ? "bg-white dark:bg-slate-900 font-bold text-emerald-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                High Achievers ({honorsCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search roll or student name..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Structured Academic Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Student Full Name</th>
                <th className="px-4 py-3">Sem 4 SGPI</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Quiz Pass %</th>
                <th className="px-4 py-3">IA-1 (Max 20)</th>
                <th className="px-4 py-3">IA-2 (Max 20)</th>
                <th className="px-4 py-3">Evaluation Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedStudents.map((student, idx) => {
                const isEditing = editingId === student.id;
                const isRemedial = student.ia1 < 8;
                const isLowAttendance = student.attendance < 75;

                return (
                  <tr 
                    key={student.id ? `${student.id}-${idx}` : `student-${idx}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editStudent.rollNo}
                          onChange={(e) => setEditStudent({ ...editStudent, rollNo: e.target.value })}
                          className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs"
                        />
                      ) : (
                        student.rollNo
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editStudent.name}
                          onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                          className="w-48 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                        />
                      ) : (
                        student.name
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editStudent.sem4}
                          onChange={(e) => setEditStudent({ ...editStudent, sem4: e.target.value })}
                          className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      ) : (
                        student.sem4
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editStudent.attendance}
                          onChange={(e) => setEditStudent({ ...editStudent, attendance: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="100"
                          className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      ) : (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-bold font-mono inline-block",
                          student.attendance >= 75
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                        )}>
                          {student.attendance}%
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editStudent.quizPass}
                          onChange={(e) => setEditStudent({ ...editStudent, quizPass: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="100"
                          className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      ) : (
                        `${student.quizPass || 0}%`
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editStudent.ia1}
                          onChange={(e) => setEditStudent({ ...editStudent, ia1: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="20"
                          className="w-14 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      ) : (
                        <span className={student.ia1 >= 8 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 font-extrabold"}>
                          {student.ia1}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editStudent.ia2}
                          onChange={(e) => setEditStudent({ ...editStudent, ia2: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="20"
                          className="w-14 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200">
                          {student.ia2}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {isRemedial ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800">
                          Remedial
                        </span>
                      ) : isLowAttendance ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                          Attendance Shortage
                        </span>
                      ) : student.ia1 >= 15 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                          High Honors
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          Good Standing
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleUpdateStudent(student.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="Save Changes"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-400"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingId(student.id);
                            setEditStudent({ 
                              name: student.name, 
                              rollNo: student.rollNo, 
                              sem4: student.sem4, 
                              ia1: student.ia1, 
                              ia2: student.ia2,
                              attendance: student.attendance || 0,
                              quizPass: student.quizPass || 0
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tableStudents.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-xs">
              No student records match the active criteria.
            </div>
          )}
        </div>

        {/* Formal Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, tableStudents.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{tableStudents.length}</strong> enrolled students
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors font-medium text-xs"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="font-mono text-xs px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors font-medium text-xs"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 2. GRADE DISTRIBUTION (Full Width Formal Section directly below Register) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Grade Distribution & IA-1 Score Bracket Analysis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive statistical spread across all {students.length} registered students
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold rounded border border-slate-200 dark:border-slate-700">
              Clearance: {ia1PassPct}%
            </span>
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-semibold rounded border border-indigo-200 dark:border-indigo-800">
              Class Mean: {avgIa1} / 20.0
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={gradeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {gradeBreakdown.map((entry, index) => (
                      <Cell key={`grade-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded shadow text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{data.label}</span>: {data.count} students ({((data.count / totalStudents) * 100).toFixed(1)}%)
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium mt-1">
              Distribution of IA-1 continuous evaluation marks
            </p>
          </div>

          {/* Breakdown Table */}
          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-4">Performance Band</th>
                  <th className="py-2.5 px-4">Mark Range</th>
                  <th className="py-2.5 px-4 text-center">Student Count</th>
                  <th className="py-2.5 px-4 text-center">Share of Cohort</th>
                  <th className="py-2.5 px-4">Academic Status & Directive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gradeBreakdown.map((grade) => {
                  const pct = ((grade.count / totalStudents) * 100).toFixed(1);
                  return (
                    <tr key={grade.label} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: grade.color }}></span>
                        {grade.label.split(' ')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {grade.label.includes('(') ? grade.label.substring(grade.label.indexOf('(')) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {grade.count}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {pct}%
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {grade.label.startsWith('Excellent') && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Distinction • Eligible for honors enrichment</span>}
                        {grade.label.startsWith('Good') && <span className="text-indigo-600 dark:text-indigo-400 font-medium">Competent • On track for standard university clearance</span>}
                        {grade.label.startsWith('Average') && <span className="text-amber-600 dark:text-amber-400 font-medium">Marginal • Peer coaching & question bank practice recommended</span>}
                        {grade.label.startsWith('Remedial') && <span className="text-rose-600 dark:text-rose-400 font-medium">At-Risk • Mandatory faculty remedial classes required</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. QUICK NOTICE (Full Width Formal Section directly below Grade Distribution) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Quick Notice: Official Class Circular & Broadcast Desk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish university circulars, assignment revisions, or remedial notices directly to students and parents
            </p>
          </div>
          <div className="flex items-center gap-2">
            {postSuccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-semibold">
                <Check size={14} /> Published Successfully
              </span>
            )}
            <Bell size={18} className={postSuccess ? "text-emerald-500" : "text-slate-400"} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Dispatch Form */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Circular Title / Subject Header
              </label>
              <input 
                type="text" 
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Schedule for IA-2 Remedial Unit Revision & Submission Deadlines..." 
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Recipient Group
                </label>
                <select 
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">All (Students & Parents)</option>
                  <option value="students">Students Only</option>
                  <option value="parents">Parents Only</option>
                  <option value="specific">Specific Roll Number</option>
                </select>
              </div>

              {targetAudience === 'specific' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Student Roll Number
                  </label>
                  <input 
                    type="text" 
                    value={targetRollNo}
                    onChange={(e) => setTargetRollNo(e.target.value)}
                    placeholder="e.g. INFTT-1-014" 
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
                  />
                </div>
              ) : (
                <div className="hidden sm:block">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Author Designation</label>
                  <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-500 font-medium">
                    Faculty Advisor • {teacherName}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Circular Body & Instructions
              </label>
              <textarea 
                rows={3}
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                placeholder="Enter instructions, schedule timings, venue details, or required materials..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              />
            </div>

            <button
              onClick={handlePostNotice}
              disabled={isPosting || !noticeTitle.trim() || !noticeContent.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isPosting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>Broadcast Official Circular</span>
            </button>
          </div>

          {/* Recent History Log */}
          <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-6 lg:pt-0 lg:pl-8">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Recent Dispatched Circulars
                </span>
                <History size={14} className="text-slate-400" />
              </div>

              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {notices.slice(0, 4).map((notice, idx) => (
                  <div key={notice.id ? `${notice.id}-${idx}` : `notice-${idx}`} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{notice.title}</p>
                      <span className="text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 shrink-0">
                        {notice.targetAudience === 'specific' ? `#${notice.targetRollNo}` : notice.targetAudience || 'All'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{notice.content}</p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                      {notice.author || teacherName} • {notice.date?.toDate ? notice.date.toDate().toLocaleDateString('en-GB') : 'Today'}
                    </p>
                  </div>
                ))}
                {notices.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">No previous circulars found in faculty records.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI INSIGHTS (Full Width Formal Section directly below Quick Notice) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI Insights: Class Diagnostics & Actionable Academic Advisory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated algorithmic performance flagging based on continuous evaluation metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setReportGenerated(true);
                setTimeout(() => setReportGenerated(false), 3500);
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 cursor-pointer"
            >
              {reportGenerated ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  Report Compiled & Ready
                </>
              ) : (
                <>
                  <FileSpreadsheet size={14} className="text-indigo-600" />
                  Generate Faculty Remedial Report
                </>
              )}
            </button>
            <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Alert 1 */}
          <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Remedial Attention Required</span>
            </div>
            <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
              <strong>{remedialCount} students</strong> scored below the passing benchmark (8/20) in IA-1. Recommended: Schedule a unit revision session for modules 2 & 3.
            </p>
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              Threshold: &lt; 8.0 marks in IA-1
            </div>
          </div>

          {/* Alert 2 */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Attendance Deficit Warning</span>
            </div>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>{atRiskAttendanceCount} students</strong> have attendance below the mandatory 75% university regulation. Automated parent notification is active.
            </p>
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Regulation: Minimum 75% aggregate
            </div>
          </div>

          {/* Alert 3 */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Cohort Progression</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Class SGPI average gained <strong>+0.28 points</strong> across Semester 3 to 4. <strong>{honorsCount} students</strong> qualified for Honors distinction.
            </p>
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Distinction Criteria: Both IA-1 & IA-2 &ge; 15
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export const ParentDashboard: React.FC<{ 
  childData: any,
  activeTab?: string, 
  searchQuery?: string,
  parentName?: string
}> = ({ childData, activeTab = 'performance', searchQuery = '', parentName }) => {
  if (!childData) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
        <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white mb-2">Syncing Child Data...</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          Please ensure your child's name in your profile matches their name in the college records.
        </p>
      </div>
    );
  }

  const displayChild = childData;
  
  // Safe access to marks
  const ia1 = displayChild.ia1 ?? 0;
  const ia2 = displayChild.ia2 ?? 0;
  const sem4 = displayChild.sem4 ?? 0;
  const attendanceVal = displayChild.attendance ?? 0;
  const quizPassVal = displayChild.quizPass ?? 0;

  // Consistency Score Calculation: Avg of Attendance, Quiz Pass, and IA Performance
  // IA Performance is (ia1+ia2)/40 * 100
  const iaPercent = Math.min(((ia1 + ia2) / 40) * 100, 100);
  const consistencyScore = Math.round((attendanceVal + quizPassVal + iaPercent) / 3) || 0;

  const consistency = {
    score: consistencyScore,
    attendance: attendanceVal,
    quizPassRate: quizPassVal
  };

  const blogs = [
    {
      title: "Understanding Student Mental Health",
      category: "Mental Health",
      desc: "How to identify signs of academic stress and support your child through exams.",
      icon: "Brain",
      gradient: "from-blue-600 to-indigo-700"
    },
    {
      title: "Effective Parenting in the Digital Age",
      category: "Parenting",
      desc: "Balancing screen time and study time for better academic focus.",
      icon: "HeartHandshake",
      gradient: "from-purple-600 to-indigo-700"
    },
    {
      title: "The Power of Positive Reinforcement",
      category: "Academic Growth",
      desc: "Why celebrating small milestones leads to consistent academic performance.",
      icon: "Sparkles",
      gradient: "from-emerald-600 to-teal-700"
    }
  ];

  const faculty = [
    { name: "Prof. Amit Jadhav", role: "Class Teacher", email: "amit.j@college.edu", phone: "+91 98765 43210" },
    { name: "Dr. Sarah Smith", role: "HOD - IT", email: "sarah.s@college.edu", phone: "+91 98765 43211" },
    { name: "Prof. Rahul Verma", role: "Maths Faculty", email: "rahul.v@college.edu", phone: "+91 98765 43212" }
  ];

  if (activeTab === 'college-info') {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto font-sans">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 rounded border border-slate-800 dark:border-slate-700 flex items-center justify-center text-white shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Institutional & Course Registry Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official student affiliation and departmental registration</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Affiliated Institution</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayChild.college || "Fr. Conceicao Rodrigues College of Engineering"}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Degree Program & Department</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayChild.course || "B.E. Information Technology"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class Division & Batch</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayChild.batch || "Division INFT-1 • Batch A"}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Year & Semester</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayChild.semester || "Semester IV (Academic Year 2025–26)"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Departmental Academic Support & Helpdesk</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Official administrative channels for parent-faculty communication and queries.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Office Hours</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Mon – Fri: 09:00 AM – 05:00 PM</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Faculty Academic Email</p>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">inft.hod@college.edu</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dean Academic Helpline</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">022-2642-1234 (Ext. 204)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'blogs') {
    const filteredBlogs = blogs.filter(blog => 
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto font-sans">
        <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Parenting Advisory & Student Wellness Bulletins</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Curated guidance from institutional counselors and educational psychologists</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => {
            const IconComponent = blog.icon === 'Brain' ? Brain : blog.icon === 'HeartHandshake' ? HeartHandshake : Sparkles;
            return (
              <div 
                key={blog.title}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col"
              >
                <div className={cn("w-full h-32 bg-gradient-to-r flex items-center justify-center text-white", blog.gradient)}>
                  <IconComponent size={36} className="opacity-90 drop-shadow-sm" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono uppercase rounded border border-slate-200 dark:border-slate-700">
                      {blog.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-2">{blog.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{blog.desc}</p>
                  </div>
                  <button className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:underline inline-flex items-center gap-1 cursor-pointer">
                    Read Circular Advisory →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeTab === 'contact') {
    const filteredFaculty = faculty.filter(f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1200px] mx-auto font-sans">
        <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Departmental Faculty Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct contact points for course instructors and department administrators</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {filteredFaculty.map((f) => (
            <div key={f.email || f.name} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{f.name}</h4>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{f.role}</p>
                </div>
              </div>
              <div className="text-left sm:text-right text-xs">
                <p className="font-mono text-slate-700 dark:text-slate-300">{f.email}</p>
                <p className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">{f.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const childFirstName = displayChild?.name && displayChild?.name !== "No child linked" 
    ? displayChild.name.split(' ')[0] 
    : "Your child";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* Formal Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 mb-1">
            <span>Parent Portal</span>
            {parentName && (
              <>
                <span>•</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{parentName}</span>
              </>
            )}
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Roll No: {displayChild.rollNo || 'N/A'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Academic Performance Summary: {displayChild.name || 'Enrolled Student'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold rounded border border-slate-200 dark:border-slate-700">
            Current Sem 4 SGPI: {sem4} / 10.0
          </span>
        </div>
      </div>

      {/* Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Consistency Ring */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Aggregate Consistency Index
            </h3>
            <span className={cn(
              "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border",
              consistency.score >= 80 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" 
                : consistency.score >= 60 
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" 
                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
            )}>
              {consistency.score >= 80 ? 'Optimal Standing' : consistency.score >= 60 ? 'Satisfactory Standing' : 'Academic Alert'}
            </span>
          </div>
          
          <div className="relative w-52 h-52 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { value: consistency.score },
                    { value: 100 - consistency.score }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell key="consistency-score" fill="#4F46E5" />
                  <Cell key="consistency-remainder" fill="#E2E8F0" className="dark:fill-slate-800" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">{consistency.score}%</span>
              <span className="text-[10px] font-mono uppercase text-slate-400 mt-1">Composite Score</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Aggregate Attendance</p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{consistency.attendance}%</p>
              <span className="text-[10px] font-mono text-slate-400">Min 75% required</span>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Quiz Clearance</p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{consistency.quizPassRate}%</p>
              <span className="text-[10px] font-mono text-slate-400">Continuous Evaluation</span>
            </div>
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-xs mt-4 leading-relaxed max-w-md">
            {consistency.score >= 80 
              ? `${childFirstName} maintains exemplary discipline and consistency across internal assessments and attendance registers.`
              : `${childFirstName} demonstrates regular progress but requires focused support to strengthen internal test marks.`}
          </p>
        </div>

        {/* Marks & SGPI Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Continuous Evaluation Marks (IA-1 & IA-2)
              </h4>
              <Award className="text-amber-500" size={18} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Internal Assessment 1</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{ia1}</span>
                  <span className="text-xs font-mono text-slate-400">/ 20</span>
                </div>
                <div className="mt-2 text-[10px] font-mono">
                  {ia1 >= 8 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cleared (≥ 8.0)</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Remedial Flagged (&lt; 8.0)</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Internal Assessment 2</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{ia2}</span>
                  <span className="text-xs font-mono text-slate-400">/ 20</span>
                </div>
                <div className="mt-2 text-[10px] font-mono">
                  {ia2 >= 8 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cleared (≥ 8.0)</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Remedial Flagged (&lt; 8.0)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                University Semester Progression (SGPI)
              </h4>
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
            <div className="flex items-center gap-5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 rounded border border-slate-700 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold font-mono text-white">{sem4}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Semester 4 Grade Point Average</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Based on credit calculation under University of Mumbai curriculum standard.</p>
                <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Status: Regular Progression</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
