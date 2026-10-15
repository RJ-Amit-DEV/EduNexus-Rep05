import { LucideIcon } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'parent';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
  badge?: string;
}

export interface ProfileData {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  about: string;
  isPrivileged?: boolean;
  college?: string;
  course?: string;
  semester?: string;
  rollNo?: string;
  // Teacher specific
  department?: string;
  designation?: string;
  experience?: string;
  // Parent specific
  childName?: string;
  relationship?: string;
  contact?: string;
  updatedAt?: any;
}


export interface ConsistencyData {
  score: number;
  attendance: number;
  quizPassRate: number;
  deadlinesMet: number;
  studyHours: number;
}
