import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
initializeApp();
const db = getFirestore();
const normalize = (v: unknown) => String(v ?? "").trim().toUpperCase();
const codeHash = (v: string) => createHash("sha256").update(v).digest("hex");
const randomCode = (prefix: string, bytes = 5) => prefix + randomBytes(bytes).toString("hex").toUpperCase();
function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } | null }) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in before continuing.");
  return request.auth;
}
export const createTeacherClass = onCall({ cors: ["https://edu-nexus-rep05.vercel.app"] }, async (request) => {
  const auth = requireAuth(request), uid = auth.uid;
  const inviteCode = normalize(request.data?.teacherInviteCode);
  if (!inviteCode) throw new HttpsError("permission-denied", "An institution-issued teacher invitation code is required.");
  const inviteRef = db.doc(`teacherInvites/${codeHash(inviteCode)}`);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists || inviteSnap.data()?.active !== true) throw new HttpsError("permission-denied", "Teacher invitation code is invalid or inactive.");
  if (inviteSnap.data()?.claimedByUid && inviteSnap.data()?.claimedByUid !== uid) throw new HttpsError("already-exists", "Teacher invitation code has already been used.");
  const profileRef = db.doc(`users/${uid}`), existing = await profileRef.get();
  if (existing.exists && existing.data()?.role !== "teacher") throw new HttpsError("permission-denied", "This account is registered for another portal.");
  if (existing.exists && existing.data()?.classCode) return { classCode: existing.data()!.classCode as string };
  const displayName = String(request.data?.displayName ?? auth.token.name ?? "Teacher").trim().slice(0, 100);
  let classCode = "";
  for (let i = 0; i < 8; i++) {
    const candidate = randomCode("CLS-", 4);
    if (!(await db.doc(`classes/${candidate}`).get()).exists) { classCode = candidate; break; }
  }
  if (!classCode) throw new HttpsError("resource-exhausted", "Could not allocate a class code. Try again.");
  const batch = db.batch();
  batch.update(inviteRef, { claimedByUid: uid, claimedAt: FieldValue.serverTimestamp() });
  batch.set(db.doc(`classes/${classCode}`), { classCode, teacherUid: uid, teacherName: displayName, active: true, createdAt: FieldValue.serverTimestamp() });
  batch.set(profileRef, { uid, name: displayName, email: String(auth.token.email ?? ""), role: "teacher", classCode, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  return { classCode };
});
export const addStudentToClass = onCall({ cors: ["https://edu-nexus-rep05.vercel.app"] }, async (request) => {
  const auth = requireAuth(request);
  const classCode = normalize(request.data?.classCode), name = String(request.data?.name ?? "").trim().slice(0, 120), rollNo = normalize(request.data?.rollNo);
  if (!classCode || !name || !rollNo) throw new HttpsError("invalid-argument", "Class code, student name, and roll number are required.");
  const classRef = db.doc(`classes/${classCode}`), classSnap = await classRef.get();
  if (!classSnap.exists || classSnap.data()?.teacherUid !== auth.uid || classSnap.data()?.active !== true) throw new HttpsError("permission-denied", "You can only register students in your own active class.");
  const duplicate = await db.collection("students").where("classCode", "==", classCode).where("rollNo", "==", rollNo).limit(1).get();
  if (!duplicate.empty) throw new HttpsError("already-exists", "That roll number is already registered in this class.");
  const cgpaRaw = request.data?.cgpa;
  const cgpa = cgpaRaw === undefined || cgpaRaw === null || cgpaRaw === "" ? "" : Number(cgpaRaw);
  const ia1 = request.data?.ia1 === undefined ? null : Number(request.data.ia1);
  const ia2 = request.data?.ia2 === undefined ? null : Number(request.data.ia2);
  const attendance = request.data?.attendance === undefined ? null : Number(request.data.attendance);
  const quizPass = request.data?.quizPass === undefined ? null : Number(request.data.quizPass);
  if ((cgpa !== "" && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) ||
      [ia1, ia2].some(v => v !== null && (!Number.isFinite(v) || v < 0 || v > 20)) ||
      [attendance, quizPass].some(v => v !== null && (!Number.isFinite(v) || v < 0 || v > 100))) {
    throw new HttpsError("invalid-argument", "Academic marks are outside their valid ranges.");
  }
  const studentRef = db.collection("students").doc(), studentId = randomCode("STU-", 6), parentCode = randomCode("PAR-", 8), hash = codeHash(parentCode);
  const linkRef = db.doc(`parentLinks/${hash}`);
  await db.runTransaction(async tx => {
    const dup = await tx.get(db.collection("students").where("classCode", "==", classCode).where("rollNo", "==", rollNo).limit(1));
    if (!dup.empty) throw new HttpsError("already-exists", "That roll number is already registered in this class.");
    tx.create(studentRef, { studentId, rollNo, name, classCode, teacherUid: auth.uid, studentUid: null, parentUid: null, parentLinkId: hash, cgpa, ia1, ia2, attendance, quizPass, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.create(linkRef, { studentDocId: studentRef.id, studentId, classCode, teacherUid: auth.uid, codeHash: hash, claimedByUid: null, active: true, createdAt: FieldValue.serverTimestamp() });
  });
  return { studentDocId: studentRef.id, studentId, parentCode, classCode, rollNo };
});
export const claimStudentEnrollment = onCall({ cors: ["https://edu-nexus-rep05.vercel.app"] }, async (request) => {
  const auth = requireAuth(request), classCode = normalize(request.data?.classCode), rollNo = normalize(request.data?.rollNo);
  if (!classCode || !rollNo) throw new HttpsError("invalid-argument", "Roll number and class code are required.");
  const found = await db.collection("students").where("classCode", "==", classCode).where("rollNo", "==", rollNo).limit(2).get();
  if (found.size !== 1) throw new HttpsError("not-found", "No unique enrollment matches that roll number and class code.");
  const studentRef = found.docs[0].ref, profileRef = db.doc(`users/${auth.uid}`);
  await db.runTransaction(async tx => {
    const [s, p] = await Promise.all([tx.get(studentRef), tx.get(profileRef)]);
    const student = s.data()!;
    if (student.studentUid && student.studentUid !== auth.uid) throw new HttpsError("already-exists", "This enrollment is already linked to another account.");
    if (p.exists && p.data()?.role !== "student") throw new HttpsError("permission-denied", "This account is registered for another portal.");
    if (p.exists && p.data()?.studentDocId && p.data()?.studentDocId !== studentRef.id) throw new HttpsError("already-exists", "This account is already linked to a different student enrollment.");
    tx.update(studentRef, { studentUid: auth.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.set(profileRef, { uid: auth.uid, name: String(auth.token.name ?? student.name), email: String(auth.token.email ?? ""), role: "student", studentDocId: studentRef.id, studentId: student.studentId, rollNo: student.rollNo, classCode: student.classCode, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { studentDocId: studentRef.id, studentId: found.docs[0].data().studentId, classCode, rollNo };
});
export const claimParentAccess = onCall({ cors: ["https://edu-nexus-rep05.vercel.app"] }, async (request) => {
  const auth = requireAuth(request), parentCode = normalize(request.data?.parentCode);
  if (!parentCode) throw new HttpsError("invalid-argument", "Parent access code is required.");
  const hash = codeHash(parentCode), linkRef = db.doc(`parentLinks/${hash}`), linkSnap = await linkRef.get();
  if (!linkSnap.exists || linkSnap.data()?.active !== true) throw new HttpsError("not-found", "Parent access code is invalid or inactive.");
  const link = linkSnap.data()!, studentRef = db.doc(`students/${link.studentDocId}`), profileRef = db.doc(`users/${auth.uid}`);
  await db.runTransaction(async tx => {
    const [currentLink, studentSnap, profileSnap] = await Promise.all([tx.get(linkRef), tx.get(studentRef), tx.get(profileRef)]);
    const current = currentLink.data();
    if (!currentLink.exists || current?.active !== true) throw new HttpsError("not-found", "Parent access code is invalid or inactive.");
    if (current.claimedByUid && current.claimedByUid !== auth.uid) throw new HttpsError("already-exists", "This parent code has already been claimed.");
    if (studentSnap.data()?.parentUid && studentSnap.data()?.parentUid !== auth.uid) throw new HttpsError("already-exists", "This student already has a linked parent account. Contact the institution to add another guardian.");
    if (profileSnap.exists && profileSnap.data()?.role !== "parent") throw new HttpsError("permission-denied", "This account is registered for another portal.");
    if (profileSnap.exists && profileSnap.data()?.childStudentDocId && profileSnap.data()?.childStudentDocId !== studentRef.id) throw new HttpsError("already-exists", "This parent account is already linked to a different student.");
    tx.update(linkRef, { claimedByUid: auth.uid, claimedAt: FieldValue.serverTimestamp() });
    tx.update(studentRef, { parentUid: auth.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.set(profileRef, { uid: auth.uid, name: String(auth.token.name ?? "Parent/Guardian"), email: String(auth.token.email ?? ""), role: "parent", childStudentId: link.studentId, childStudentDocId: link.studentDocId, parentLinkId: hash, classCode: link.classCode, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { studentDocId: link.studentDocId, studentId: link.studentId, classCode: link.classCode };
});
