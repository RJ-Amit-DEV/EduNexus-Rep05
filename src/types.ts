/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  // Class & Student ID Linking Architecture
  classCode?: string;      // Teacher's class code or student's enrolled class code (e.g. CLS-4921)
  studentId?: string;      // Auto-generated student ID (e.g. STU-4821)
  parentId?: string;       // Auto-generated parent access ID (e.g. PAR-4821)
  teacherUid?: string;     // Teacher UID managing the class
  // Teacher specific
  department?: string;
  designation?: string;
  experience?: string;
  // Parent specific
  childName?: string;
  childStudentId?: string;
  relationship?: string;
  contact?: string;
  updatedAt?: any;
}

export interface Student {
  id: string;
  studentId: string;       // Auto-generated e.g. STU-4821
  parentId: string;        // Auto-generated paired key e.g. PAR-4821
  classCode: string;       // Teacher's class code e.g. CLS-4921
  rollNo: string;
  name: string;
  cgpa: string;
  /** @deprecated Legacy Firestore field; migrate reads to cgpa. */
  sem4?: string;
  ia1: number;
  ia2: number;
  attendance: number;
  quizPass: number;
  batch?: string;
  college?: string;
  course?: string;
  email?: string;
  updatedAt?: any;
}

export interface ConsistencyData {
  score: number;
  attendance: number;
  quizPassRate: number;
  deadlinesMet: number;
  studyHours: number;
}
