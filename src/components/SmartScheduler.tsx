import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2,
  History,
  Plus,
  Send, 
  Calendar, 
  Download, 
  RefreshCw, 
  BrainCircuit, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Pencil,
  FileText,
  Upload,
  Check,
  X,
  Maximize2,
  Minimize2,
  Trophy,
  PlayCircle,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type } from "@google/genai";
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';
import { VideoFocusPlayer } from './VideoFocusPlayer';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, getDocs, getDoc, writeBatch, limit, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { onAuthStateChanged } from 'firebase/auth';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ScheduleItem {
  id: string;
  time: string;
  chapter: string;
  topic: string;
  quizReady: boolean;
  passFail: 'Pass' | 'Fail' | 'Pending';
  isCleared: boolean;
  complexity: 'Low' | 'Medium' | 'High';
  type: 'study' | 'habit';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  conversationId: string;
  schedule?: ScheduleItem[];
  chapters?: string[];
  modules?: string[];
  isChapterSelection?: boolean;
  isModuleSelection?: boolean;
  isInitialModeSelection?: boolean;
  showScheduleButton?: boolean;
}

interface ScheduleHistoryItem {
  id: string;
  conversationId: string;
  subjectName: string;
  createdAt: any;
  schedule: ScheduleItem[];
  mode: 'module' | 'chapter';
  timeline: string;
  syllabus?: string;
  syllabusPreview?: string;
  syllabusLength?: number;
}

const WELCOME_MESSAGE = (conversationId: string): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: "Welcome! I'm your AI Academic Scheduler. To get started, please choose how you'd like to generate your schedule:",
  isInitialModeSelection: true,
  conversationId
});

const generateAIContent = async (request: { contents: unknown; config: Record<string, unknown> }) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in to use Smart AI Scheduler.');
  const response = await fetch('/api/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `AI request failed (${response.status}).`);
  return result as { text: string };
};

export const SmartScheduler: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const [activeConversationId, setActiveConversationId] = useState<string>(Math.random().toString(36).substring(2, 15));
  const [authenticatedUid, setAuthenticatedUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedulesHistory, setSchedulesHistory] = useState<ScheduleHistoryItem[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleItem[] | null>(null);
  const [extractedSyllabus, setExtractedSyllabus] = useState<string>('');
  const [pastedSyllabus, setPastedSyllabus] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<string>('');
  const [schedulingMode, setSchedulingMode] = useState<'module' | 'chapter' | null>(null);
  const [videoFocus, setVideoFocus] = useState<{ subject: string; topic?: string } | null>(null);
  const [timelineInput, setTimelineInput] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<{ topicId: string; questions: any[] } | null>(null);
  const [quizResults, setQuizResults] = useState<{ [key: string]: 'Pass' | 'Fail' }>({});
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });
  const [aiStatus, setAiStatus] = useState<'online' | 'rate-limited' | 'quota-exceeded'>('online');
  const [retryAfter, setRetryAfter] = useState<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    const newId = Math.random().toString(36).substring(2, 15);
    setActiveConversationId(newId);
    setMessages([WELCOME_MESSAGE(newId)]);
    setExtractedSyllabus('');
    setSelectedChapters([]);
    setSelectedModule(null);
    setTimeline('');
    setTimelineInput('');
    setSchedulingMode(null);
    setCurrentSchedule(null);
    setQuizResults({});
    setActiveScheduleId(null);
    setActiveQuiz(null);
    setViewingScheduleId(null);
    setPastedSyllabus('');
    setRescheduleReason('');
    setIsRescheduling(false);
  };

  const handleAiError = (error: any) => {
    console.error("AI Error:", error);
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      setAiStatus('rate-limited');
      setRetryAfter(60);
    } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted')) {
      setAiStatus('quota-exceeded');
    }
  };

  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            setAiStatus('online');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  const generateFinalSchedule = async (providedTimeline?: string, providedMode?: 'module' | 'chapter', providedChapters?: string[]) => {
    setIsLoading(true);
    const finalTimeline = providedTimeline || timeline;
    const finalMode = providedMode || schedulingMode || 'chapter';
    const finalChapters = providedChapters || selectedChapters;
    try {
      const prompt = `ACTUAL SYLLABUS TEXT:
      ${extractedSyllabus.substring(0, 50000)}
      
      SELECTED CHAPTERS: ${finalChapters.join(', ')}
      TIMELINE: ${finalTimeline}
      MODE: ${finalMode}
      
      Generate a REAL, detailed study schedule based EXCLUSIVELY on the syllabus text.`;

      const response = await generateAIContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        config: {
          systemInstruction: `You are a world-class academic scheduler. 
          Analyze the syllabus text with precision. 
          DO NOT use dummy data. If a topic is not in the text, DO NOT include it.
          
          STRICT SYLLABUS ADHERENCE:
          - Extract REAL chapters and sub-topics.
          - ${finalChapters.length > 0 ? `FOCUS EXCLUSIVELY on: ${finalChapters.join(', ')}.` : ''}
          
          SCHEDULING LOGIC:
          1. Sequence topics logically.
          2. Create a realistic pace for: ${finalTimeline}. 
          3. Group by ${finalMode === 'module' ? 'Module' : 'Chapter'}.
          4. Insert habits/breaks after complex topics.
          
          Format: JSON with 'message' (summary) and 'schedule' array.
          Schedule item: 'id', 'time', 'chapter', 'topic', 'quizReady', 'passFail' (Pending), 'isCleared' (false), 'complexity' (Low/Medium/High), 'type' (study/habit).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    time: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    quizReady: { type: Type.BOOLEAN },
                    passFail: { type: Type.STRING, enum: ["Pass", "Fail", "Pending"] },
                    isCleared: { type: Type.BOOLEAN },
                    complexity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                    type: { type: Type.STRING, enum: ["study", "habit"] }
                  },
                  required: ["id", "time", "chapter", "topic", "quizReady", "passFail", "isCleared", "complexity", "type"]
                }
              }
            },
            required: ["message", "schedule"]
          }
        }
      });

      const responseText = response.text || "{\"message\": \"\", \"schedule\": []}";
      const data = JSON.parse(responseText);
      
      setCurrentSchedule(data.schedule);
      setAiStatus('online');
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message || "I've generated your study schedule. You can view it below.",
        schedule: data.schedule,
        showScheduleButton: true,
        conversationId: activeConversationId
      };
      await saveMessage(assistantMessage);

      // Save to history (lean metadata to prevent unbounded payload reads)
      if (auth.currentUser) {
        const path = `users/${auth.currentUser.uid}/schedules`;
        const docRef = await addDoc(collection(db, path), {
          conversationId: activeConversationId,
          subjectName: data.subjectName || 'Study Schedule',
          timeline: finalTimeline,
          mode: finalMode,
          schedule: data.schedule,
          syllabus: extractedSyllabus.substring(0, 50000),
          syllabusPreview: extractedSyllabus ? extractedSyllabus.substring(0, 300) : '',
          syllabusLength: extractedSyllabus ? extractedSyllabus.length : 0,
          createdAt: serverTimestamp()
        });
        setActiveScheduleId(docRef.id);
      }
    } catch (error) {
      handleAiError(error);
      console.error("Error generating schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const takeQuiz = async (item: ScheduleItem) => {
    setIsLoading(true);
    try {
      const response = await generateAIContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Generate a 3-question multiple choice quiz for the topic: "${item.topic}" from the chapter "${item.chapter}".`
          }]
        }],
        config: {
          systemInstruction: "You are an expert academic examiner. Generate a 3-question multiple choice quiz. Return ONLY a JSON object with a 'questions' array. Each question MUST have 'question' (string), 'options' (array of 4 strings), and 'correctIndex' (number, 0-3).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.NUMBER }
                  },
                  required: ["question", "options", "correctIndex"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const responseText = response.text || "{\"questions\": []}";
      const data = JSON.parse(responseText);
      setAiStatus('online');
      setActiveQuiz({ topicId: item.id, questions: data.questions });
    } catch (error) {
      handleAiError(error);
      console.error("Error generating quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Track auth changes explicitly; effects must resubscribe after sign-in/sign-out.
  useEffect(() => onAuthStateChanged(auth, user => {
    const nextUid = user?.uid ?? null;
    setAuthenticatedUid(previousUid => {
      if (previousUid !== nextUid) {
        setSchedulesHistory([]);
        setActiveScheduleId(null);
        setCurrentSchedule(null);
        setMessages([WELCOME_MESSAGE(activeConversationId)]);
      }
      return nextUid;
    });
    if (!user) {
      setSchedulesHistory([]);
      setActiveScheduleId(null);
      setCurrentSchedule(null);
      setMessages([WELCOME_MESSAGE(activeConversationId)]);
    }
  }), [activeConversationId]);

  // Fetch only this conversation's messages and only after auth is resolved.
  useEffect(() => {
    if (!authenticatedUid || !activeConversationId) return;
    const path = `users/${authenticatedUid}/scheduler_messages`;
    const q = query(
      collection(db, path),
      where('conversationId', '==', activeConversationId),
      orderBy('createdAt', 'asc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedMessages = snapshot.docs.map(item => ({
        ...item.data(),
        id: item.id
      } as Message)).sort((a, b) => {
        const left = (a as any).createdAt?.toMillis?.() ?? 0;
        const right = (b as any).createdAt?.toMillis?.() ?? 0;
        return left - right;
      });
      setMessages(fetchedMessages.length ? fetchedMessages : [WELCOME_MESSAGE(activeConversationId)]);
    }, error => {
      console.error('Unable to load scheduler conversation history:', error);
      setMessages([WELCOME_MESSAGE(activeConversationId)]);
    });
    return () => unsubscribe();
  }, [authenticatedUid, activeConversationId]);

  // Load the signed-in user's schedule history, with a bounded result set.
  useEffect(() => {
    if (!authenticatedUid) return;
    const path = `users/${authenticatedUid}/schedules`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, snapshot => {
      const history = snapshot.docs.map(item => ({
        ...item.data(),
        id: item.id
      } as ScheduleHistoryItem));
      setSchedulesHistory(history);

    }, error => {
      console.error('Unable to load scheduler plan history:', error);
      setSchedulesHistory([]);
    });
    return () => unsubscribe();
  }, [authenticatedUid]);

  const deleteRefsInBatches = async (refs: any[]) => {
    for (let index = 0; index < refs.length; index += 450) {
      const batch = writeBatch(db);
      refs.slice(index, index + 450).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  };

  const deleteSchedule = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth.currentUser) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Study Plan',
      message: 'Are you sure you want to delete this study plan? This will remove all associated chat history.',
      type: 'danger',
      onConfirm: async () => {
        const scheduleToDelete = schedulesHistory.find(s => s.id === id);
        if (!scheduleToDelete) return;

        try {
          const path = `users/${auth.currentUser!.uid}/schedules`;
          const scheduleRef = doc(db, path, id);
          
          await deleteDoc(scheduleRef);
          
          const msgPath = `users/${auth.currentUser!.uid}/scheduler_messages`;
          const targetConversationId = scheduleToDelete.conversationId || id;
          const msgSnapshot = await getDocs(query(
            collection(db, msgPath),
            where('conversationId', '==', targetConversationId)
          ));
          await deleteRefsInBatches(msgSnapshot.docs.map(item => item.ref));

          if (activeConversationId === targetConversationId) {
            resetAll();
          }
        } catch (error) {
          console.error("Delete error:", error);
          handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser!.uid}/schedules/${id}`);
        }
      }
    });
  };

  const clearAllHistory = async () => {
    if (!auth.currentUser) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Clear All History',
      message: 'Are you sure you want to delete ALL your study plans? This action is permanent and cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const schedulePath = `users/${auth.currentUser!.uid}/schedules`;
          const msgPath = `users/${auth.currentUser!.uid}/scheduler_messages`;

          const [schedulesSnap, msgsSnap] = await Promise.all([
            getDocs(collection(db, schedulePath)),
            getDocs(collection(db, msgPath))
          ]);

          await deleteRefsInBatches([
            ...schedulesSnap.docs.map(item => item.ref),
            ...msgsSnap.docs.map(item => item.ref)
          ]);
          resetAll();
          setShowHistory(false);
        } catch (error) {
          console.error("Clear all error:", error);
          handleFirestoreError(error, OperationType.DELETE, "all_history");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const loadSchedule = (item: ScheduleHistoryItem) => {
    setActiveScheduleId(item.id);
    setActiveConversationId(item.conversationId || item.id);
    setCurrentSchedule(item.schedule);
    setSchedulingMode(item.mode);
    setTimeline(item.timeline);
    setTimelineInput(item.timeline);
    if (item.syllabus) {
      setExtractedSyllabus(item.syllabus);
    } else {
      setExtractedSyllabus('');
    }
    setShowHistory(false);
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Sort items to handle potential out-of-order text blocks (common in multi-column PDFs)
      const items = textContent.items as any[];
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) < 5) { // Same line (roughly)
          return a.transform[4] - b.transform[4]; // Sort by X
        }
        return yDiff; // Sort by Y (top to bottom)
      });

      let pageText = '';
      let lastY = -1;
      for (const item of items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (lastY !== -1) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      
      fullText += `--- Page ${i} ---\n${pageText}\n`;
    }
    
    return fullText;
  };

  const saveMessage = async (msg: Message) => {
    if (auth.currentUser) {
      const path = `users/${auth.currentUser.uid}/scheduler_messages`;
      await addDoc(collection(db, path), {
        ...msg,
        createdAt: serverTimestamp()
      });
    } else {
      setMessages(prev => [...prev, msg]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      setExtractedSyllabus(text);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Uploaded syllabus: ${file.name}`,
        conversationId: activeConversationId
      };
      await saveMessage(userMessage);

      await extractModules(text);
    } catch (error) {
      console.error("Error processing PDF:", error);
      await saveMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't read that PDF. Please make sure it's a valid syllabus document.",
        conversationId: activeConversationId
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSyllabusSubmit = async () => {
    if (!pastedSyllabus.trim()) return;

    setIsLoading(true);
    try {
      setExtractedSyllabus(pastedSyllabus);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Pasted syllabus text (${pastedSyllabus.length} characters)`,
        conversationId: activeConversationId
      };
      await saveMessage(userMessage);

      await extractModules(pastedSyllabus);
      setPastedSyllabus('');
    } catch (error) {
      console.error("Error processing text:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractModules = async (text: string, customMessage?: string) => {
    setIsLoading(true);
    try {
      const response = await generateAIContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Analyze the following syllabus text and identify:
            1. The Subject Name.
            2. ALL ${schedulingMode === 'module' ? 'MODULES' : 'CHAPTERS'} listed. 
            3. Any mentioned timeline (e.g., "15 days", "2 weeks").
            
            Syllabus Text:
            ${text.substring(0, 30000)}`
          }]
        }],
        config: {
          systemInstruction: `You are a highly accurate academic data extractor. Return a JSON object with 'subjectName' (string), '${schedulingMode === 'module' ? 'modules' : 'chapters'}' (array of strings), and 'detectedTimeline' (string or null). If the input is not a syllabus, return empty arrays.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjectName: { type: Type.STRING },
              detectedTimeline: { type: Type.STRING, nullable: true },
              [schedulingMode === 'module' ? 'modules' : 'chapters']: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["subjectName", schedulingMode === 'module' ? 'modules' : 'chapters']
          }
        }
      });

      const responseText = response.text || "{\"subjectName\": \"\", \"chapters\": [], \"modules\": [], \"detectedTimeline\": null}";
      const data = JSON.parse(responseText);
      
      // Store detected timeline if found
      if (data.detectedTimeline) {
        setTimeline(data.detectedTimeline);
        setTimelineInput(data.detectedTimeline);
      }

      if (schedulingMode === 'module' && data.modules && data.modules.length > 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: customMessage || `I've analyzed the syllabus for **${data.subjectName || 'your subject'}**. ${data.detectedTimeline ? `I also detected a timeline of **${data.detectedTimeline}**.` : ''} Please select the **Module** you want to start with.`,
          modules: data.modules,
          isModuleSelection: true,
          conversationId: activeConversationId
        };
        await saveMessage(assistantMessage);
      } else if (schedulingMode === 'chapter' && data.chapters && data.chapters.length > 0) {
        setSelectedChapters(data.chapters); // Automatically select all chapters for chapter-wise mode
        
        // If a timeline was detected in the syllabus, we can proceed directly
        if (data.detectedTimeline) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I've analyzed the syllabus for **${data.subjectName || 'your subject'}** and detected a timeline of **${data.detectedTimeline}**. \n\nI'm generating your complete schedule now...`,
            conversationId: activeConversationId
          };
          await saveMessage(assistantMessage);
          await generateFinalSchedule(data.detectedTimeline, 'chapter', data.chapters);
        } else {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: customMessage || `I've analyzed the syllabus for **${data.subjectName || 'your subject'}** and identified **${data.chapters.length} chapters**. \n\nExcellent! Now, please tell me your **timeline** (e.g., '2 weeks', '1 month') for this study plan. I will generate a detailed schedule covering the entire syllabus.`,
            conversationId: activeConversationId
          };
          await saveMessage(assistantMessage);
        }
      } else if (!schedulingMode) {
        // Fallback if user pasted syllabus before selecting a mode
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've analyzed the syllabus for **${data.subjectName || 'your subject'}**. \n\nBefore we proceed, would you like to generate a **Chapter-wise** schedule (entire syllabus) or a **Module-wise** schedule (one module at a time)?`,
          isInitialModeSelection: true,
          conversationId: activeConversationId
        };
        await saveMessage(assistantMessage);
      }
    } catch (error) {
      console.error("Error extracting modules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSelect = async (moduleName: string) => {
    setSelectedModule(moduleName);
    setIsLoading(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I want to schedule **${moduleName}**.`,
      conversationId: activeConversationId
    };
    await saveMessage(userMessage);

    try {
      const response = await generateAIContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Extract all CHAPTERS or TOPICS specifically for the module: "${moduleName}" from this syllabus text.
            
            Syllabus Text:
            ${extractedSyllabus.substring(0, 30000)}`
          }]
        }],
        config: {
          systemInstruction: "You are an expert academic data extractor. Return a JSON object with a 'chapters' array of strings.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapters: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["chapters"]
          }
        }
      });

      const data = JSON.parse(response.text || "{\"chapters\": []}");
      
      await saveMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great! Here are the chapters I found in **${moduleName}**. Which ones would you like to schedule?`,
        chapters: data.chapters,
        isChapterSelection: true,
        conversationId: activeConversationId
      });
    } catch (error) {
      console.error("Error extracting chapters for module:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChapterToggle = (chapter: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapter) 
        ? prev.filter(c => c !== chapter)
        : [...prev, chapter]
    );
  };

  const confirmChapters = async () => {
    if (selectedChapters.length === 0 || !schedulingMode) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I've selected ${selectedChapters.length} items and chose **${schedulingMode === 'module' ? 'Module-wise' : 'Chapter-wise'}** scheduling.`,
      conversationId: activeConversationId
    };
    await saveMessage(userMessage);

    // If timeline was already detected, skip the prompt and generate
    if (timeline) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Excellent choice. Since we already have a timeline of **${timeline}**, I'm generating your detailed schedule now...`,
        conversationId: activeConversationId
      };
      await saveMessage(assistantMessage);
      await generateFinalSchedule(timeline, schedulingMode, selectedChapters);
    } else {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Excellent choice. Now, please tell me your **timeline** (e.g., '2 weeks', '1 month', or 'until May 15th') for this study plan. I will perform a deep analysis of the syllabus to ensure every topic is covered accurately.",
        conversationId: activeConversationId
      };
      await saveMessage(assistantMessage);
    }
  };

  const submitQuiz = (topicId: string, score: number, total: number) => {
    const result: 'Pass' | 'Fail' = score / total >= 0.6 ? 'Pass' : 'Fail';
    setQuizResults(prev => ({ ...prev, [topicId]: result }));
    
    // Update schedule state
    if (currentSchedule) {
      const updated: ScheduleItem[] = currentSchedule.map(item => 
        item.id === topicId ? { ...item, passFail: result } : item
      );
      setCurrentSchedule(updated);
      
      setMessages(prev => prev.map(msg => {
        if (msg.schedule) {
          const updatedMsgSchedule: ScheduleItem[] = msg.schedule.map(item => 
            item.id === topicId ? { ...item, passFail: result } : item
          );
          return {
            ...msg,
            schedule: updatedMsgSchedule
          };
        }
        return msg;
      }));

      // Update in Firestore
      if (auth.currentUser) {
        const path = `users/${auth.currentUser.uid}/schedules`;
        
        const updateFirestore = async () => {
          try {
            if (activeScheduleId) {
              const docRef = doc(db, path, activeScheduleId);
              await updateDoc(docRef, { schedule: updated });
            } else {
              // Fallback to latest if activeScheduleId is missing
              const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(1));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const docRef = doc(db, path, snapshot.docs[0].id);
                await updateDoc(docRef, { schedule: updated });
              }
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        };
        
        updateFirestore();
      }
    }
    setActiveQuiz(null);
  };

  const toggleTopicClearance = async (id: string) => {
    if (!currentSchedule || !auth.currentUser) return;
    
    const updated = currentSchedule.map(item => 
      item.id === id ? { ...item, isCleared: !item.isCleared } : item
    );
    setCurrentSchedule(updated);
    
    // Update the message in the chat as well
    setMessages(prev => prev.map(msg => {
      if (msg.schedule) {
        return {
          ...msg,
          schedule: msg.schedule.map(item => 
            item.id === id ? { ...item, isCleared: !item.isCleared } : item
          )
        };
      }
      return msg;
    }));

    // Update in Firestore
    try {
      const path = `users/${auth.currentUser.uid}/schedules`;
      if (activeScheduleId) {
        const docRef = doc(db, path, activeScheduleId);
        await updateDoc(docRef, {
          schedule: updated
        });
      } else {
        // Fallback to latest
        const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docRef = doc(db, path, snapshot.docs[0].id);
          await updateDoc(docRef, {
            schedule: updated
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/schedules`);
    }
  };

  const handleModeSelect = async (mode: 'module' | 'chapter') => {
    setSchedulingMode(mode);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I'd like a **${mode === 'module' ? 'Module-wise' : 'Chapter-wise'}** schedule.`,
      conversationId: activeConversationId
    };
    await saveMessage(userMessage);
    await saveMessage({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: "Great choice! Now, please **paste your syllabus text** or **upload a PDF** for the subject you want to plan.",
      conversationId: activeConversationId
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput.length > 200 ? `Syllabus text provided (${currentInput.length} characters)` : currentInput,
      conversationId: activeConversationId
    };

    await saveMessage(userMessage);
    
    setInput('');
    
    // If a schedule already exists, or we haven't started yet, treat input as a new syllabus
    if (!extractedSyllabus || (currentSchedule && input.length > 100)) {
      setIsLoading(true);
      try {
        // Reset state for a new subject if the input is long (likely a new syllabus)
        if (currentSchedule || extractedSyllabus) {
          setExtractedSyllabus('');
          setSelectedChapters([]);
          setTimeline('');
          setTimelineInput('');
          setCurrentSchedule(null);
          // Keep schedulingMode if it was already set by handleModeSelect
        }

        // Check relevance first
        const relevanceCheck = await generateAIContent({
            contents: [{
            role: 'user',
            parts: [{ text: `Is the following text related to academic study, a syllabus, or a learning schedule? Answer only 'YES' or 'NO'.\n\nText: ${currentInput.substring(0, 1000)}` }]
          }],
          config: {
            systemInstruction: "Answer only 'YES' or 'NO'."
          }
        });

        if (relevanceCheck.text && relevanceCheck.text.trim().toUpperCase().includes('YES')) {
          setExtractedSyllabus(currentInput);
          await extractModules(currentInput);
        } else {
          // If irrelevant, we don't respond or give a very minimal study-focused response
          // The user requested "no response", but in a UI context, a small hint is better than silence
          // However, following "no response" strictly:
          setMessages(prev => prev.filter(m => m.id !== userMessage.id)); // Remove the user message too? 
          // Let's just not add an assistant response and maybe show a toast or minimal text.
          // Irrelevant input ignored
        }
      } catch (error) {
        console.error("Error processing syllabus:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (selectedChapters.length > 0 && !timeline && schedulingMode) {
      setTimeline(currentInput);
      setTimelineInput(currentInput);
      await generateFinalSchedule(currentInput, schedulingMode, selectedChapters);
      
      // Reset selection state for potential next module
      if (schedulingMode === 'module') {
        setSelectedChapters([]);
        setTimeline('');
      }
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleReason.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I'd like to reschedule. Reason: ${rescheduleReason}`,
      conversationId: activeConversationId
    };

    setMessages(prev => [...prev, userMessage]);
    setIsRescheduling(false);
    setRescheduleReason('');

    setIsLoading(true);
    try {
      const model = "gemini-3.8-flash";
      
      const prompt = `Reschedule my current plan. 
      Reason for rescheduling: ${rescheduleReason}. 
      Timeline: ${timeline}.
      Please provide an updated schedule in the same tabular JSON format.`;
      
      const response = await generateAIContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "You are a smart academic scheduler. Adjust the schedule based on the user's reason for rescheduling. Return a JSON object with 'message' and 'schedule' array.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    time: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    quizReady: { type: Type.BOOLEAN },
                    passFail: { type: Type.STRING, enum: ["Pass", "Fail", "Pending"] },
                    isCleared: { type: Type.BOOLEAN },
                    complexity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                    type: { type: Type.STRING, enum: ["study", "habit"] }
                  },
                  required: ["id", "time", "chapter", "topic", "quizReady", "passFail", "isCleared", "complexity", "type"]
                }
              }
            },
            required: ["message", "schedule"]
          }
        }
      });

      const responseText = response.text || "{\"message\": \"Error\", \"schedule\": []}";
      const data = JSON.parse(responseText);
      const scheduleItems: ScheduleItem[] = data.schedule.map((item: any) => ({
        ...item,
        passFail: item.passFail as 'Pass' | 'Fail' | 'Pending',
        type: item.type as 'study' | 'habit'
      }));

      const newAssistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message,
        schedule: scheduleItems,
        showScheduleButton: true,
        conversationId: activeConversationId
      };

      await saveMessage(newAssistantMessage);
      
      setCurrentSchedule(scheduleItems);
    } catch (error) {
      console.error("Error rescheduling:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!currentSchedule) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('AI-Generated Study Schedule', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Timeline: ${timeline}`, 14, 22);

    const headers = [['Time', 'Chapter', 'Topic', 'Complexity', 'Quiz', 'Status', 'Cleared']];
    const data = currentSchedule.map(item => [
      item.time,
      item.chapter,
      item.topic,
      item.complexity,
      item.quizReady ? 'Yes' : 'No',
      item.passFail,
      item.isCleared ? 'Yes' : 'No'
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('study-schedule.pdf');
  };

  return (
    <div className={cn(
      "flex max-w-6xl mx-auto bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 relative",
      isFullScreen ? "fixed inset-4 z-[100] max-w-none h-[calc(100vh-32px)]" : "h-[calc(100vh-180px)]"
    )}>
      {/* History Sidebar */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-display font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className={cn(
                    "flex-1 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                    confirmModal.type === 'danger' ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-72 border-r border-slate-100 bg-slate-50/50 flex flex-col z-50 absolute inset-y-0 left-0 lg:relative lg:inset-auto"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-widest">History</h3>
                {schedulesHistory.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline ml-2"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button onClick={() => setShowHistory(false)} className="lg:hidden p-2 hover:bg-slate-200 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button 
                onClick={resetAll}
                className="w-full p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
              >
                <Plus size={16} /> New Plan
              </button>
              
              {schedulesHistory.map((item, idx) => (
                <div 
                  key={item.id ? `${item.id}-${idx}` : `sched-hist-${idx}`}
                  onClick={() => loadSchedule(item)}
                  className={cn(
                    "group relative p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    activeScheduleId === item.id 
                      ? "bg-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white border-transparent hover:border-slate-200"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-black text-slate-900 truncate pr-6">{item.subjectName}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={10} /> {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest">
                        {item.mode}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteSchedule(item.id, e)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-20 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-slate-900">Smart AI Scheduler</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "p-2 rounded-xl transition-colors relative",
              showHistory ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100"
            )}
            title="History"
          >
            <History size={20} />
            {schedulesHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {schedulesHistory.length}
              </span>
            )}
          </button>
          <button 
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 shadow-sm"
            title="Start New Subject"
          >
            <RefreshCw size={14} /> New Subject
          </button>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
            aiStatus === 'online' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
            aiStatus === 'rate-limited' ? "bg-amber-50 text-amber-600 border-amber-100" :
            "bg-rose-50 text-rose-600 border-rose-100"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              aiStatus === 'online' ? "bg-emerald-500 animate-pulse" :
              aiStatus === 'rate-limited' ? "bg-amber-500 animate-bounce" :
              "bg-rose-500"
            )} />
            {aiStatus === 'online' ? 'AI Online' : 
             aiStatus === 'rate-limited' ? `Wait ${retryAfter}s` : 
             'Quota Exceeded'}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {filteredMessages.map((msg, idx) => (
            <motion.div
              key={msg.id ? `${msg.id}-${idx}` : `msg-${idx}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-slate-900 text-white" : "bg-indigo-100 text-indigo-600"
              )}>
                {msg.role === 'user' ? <User size={20} /> : <Pencil size={20} />}
              </div>
              
              <div className="space-y-4">
                <div className={cn(
                  "p-5 rounded-[24px] text-sm font-medium leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-slate-900 text-white rounded-tr-none" 
                    : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {msg.isInitialModeSelection && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => handleModeSelect('chapter')}
                      className={cn(
                        "p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                        schedulingMode === 'chapter'
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                          : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                      )}
                    >
                      Chapter-wise
                    </button>
                    <button
                      onClick={() => handleModeSelect('module')}
                      className={cn(
                        "p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                        schedulingMode === 'module'
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                          : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                      )}
                    >
                      Module-wise
                    </button>
                  </div>
                )}

                {msg.isModuleSelection && msg.modules && (
                  <div className="mt-4 p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-indigo-600" />
                      <h4 className="font-display font-black text-slate-900">Select a Module</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.modules.map((module, idx) => (
                        <button
                          key={`mod-${idx}-${module}`}
                          onClick={() => handleModuleSelect(module)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                            selectedModule === module
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                              : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                          )}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.chapters && msg.isChapterSelection && schedulingMode === 'module' && (
                  <div className="mt-4 p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-indigo-600" />
                          <h4 className="font-display font-black text-slate-900">
                            1. Select Chapters for {selectedModule}
                          </h4>
                        </div>
                        <button 
                          onClick={() => {
                            if (selectedChapters.length === msg.chapters?.length) {
                              setSelectedChapters([]);
                            } else {
                              setSelectedChapters(msg.chapters || []);
                            }
                          }}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          {selectedChapters.length === msg.chapters?.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.chapters.map((chapter, idx) => (
                          <button
                            key={`chap-${idx}-${chapter}`}
                            onClick={() => handleChapterToggle(chapter)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                              selectedChapters.includes(chapter)
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                                : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                            )}
                          >
                            {selectedChapters.includes(chapter) && <Check size={14} className="inline mr-1" />}
                            {chapter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={confirmChapters}
                      disabled={selectedChapters.length === 0 || !schedulingMode}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
                    >
                      Continue to Timeline
                    </button>
                  </div>
                )}

                {msg.schedule && (
                  <div className="mt-4">
                    {msg.showScheduleButton && viewingScheduleId !== msg.id ? (
                      <button
                        onClick={() => setViewingScheduleId(msg.id)}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                      >
                        <Calendar size={20} /> View Detailed Schedule
                      </button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-x-auto rounded-[32px] border border-slate-200 shadow-xl bg-white"
                      >
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-indigo-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Study Plan</span>
                          </div>
                          <button 
                            onClick={downloadPDF}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm"
                          >
                            <Download size={14} /> PDF
                          </button>
                        </div>

                        {/* Video Focus Player Integration */}
                        <div className="p-8 border-b border-slate-100 bg-white">
                          <VideoFocusPlayer 
                            subject={videoFocus?.subject || selectedChapters[0] || "Academic"} 
                            topic={videoFocus?.topic || (selectedChapters.length > 1 ? selectedChapters.slice(0, 2).join(", ") : undefined)}
                          />
                        </div>

                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white">
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Time</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Chapter/Topic</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Complexity</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Quiz</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {msg.schedule?.map((item, idx) => {
                              const isPreviousCleared = idx === 0 || msg.schedule![idx - 1].isCleared;
                              const canStart = isPreviousCleared;
                              
                              return (
                                <tr key={item.id ? `${item.id}-${idx}` : `sched-item-${idx}`} className={cn(
                                  "hover:bg-slate-50 transition-colors",
                                  item.isCleared && "bg-emerald-50/30",
                                    item.type === 'habit' && "bg-amber-50/20",
                                  !canStart && "opacity-50 grayscale pointer-events-none"
                                )}>
                                  <td className="p-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {item.type === 'habit' ? <Clock size={14} className="text-amber-500" /> : <Clock size={14} className="text-indigo-500" />}
                                      {item.time}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="space-y-1">
                                      <div className={cn(
                                        "text-[10px] font-black uppercase tracking-wider",
                                        item.type === 'habit' ? "text-amber-600" : "text-indigo-600"
                                      )}>{item.chapter}</div>
                                      <div className={cn(
                                        "text-sm font-bold",
                                        item.type === 'habit' ? "text-amber-900 italic" : "text-slate-900"
                                      )}>{item.topic}</div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={cn(
                                      "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                      item.type === 'habit' ? "bg-amber-100 text-amber-600" :
                                        item.complexity === 'High' ? "bg-rose-100 text-rose-600" :
                                      item.complexity === 'Medium' ? "bg-amber-100 text-amber-600" :
                                      "bg-emerald-100 text-emerald-600"
                                    )}>
                                      {item.type === 'habit' ? 'Habit' : item.complexity}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    {item.type === 'habit' ? (
                                        <div className="flex items-center justify-center text-amber-500">
                                          <CheckCircle2 size={18} />
                                        </div>
                                      ) : item.quizReady ? (
                                      <button
                                        onClick={() => takeQuiz(item)}
                                        disabled={item.isCleared}
                                        className={cn(
                                          "flex items-center justify-center gap-1 mx-auto px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                          item.passFail === 'Pass' ? "text-emerald-500 bg-emerald-50" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                        )}
                                      >
                                        <Trophy size={14} />
                                        {item.passFail === 'Pass' ? 'Passed' : 'Take Quiz'}
                                      </button>
                                    ) : (
                                      <div className="flex items-center justify-center text-slate-300">
                                        <AlertCircle size={18} />
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={cn(
                                      "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                      item.type === 'habit' ? "bg-amber-100 text-amber-600" :
                                        item.passFail === 'Pass' ? "bg-emerald-100 text-emerald-600" :
                                      item.passFail === 'Fail' ? "bg-rose-100 text-rose-600" :
                                      "bg-slate-100 text-slate-400"
                                    )}>
                                      {item.type === 'habit' ? 'N/A' : item.passFail}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => toggleTopicClearance(item.id)}
                                        disabled={item.type !== 'habit' && item.passFail !== 'Pass'}
                                        className={cn(
                                          "p-2 rounded-xl transition-all",
                                          item.isCleared 
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" 
                                            : (item.passFail === 'Pass' || item.type === 'habit')
                                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                              : "bg-slate-100 text-slate-400"
                                        )}
                                        title={item.isCleared ? "Completed" : "Mark as Done"}
                                      >
                                        {item.isCleared ? <Check size={16} /> : <PlayCircle size={16} />}
                                      </button>
                                      {item.type === 'study' && (
                                        <button
                                          onClick={() => setVideoFocus({ subject: item.chapter, topic: item.topic })}
                                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                                          title="Watch Lectures"
                                        >
                                          <Youtube size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-3">
                          <button 
                            onClick={() => setIsRescheduling(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
                          >
                            <RefreshCw size={16} /> Reschedule Plan
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 mr-auto"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Pencil size={20} />
              </div>
              <div className="bg-slate-50 p-5 rounded-[24px] rounded-tl-none border border-slate-100 flex items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-400">AI is thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quiz Dialog */}
      <AnimatePresence>
        {activeQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Trophy size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-slate-900">Topic Quiz</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Test your knowledge</p>
                  </div>
                </div>
                <button onClick={() => setActiveQuiz(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-10">
                {activeQuiz.questions.map((q, qIdx) => (
                  <div key={`quiz-q-${qIdx}`} className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800 flex gap-3">
                      <span className="text-indigo-600">0{qIdx + 1}.</span>
                      {q.question}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt: string, oIdx: number) => (
                        <button
                          key={`quiz-opt-${qIdx}-${oIdx}`}
                          onClick={() => {
                            const updated = [...activeQuiz.questions];
                            updated[qIdx].selected = oIdx;
                            setActiveQuiz({ ...activeQuiz, questions: updated });
                          }}
                          className={cn(
                            "p-5 rounded-2xl text-left text-sm font-bold transition-all border-2",
                            q.selected === oIdx 
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100" 
                              : "bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  const score = activeQuiz.questions.reduce((acc, q) => acc + (q.selected === q.correctIndex ? 1 : 0), 0);
                  submitQuiz(activeQuiz.topicId, score, activeQuiz.questions.length);
                }}
                disabled={activeQuiz.questions.some(q => q.selected === undefined)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 mt-12 disabled:opacity-50"
              >
                Submit Quiz
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Dialog */}
      <AnimatePresence>
        {isRescheduling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <RefreshCw size={32} />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 text-center mb-2">Reschedule Plan</h3>
              <p className="text-slate-500 text-center text-sm font-medium mb-8">Please tell me the reason for rescheduling so I can adjust your plan accordingly.</p>
              
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g., I missed today's session, or I need more time for Calculus..."
                className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all resize-none mb-6"
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsRescheduling(false)}
                  className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitReschedule}
                  disabled={!rescheduleReason.trim() || isLoading}
                  className="flex-1 py-4 bg-indigo-600 text-white font-display font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  UPDATE PLAN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex flex-col gap-4">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={!extractedSyllabus ? "Paste your syllabus text here to get started..." : "Enter your timeline (e.g., 2 weeks)..."}
                className="w-full p-5 pr-16 bg-slate-50 border border-slate-200 rounded-[24px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all min-h-[60px] max-h-[200px]"
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-200 hover:text-indigo-600 transition-all shadow-sm"
                title="Upload PDF instead"
              >
                <Upload size={20} />
              </button>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 font-bold text-center mt-4 uppercase tracking-widest">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  </div>
  );
};
