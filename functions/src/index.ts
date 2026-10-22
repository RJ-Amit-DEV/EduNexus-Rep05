import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const FIRESTORE_DATABASE_ID = "ai-studio-185f624b-3a40-477e-8250-23627f389344";
const db = getFirestore(undefined, FIRESTORE_DATABASE_ID);
const REGION = "us-central1";
const VERCEL_ORIGIN = "https://edu-nexus-rep05.vercel.app";
const cors = [VERCEL_ORIGIN, "http://localhost:3000", "http://localhost:5173"];

function requireAuth(request: any) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in with Google before continuing.");
  return request.auth.uid as string;
}
function clean(value: unknown, label: string, max = 120): string {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", label + " is required.");
  const result = value.trim();
  if (!result || result.length > max) throw new HttpsError("invalid-argument", label + " is invalid.");
  return result;
}
function normalize(value: unknown, label: string, max = 120): string {
  return clean(value, label, max).toUpperCase();
}
function hash(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}
function randomCode(prefix: string, bytes = 6) {
  return prefix + randomBytes(bytes).toString("hex").toUpperCase();
}
function profileBase(uid: string, request: any, role: "teacher" | "student" | "parent") {
  return {
    uid,
    email: String(request.auth?.token?.email || "").toLowerCase(),
    name: String(request.auth?.token?.name || "EduNexus user").slice(0, 120),
    avatar: String(request.auth?.token?.picture || ""),
    role,
    updatedAt: FieldValue.serverTimestamp(),
  };
}
function validMark(value: unknown, label: string, min: number, max: number, optional = true): number | null {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpsError("invalid-argument", label + " is outside the valid range.");
  return n;
}

export const createTeacherClass = onCall({ region: REGION, cors }, async (request) => {
  const uid = requireAuth(request);
  const teacherInviteCode = normalize(request.data?.teacherInviteCode, "Institution teacher invitation code", 160);
  const inviteHash = hash(teacherInviteCode);
  const inviteRef = db.doc("teacherInvites/" + inviteHash);
  const userRef = db.doc("users/" + uid);
  const classCode = randomCode("CLS-", 5);
  const classRef = db.doc("classes/" + classCode);
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const [inviteSnap, userSnap] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);
    if (!inviteSnap.exists) {
      throw new HttpsError("permission-denied", "The teacher invitation code is invalid or already used. Ask your institution for a valid invitation.");
    }
    const invite = inviteSnap.data()!;
    if (invite.claimedByUid && invite.claimedByUid !== uid) {
      throw new HttpsError("already-exists", "This teacher invitation has already been used.");
    }
    if (!invite.active) {
      if (invite.claimedByUid === uid && userSnap.exists && userSnap.data()?.role === "teacher" && userSnap.data()?.classCode) return;
      throw new HttpsError("permission-denied", "The teacher invitation code is invalid or already used. Ask your institution for a valid invitation.");
    }
    if (userSnap.exists && userSnap.data()?.role && userSnap.data()?.role !== "teacher") {
      throw new HttpsError("permission-denied", "This Google account is already registered for a different portal.");
    }
    if (userSnap.exists && userSnap.data()?.classCode) return;
    tx.update(inviteRef, { active: false, claimedByUid: uid, claimedAt: now });
    tx.set(classRef, {
      classCode, teacherUid: uid, teacherName: String(request.data?.displayName || request.auth?.token?.name || "Teacher").trim().slice(0, 120),
      createdAt: now, status: "active",
    });
    tx.set(userRef, {
      ...profileBase(uid, request, "teacher"),
      name: String(request.data?.displayName || request.auth?.token?.name || "Teacher").trim().slice(0, 120),
      classCode, department: "Teaching Staff", about: "EduNexus teacher",
      college: "Institute of Engineering & Technology",
    }, { merge: true });
  });
  const snap = await userRef.get();
  return { classCode: snap.data()?.classCode || classCode, role: "teacher" };
});

export const addStudentToClass = onCall({ region: REGION, cors }, async (request) => {
  const uid = requireAuth(request);
  const classCode = normalize(request.data?.classCode, "Class code", 40);
  const name = clean(request.data?.name, "Student name", 120);
  const rollNo = normalize(request.data?.rollNo, "Student roll number", 60);
  const classRef = db.doc("classes/" + classCode);
  const teacherRef = db.doc("users/" + uid);
  const studentRef = db.collection("students").doc();
  const studentId = randomCode("STU-", 6);
  const parentCode = randomCode("PAR-", 16);
  const parentId = randomCode("PAR-ID-", 6);
  const parentCodeHash = hash(parentCode);
  const parentLinkRef = db.doc("parentLinks/" + parentCodeHash);
  const cgpa = validMark(request.data?.cgpa, "CGPA", 0, 10);
  const ia1 = validMark(request.data?.ia1, "IA1", 0, 20);
  const ia2 = validMark(request.data?.ia2, "IA2", 0, 20);
  const attendance = validMark(request.data?.attendance, "Attendance", 0, 100);
  const quizPass = validMark(request.data?.quizPass, "Quiz score", 0, 100);

  await db.runTransaction(async (tx) => {
    const [classSnap, teacherSnap, existing] = await Promise.all([
      tx.get(classRef), tx.get(teacherRef),
      tx.get(db.collection("students").where("classCode", "==", classCode).where("rollNo", "==", rollNo).limit(1)),
    ]);
    if (!classSnap.exists || classSnap.data()?.teacherUid !== uid ||
        !teacherSnap.exists || teacherSnap.data()?.role !== "teacher" || teacherSnap.data()?.classCode !== classCode) {
      throw new HttpsError("permission-denied", "You can only add students to your own registered class.");
    }
    if (!existing.empty) throw new HttpsError("already-exists", "That roll number is already registered in this class.");
    tx.create(studentRef, {
      studentId, parentId, parentLinkId: parentCodeHash,
      classCode, teacherUid: uid, studentUid: null, parentUid: null,
      rollNo, name, cgpa: cgpa ?? "", ia1: ia1 ?? 0, ia2: ia2 ?? 0,
      attendance: attendance ?? 0, quizPass: quizPass ?? 0,
      batch: "INFTT-1", college: "Institute of Engineering & Technology",
      course: "B.E. Information Technology", createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(parentLinkRef, {
      studentDocId: studentRef.id, classCode, teacherUid: uid,
      codeHash: parentCodeHash, active: true, consumedByUid: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { studentDocId: studentRef.id, studentId, parentCode, classCode, rollNo };
});

export const claimStudentEnrollment = onCall({ region: REGION, cors }, async (request) => {
  const uid = requireAuth(request);
  const rollNo = normalize(request.data?.rollNo, "Registered roll number", 60);
  const classCode = normalize(request.data?.classCode, "Class code", 40);
  const userRef = db.doc("users/" + uid);
  const matches = await db.collection("students").where("classCode", "==", classCode).where("rollNo", "==", rollNo).limit(2).get();
  if (matches.size !== 1) throw new HttpsError("permission-denied", "The roll number and class code do not match one unique student record.");
  const studentRef = matches.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const [studentSnap, userSnap] = await Promise.all([tx.get(studentRef), tx.get(userRef)]);
    if (!studentSnap.exists) throw new HttpsError("not-found", "Student enrollment was not found.");
    const student = studentSnap.data()!;
    if (userSnap.exists && userSnap.data()?.role && userSnap.data()?.role !== "student") {
      throw new HttpsError("permission-denied", "This Google account is already registered for a different portal.");
    }
    if (userSnap.exists && userSnap.data()?.studentDocId && userSnap.data()?.studentDocId !== studentRef.id) throw new HttpsError("already-exists", "This Google account is already linked to a different student.");
    if (student.studentUid && student.studentUid !== uid) {
      throw new HttpsError("already-exists", "This student enrollment has already been claimed by another Google account. Contact your teacher if you need account recovery.");
    }
    tx.update(studentRef, { studentUid: uid, updatedAt: FieldValue.serverTimestamp() });
    tx.set(userRef, {
      ...profileBase(uid, request, "student"), studentDocId: studentRef.id,
      studentId: student.studentId, rollNo: student.rollNo, classCode: student.classCode,
      teacherUid: student.teacherUid, parentId: student.parentId,
      college: student.college, course: student.course, semester: "Semester IV",
    }, { merge: true });
  });
  return { studentDocId: studentRef.id };
});

export const claimParentAccess = onCall({ region: REGION, cors }, async (request) => {
  const uid = requireAuth(request);
  const parentCode = normalize(request.data?.parentCode, "Parent access code", 160);
  const codeHash = hash(parentCode);
  const linkRef = db.doc("parentLinks/" + codeHash);
  const userRef = db.doc("users/" + uid);
  let studentDocId = "";
  await db.runTransaction(async (tx) => {
    const [linkSnap, userSnap] = await Promise.all([tx.get(linkRef), tx.get(userRef)]);
    if (!linkSnap.exists || linkSnap.data()?.active !== true) throw new HttpsError("permission-denied", "The parent access code is invalid or already used.");
    const link = linkSnap.data()!;
    if (link.consumedByUid && link.consumedByUid !== uid) throw new HttpsError("already-exists", "This parent code has already been linked to another Google account.");
    if (userSnap.exists && userSnap.data()?.role && userSnap.data()?.role !== "parent") {
      throw new HttpsError("permission-denied", "This Google account is already registered for a different portal.");
    }
    if (userSnap.exists && userSnap.data()?.childStudentDocId && userSnap.data()?.childStudentDocId !== link.studentDocId) throw new HttpsError("already-exists", "This parent account is already linked to a different student.");
    const studentRef = db.doc("students/" + link.studentDocId);
    const studentSnap = await tx.get(studentRef);
    if (!studentSnap.exists) throw new HttpsError("not-found", "The student record linked to this code no longer exists.");
    if (studentSnap.data()?.parentUid && studentSnap.data()?.parentUid !== uid) {
      throw new HttpsError("already-exists", "This student already has a linked parent account. Contact the institution to reissue access.");
    }
    tx.update(linkRef, { active: false, consumedByUid: uid, consumedAt: FieldValue.serverTimestamp() });
    tx.update(studentRef, { parentUid: uid, updatedAt: FieldValue.serverTimestamp() });
    tx.set(userRef, {
      ...profileBase(uid, request, "parent"), childStudentDocId: studentRef.id,
      childStudentId: studentSnap.data()?.studentId, childName: studentSnap.data()?.name,
      parentId: studentSnap.data()?.parentId, classCode: studentSnap.data()?.classCode,
      teacherUid: studentSnap.data()?.teacherUid,
    }, { merge: true });
    studentDocId = studentRef.id;
  });
  return { studentDocId };
});
