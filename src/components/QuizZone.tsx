import React, { useState } from 'react';
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Award, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Zap, 
  HelpCircle,
  BarChart2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCategory {
  id: string;
  title: string;
  code: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questions: Question[];
}

const QUIZ_DATA: QuizCategory[] = [
  {
    id: 'os',
    title: 'Operating Systems',
    code: 'CS-301',
    description: 'Process management, concurrency, virtual memory, and deadlock prevention.',
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'os-1',
        question: 'Which of the following conditions is NOT required for a deadlock to occur?',
        options: [
          'Mutual Exclusion',
          'Hold and Wait',
          'Preemption Allowed',
          'Circular Wait'
        ],
        correctIndex: 2,
        explanation: 'Coffman conditions for deadlock require "No Preemption". If preemption is allowed, the operating system can preempt allocated resources to break deadlocks.'
      },
      {
        id: 'os-2',
        question: 'What is the primary objective of the TLB (Translation Lookaside Buffer)?',
        options: [
          'To cache disk blocks',
          'To speed up virtual-to-physical address translation',
          'To schedule CPU processes',
          'To manage swap space on disk'
        ],
        correctIndex: 1,
        explanation: 'A TLB is a high-speed associative hardware cache specifically designed to store recent virtual-to-physical page table mappings, avoiding slow multi-level memory lookups.'
      },
      {
        id: 'os-3',
        question: 'Which CPU scheduling algorithm is inherently provably optimal for minimizing average waiting time?',
        options: [
          'First-Come First-Served (FCFS)',
          'Round Robin (RR)',
          'Shortest Job First (SJF / Shortest Remaining Time First)',
          'Priority Scheduling without aging'
        ],
        correctIndex: 2,
        explanation: 'Shortest Job First (SJF) is provably optimal in terms of minimizing average waiting time because it schedules jobs with the smallest runtimes first.'
      },
      {
        id: 'os-4',
        question: 'In Unix/Linux systems, what is a zombie process?',
        options: [
          'A process that uses 100% of the CPU indefinitely',
          'A terminated process whose exit status has not yet been read by its parent via wait()',
          'A process that has been suspended with SIGSTOP',
          'A daemon running without a controlling terminal'
        ],
        correctIndex: 1,
        explanation: 'When a child process terminates, its entry remains in the process table until the parent process calls wait() or waitpid() to retrieve its exit status.'
      }
    ]
  },
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    code: 'CS-202',
    description: 'Trees, graphs, dynamic programming, sorting, and algorithmic complexity.',
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'dsa-1',
        question: 'What is the worst-case time complexity of standard QuickSort with first-element pivot selection on already sorted input?',
        options: ['O(log n)', 'O(n log n)', 'O(n)', 'O(n²)'],
        correctIndex: 3,
        explanation: 'Selecting the first element as pivot on an already sorted array partitions the array into subproblems of size 0 and n-1 at each step, yielding O(n²) worst-case performance.'
      },
      {
        id: 'dsa-2',
        question: 'Which data structure is typically used to perform Breadth-First Search (BFS) on a graph?',
        options: ['Stack (LIFO)', 'Queue (FIFO)', 'Priority Queue', 'Disjoint Set Union'],
        correctIndex: 1,
        explanation: 'BFS explores vertices level by level in order of distance from the source, naturally managed by a First-In-First-Out (FIFO) queue.'
      },
      {
        id: 'dsa-3',
        question: 'In a balanced Binary Search Tree (such as AVL or Red-Black Tree) containing n nodes, what is the maximum height?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'Self-balancing binary search trees maintain an invariant ensuring their height stays strictly bounded by O(log n), guaranteeing logarithmic lookup, insertion, and deletion.'
      },
      {
        id: 'dsa-4',
        question: 'Which algorithmic paradigm solves subproblems only once and stores their solutions in a lookup table or memoization array?',
        options: ['Greedy Method', 'Dynamic Programming', 'Divide and Conquer', 'Backtracking'],
        correctIndex: 1,
        explanation: 'Dynamic programming leverages overlapping subproblems and optimal substructure by memoizing or tabulating intermediate subproblem results.'
      }
    ]
  },
  {
    id: 'dbms',
    title: 'Database Management Systems',
    code: 'CS-303',
    description: 'Relational algebra, SQL, normalization, transactions, and indexing.',
    difficulty: 'Advanced',
    questions: [
      {
        id: 'dbms-1',
        question: 'In the ACID model of database transactions, what does the "I" stand for?',
        options: ['Integrity', 'Isolation', 'Indexability', 'Immutability'],
        correctIndex: 1,
        explanation: 'ACID stands for Atomicity, Consistency, Isolation, and Durability. Isolation ensures that concurrent transactions do not interfere with each other.'
      },
      {
        id: 'dbms-2',
        question: 'A table is in Third Normal Form (3NF) if it is in 2NF and has no:',
        options: [
          'Partial functional dependencies',
          'Transitive functional dependencies on any candidate key',
          'Multivalued dependencies',
          'Foreign key references'
        ],
        correctIndex: 1,
        explanation: 'Third Normal Form requires that no non-prime attribute is transitively dependent on the primary/candidate key.'
      },
      {
        id: 'dbms-3',
        question: 'Why are B+ Trees favored over standard Binary Search Trees for disk-based relational storage?',
        options: [
          'B+ Trees require less memory',
          'High fan-out minimizes costly disk I/O operations and leaf-level linked lists optimize range scans',
          'B+ Trees do not require balancing',
          'Binary search trees cannot store string keys'
        ],
        correctIndex: 1,
        explanation: 'B+ Trees have large branching factors (fan-out) matching disk block sizes, drastically reducing tree height and disk seek operations, while linked leaves allow fast sequential range queries.'
      }
    ]
  },
  {
    id: 'networks',
    title: 'Computer Networks & Security',
    code: 'CS-304',
    description: 'TCP/IP, HTTP/3, routing protocols, TLS handshake, and cybersecurity.',
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'networks-1',
        question: 'Which transport layer protocol provides reliable, connection-oriented, ordered byte-stream delivery with congestion control?',
        options: ['UDP', 'ICMP', 'TCP', 'ARP'],
        correctIndex: 2,
        explanation: 'TCP (Transmission Control Protocol) handles three-way handshakes, sequence numbers, acknowledgments, retransmissions, and sliding-window flow control.'
      },
      {
        id: 'networks-2',
        question: 'At which layer of the OSI model does an IP router primarily operate?',
        options: ['Data Link Layer (Layer 2)', 'Network Layer (Layer 3)', 'Transport Layer (Layer 4)', 'Session Layer (Layer 5)'],
        correctIndex: 1,
        explanation: 'IP routers forward packets based on logical IP addresses, which are defined and handled at the Network Layer (Layer 3).'
      },
      {
        id: 'networks-3',
        question: 'In asymmetric public-key cryptography (e.g. RSA), what key is used by a sender to encrypt a private message intended for Alice?',
        options: [
          'The sender\'s private key',
          'The sender\'s public key',
          'Alice\'s public key',
          'Alice\'s private key'
        ],
        correctIndex: 2,
        explanation: 'To send a confidential message to Alice, the sender encrypts it using Alice\'s publicly known key. Only Alice can decrypt it with her matching private key.'
      }
    ]
  }
];

export const QuizZone: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qIndex: number]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  const startQuiz = (category: QuizCategory) => {
    setSelectedCategory(category);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizCompleted(false);
    setUserAnswers({});
  };

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !selectedCategory) return;
    setIsAnswerSubmitted(true);
    const currentQ = selectedCategory.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ.correctIndex;

    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNextQuestion = () => {
    if (!selectedCategory) return;
    if (currentQuestionIndex + 1 < selectedCategory.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!selectedCategory) return;
    setIsQuizCompleted(true);

    const totalQuestions = selectedCategory.questions.length;
    const finalScore = score + (selectedOption === selectedCategory.questions[currentQuestionIndex].correctIndex ? 0 : 0);
    const passPercentage = Math.round((finalScore / totalQuestions) * 100);

    // Save to Firestore if authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsSaving(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const resultsCol = collection(db, `users/${currentUser.uid}/quiz_results`);
        await addDoc(resultsCol, {
          subject: selectedCategory.title,
          score: finalScore,
          total: totalQuestions,
          date: todayStr,
          type: 'interactive_quiz'
        });

        // Update profile consistency metric for quiz pass rate if applicable
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          'consistencyData.quizPassRate': passPercentage
        });
      } catch (err) {
        console.warn('Could not persist quiz result to Firestore:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const resetToCategories = () => {
    setSelectedCategory(null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizCompleted(false);
    setUserAnswers({});
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Category Selection View */}
      {!selectedCategory && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <Zap size={14} />
                Knowledge Assessment
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                Interactive Quiz Zone
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Select an engineering discipline to test your mastery and boost your semester consistency score.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start sm:self-auto">
              <Award className="text-amber-500" size={20} />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Modules</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{QUIZ_DATA.length} Available</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {QUIZ_DATA.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ y: -3 }}
                className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase rounded-lg">
                      {cat.code}
                    </span>
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider",
                      cat.difficulty === 'Beginner' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                      cat.difficulty === 'Intermediate' && "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
                      cat.difficulty === 'Advanced' && "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    )}>
                      {cat.difficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    {cat.questions.length} Questions
                  </span>

                  <button
                    onClick={() => startQuiz(cat)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    Start Quiz
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Active Quiz View */}
      {selectedCategory && !isQuizCompleted && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8"
        >
          {/* Header & Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">
              <button 
                onClick={resetToCategories}
                className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
              >
                ← Change Subject
              </button>
              <span>
                Question {currentQuestionIndex + 1} of {selectedCategory.questions.length}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="bg-indigo-600 h-full rounded-full"
                animate={{ width: `${((currentQuestionIndex + 1) / selectedCategory.questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="space-y-4">
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {selectedCategory.title}
            </span>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white leading-snug">
              {selectedCategory.questions[currentQuestionIndex].question}
            </h3>
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {selectedCategory.questions[currentQuestionIndex].options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = idx === selectedCategory.questions[currentQuestionIndex].correctIndex;
              
              let stateStyles = "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200";

              if (isAnswerSubmitted) {
                if (isCorrectAnswer) {
                  stateStyles = "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold";
                } else if (isSelected && !isCorrectAnswer) {
                  stateStyles = "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                } else {
                  stateStyles = "opacity-50 border-slate-200 dark:border-slate-800";
                }
              } else if (isSelected) {
                stateStyles = "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-2 ring-indigo-500/20";
              }

              return (
                <button
                  key={`q-${currentQuestionIndex}-opt-${idx}`}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswerSubmitted}
                  className={cn(
                    "w-full text-left p-4 sm:p-5 rounded-xl border text-sm sm:text-base transition-all flex items-center justify-between gap-4",
                    stateStyles
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black uppercase shrink-0",
                      isSelected && !isAnswerSubmitted ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {isAnswerSubmitted && isCorrectAnswer && (
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrectAnswer && (
                    <XCircle size={20} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          <AnimatePresence>
            {isAnswerSubmitted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "p-5 rounded-xl border text-sm leading-relaxed",
                  selectedOption === selectedCategory.questions[currentQuestionIndex].correctIndex
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                )}
              >
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Lightbulb size={16} />
                  Academic Explanation
                </p>
                <p>{selectedCategory.questions[currentQuestionIndex].explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Current Score:</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{score} pts</span>
            </div>

            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm"
              >
                {currentQuestionIndex + 1 < selectedCategory.questions.length ? 'Next Question' : 'Complete Quiz'}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Completed Results View */}
      {selectedCategory && isQuizCompleted && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-xl mx-auto space-y-8"
        >
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <Award size={44} />
          </div>

          <div>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Assessment Completed
            </span>
            <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white mt-1 mb-2">
              {selectedCategory.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Your performance summary has been recorded for this module.
            </p>
          </div>

          {/* Score Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/80">
            <div className="text-5xl font-display font-black text-slate-900 dark:text-white mb-2">
              {score} <span className="text-2xl text-slate-400 font-normal">/ {selectedCategory.questions.length}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {Math.round((score / selectedCategory.questions.length) * 100)}% Accuracy Rate
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => startQuiz(selectedCategory)}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Retake Quiz
            </button>
            <button
              onClick={resetToCategories}
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <BookOpen size={16} />
              Explore Other Modules
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
