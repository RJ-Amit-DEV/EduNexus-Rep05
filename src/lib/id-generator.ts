/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EduNexus ID Generator & Utilities
 * - Teacher Class Code: CLS-XXXX (e.g., CLS-4921)
 * - Student ID: STU-XXXX (e.g., STU-4921)
 * - Parent Access ID: PAR-XXXX (e.g., PAR-4921)
 */

export const DEFAULT_TEACHER_CLASS_CODE = "CLS-4921";

export const generateClassCode = (prefix = 'CLS'): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
};

export const generateStudentId = (seed?: number | string): string => {
  const suffix = seed ?? Math.floor(1000 + Math.random() * 9000);
  return `STU-${suffix}`;
};

export const generateParentId = (studentIdOrSeed: string | number): string => {
  if (typeof studentIdOrSeed === 'string') {
    if (studentIdOrSeed.startsWith('STU-')) {
      return studentIdOrSeed.replace('STU-', 'PAR-');
    }
    return `PAR-${studentIdOrSeed.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `PAR-${studentIdOrSeed}`;
};

export const deriveStudentIdFromParentId = (parentId: string): string => {
  if (parentId.startsWith('PAR-')) {
    return parentId.replace('PAR-', 'STU-');
  }
  return `STU-${parentId.replace(/[^0-9]/g, '')}`;
};

export const normalizeId = (id: string): string => {
  return (id || '').trim().toUpperCase();
};

export const isValidClassCode = (code: string): boolean => {
  const clean = normalizeId(code);
  return clean.length >= 4;
};

