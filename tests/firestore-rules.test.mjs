import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-edunexus-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/teacherA'), { uid: 'teacherA', role: 'teacher', classCode: 'CLS-A' }),
      setDoc(doc(db, 'users/teacherB'), { uid: 'teacherB', role: 'teacher', classCode: 'CLS-B' }),
      setDoc(doc(db, 'users/studentA'), { uid: 'studentA', role: 'student', classCode: 'CLS-A', studentDocId: 'studentA' }),
      setDoc(doc(db, 'users/parentA'), { uid: 'parentA', role: 'parent', classCode: 'CLS-A', childStudentDocId: 'studentA' }),
      setDoc(doc(db, 'students/studentA'), { teacherUid: 'teacherA', classCode: 'CLS-A', studentUid: 'studentA', parentUid: 'parentA', studentId: 'STU-A', parentId: 'PAR-A', rollNo: 'A-1', name: 'Student A', cgpa: '9.1', ia1: 18, ia2: 19 }),
      setDoc(doc(db, 'students/studentB'), { teacherUid: 'teacherB', classCode: 'CLS-B', studentUid: 'studentB', parentUid: 'parentB', studentId: 'STU-B', parentId: 'PAR-B', rollNo: 'B-1', name: 'Student B', cgpa: '8.2', ia1: 16, ia2: 17 }),
      setDoc(doc(db, 'studentAccessCodes/private-code-hash'), { studentDocId: 'studentA', classCode: 'CLS-A', teacherUid: 'teacherA', active: true }),
      setDoc(doc(db, 'parentLinks/private-parent-hash'), { studentDocId: 'studentA', classCode: 'CLS-A', teacherUid: 'teacherA', active: true, codeHash: 'private-parent-hash' }),
      setDoc(doc(db, 'messages/messageA'), { classCode: 'CLS-A', authorId: 'studentA', role: 'student', content: 'hello' }),
      setDoc(doc(db, 'notices/noticeA'), { classCode: 'CLS-A', targetAudience: 'all', authorId: 'teacherA', teacherUid: 'teacherA', title: 'A notice', content: 'Hello class' }),
    ]);
  });
});

after(async () => {
  await env?.cleanup();
});

test('teacher can list only their own class roster', async () => {
  const db = env.authenticatedContext('teacherA').firestore();
  const roster = query(collection(db, 'students'), where('teacherUid', '==', 'teacherA'), where('classCode', '==', 'CLS-A'));
  const result = await assertSucceeds(getDocs(roster));
  assert.equal(result.size, 1);
  await assertFails(getDoc(doc(db, 'students/studentB')));
});

test('student can read only the linked student record', async () => {
  const db = env.authenticatedContext('studentA').firestore();
  await assertSucceeds(getDoc(doc(db, 'students/studentA')));
  await assertFails(getDoc(doc(db, 'students/studentB')));
});

test('parent can read only the linked child record', async () => {
  const db = env.authenticatedContext('parentA').firestore();
  await assertSucceeds(getDoc(doc(db, 'students/studentA')));
  await assertFails(getDoc(doc(db, 'students/studentB')));
});

test('parent cannot read classroom discussion messages', async () => {
  const db = env.authenticatedContext('parentA').firestore();
  await assertFails(getDocs(query(collection(db, 'messages'), where('classCode', '==', 'CLS-A'))));
});

test('student and parent access-code records are private', async () => {
  const studentDb = env.authenticatedContext('studentA').firestore();
  const parentDb = env.authenticatedContext('parentA').firestore();
  await assertFails(getDoc(doc(studentDb, 'studentAccessCodes/private-code-hash')));
  await assertFails(getDoc(doc(parentDb, 'parentLinks/private-parent-hash')));
});

test('class notices are visible only within the enrolled class', async () => {
  const studentDb = env.authenticatedContext('studentA').firestore();
  const ownNotices = query(collection(studentDb, 'notices'), where('classCode', '==', 'CLS-A'), where('targetAudience', '==', 'all'));
  const result = await assertSucceeds(getDocs(ownNotices));
  assert.equal(result.size, 1);
  const crossClass = query(collection(studentDb, 'notices'), where('classCode', '==', 'CLS-B'), where('targetAudience', '==', 'all'));
  await assertFails(getDocs(crossClass));
});
