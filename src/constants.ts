export const STUDENT_PERFORMANCE = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 68 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 82 },
  { name: 'Sat', score: 90 },
  { name: 'Sun', score: 88 },
];

export const DEADLINES = [
  { id: '1', title: 'Maths Assignment', time: 'Today, 5:00 PM', priority: 'high', type: 'assignment', color: 'bg-rose-100 text-rose-600', completed: false },
  { id: '2', title: 'Computer Networks Quiz', time: 'Tomorrow, 10:00 AM', priority: 'high', type: 'exam', color: 'bg-amber-100 text-amber-600', completed: false },
  { id: '3', title: 'OS Lab Submission', time: 'Wed, 11:59 PM', priority: 'medium', type: 'assignment', color: 'bg-indigo-100 text-indigo-600', completed: false },
  { id: '4', title: 'SE Project Phase 1', time: 'Fri, 2:00 PM', priority: 'low', type: 'assignment', color: 'bg-emerald-100 text-emerald-600', completed: false },
];

export const DEFAULT_NOTICES = [
  {
    id: 'notice-default-1',
    title: 'Internal Assessment (IA-2) Schedule Announced - Dept of Information Technology',
    content: 'All Semester 4 INFT students are hereby informed that Continuous Assessment IA-2 examinations will commence from next Monday. Please review syllabus modules 3 & 4. Practical journals must be signed by Friday.',
    date: '2026-03-18',
    attachments: [{ type: 'pdf' as const, name: 'IA2_Timetable_INFT_2026.pdf' }],
    authorId: 'faculty-01',
    author: 'Prof. Amit Jadhav (Class In-charge)',
    targetAudience: 'all' as const
  },
  {
    id: 'notice-default-2',
    title: 'Submission of Term Work & Mini Project Phase 1 Documentation',
    content: 'Students must upload their mini-project synopsis and GitHub repository link via the portal. Code review sessions with faculty mentors will take place during scheduled lab slots.',
    date: '2026-03-15',
    attachments: [{ type: 'pdf' as const, name: 'MiniProject_Rubric.pdf' }],
    authorId: 'faculty-02',
    author: 'Prof. Rajesh Kulkarni',
    targetAudience: 'students' as const
  },
  {
    id: 'notice-default-3',
    title: 'Parent-Teacher Academic Review & Advisory Meeting',
    content: 'An online Parent-Teacher consultation meeting is scheduled for Saturday at 10:30 AM to discuss student attendance, continuous assessment metrics, and semester examination preparations.',
    date: '2026-03-12',
    attachments: [],
    authorId: 'faculty-01',
    author: 'Department Office',
    targetAudience: 'parents' as const
  }
];

export const DEFAULT_MESSAGES = [
  {
    id: 'msg-default-1',
    sender: 'Aarav Sharma',
    role: 'student' as const,
    content: 'Sir, could you please clarify the difference between Dijkstra algorithm and Bellman-Ford in handling negative cycle detection?',
    timestamp: '10:15 AM',
    createdAt: new Date().toISOString(),
    authorId: 'student-demo-01'
  },
  {
    id: 'msg-default-2',
    sender: 'Prof. Amit Jadhav',
    role: 'teacher' as const,
    content: 'Dijkstra assumes non-negative edge weights and fails with negative cycles. Bellman-Ford relaxes all edges |V|-1 times, allowing detection of negative cycles on the |V|-th pass. Refer to Unit 3 slides for the proof.',
    timestamp: '10:22 AM',
    createdAt: new Date().toISOString(),
    authorId: 'teacher-demo-01'
  }
];

// Core Team Members with Universal Multi-Role Access (can switch between Student, Faculty, and Parent seamlessly)
export const PRIVILEGED_TEAM_EMAILS = [
  'amitjadhav4306@gmail.com',
  'guptakunal4575@gmail.com',
  'krishnagosavi880@gmail.com',
  'rushabhhirave@gmail.com'
];

export const isPrivilegedTeamMember = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PRIVILEGED_TEAM_EMAILS.some(e => e.toLowerCase() === normalized);
};

