import { createHash, randomBytes } from "node:crypto";
import { getApp, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const FIRESTORE_DATABASE_ID = "ai-studio-185f624b-3a40-477e-8250-23627f389344";
const db = getFirestore(getApp(), FIRESTORE_DATABASE_ID);
const REGION = "us-central1";
const VERCEL_ORIGIN = "https://edu-nexus-rep05.vercel.app";
const cors = [VERCEL_ORIGIN, /^https:\/\/edu-nexus-rep05(?:-[a-z0-9-]+)?-amits-projects-58dfb76c\.vercel\.app$/, "http://localhost:3000", "http://localhost:5173"];

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
  const rawInviteCode = typeof request.data?.teacherInviteCode === "string"
    ? request.data.teacherInviteCode.trim().toUpperCase()
    : "";
  const inviteRef = db.doc("teacherInvites/" + hash(rawInviteCode));
  const userRef = db.doc("users/" + uid);
  const classCode = randomCode("CLS-", 5);
  const classRef = db.doc("classes/" + classCode);
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const [inviteSnap, userSnap] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);
    if (userSnap.exists && userSnap.data()?.role === "teacher" && userSnap.data()?.classCode) {
      const existingClassCode = userSnap.data()!.classCode;
      const existingClass = await tx.get(db.doc("classes/" + existingClassCode));
      if (existingClass.exists && existingClass.data()?.teacherUid === uid) return;
    }
    if (!rawInviteCode) throw new HttpsError("invalid-argument", "New teachers need an institution-issued invitation code.");
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
  const studentAccessCode = randomCode("STU-LOGIN-", 12);
  const studentAccessCodeHash = hash(studentAccessCode);
  const studentAccessRef = db.doc("studentAccessCodes/" + studentAccessCodeHash);
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
    tx.create(studentAccessRef, {
      studentDocId: studentRef.id, classCode, teacherUid: uid, active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(parentLinkRef, {
      studentDocId: studentRef.id, classCode, teacherUid: uid,
      codeHash: parentCodeHash, active: true, consumedByUid: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { studentDocId: studentRef.id, studentId, studentAccessCode, parentCode, classCode, rollNo };
});

// Student and parent access codes are high-entropy bearer credentials. They map to stable
// Firebase UIDs so the same code works on another device without Google or email accounts.
export const redeemPortalAccessCode = onCall({ region: REGION, cors }, async (request) => {
  const role = request.data?.role;
  if (role !== "student" && role !== "parent") {
    throw new HttpsError("invalid-argument", "Choose either the student or parent portal.");
  }
  const accessCode = normalize(request.data?.accessCode, role === "student" ? "Student login code" : "Parent access code", 160);
  const codeHash = hash(accessCode);
  const uid = (role === "student" ? "student_" : "parent_") + codeHash.slice(0, 40);
  const userRef = db.doc("users/" + uid);
  let studentDocId = "";

  if (role === "student") {
    const studentAccessRef = db.doc("studentAccessCodes/" + codeHash);
    const accessSnap = await studentAccessRef.get();
    if (!accessSnap.exists || accessSnap.data()?.active !== true || typeof accessSnap.data()?.studentDocId !== "string") {
      throw new HttpsError("permission-denied", "The student login code is invalid or inactive. Ask your teacher to verify or reissue it.");
    }
    const studentRef = db.doc("students/" + accessSnap.data()!.studentDocId);
    await db.runTransaction(async (tx) => {
      const [accessRecord, studentSnap, userSnap] = await Promise.all([tx.get(studentAccessRef), tx.get(studentRef), tx.get(userRef)]);
      if (!accessRecord.exists || accessRecord.data()?.active !== true || accessRecord.data()?.studentDocId !== studentRef.id || !studentSnap.exists) {
        throw new HttpsError("permission-denied", "The student login code is invalid.");
      }
      const student = studentSnap.data()!;
      if (student.studentUid && student.studentUid !== uid) {
        throw new HttpsError("failed-precondition", "This student record was linked through the old login system. Ask the teacher to reissue the student code.");
      }
      if (userSnap.exists && (userSnap.data()?.role !== "student" || userSnap.data()?.studentDocId !== studentRef.id)) {
        throw new HttpsError("already-exists", "This access code is already associated with a different portal profile.");
      }
      tx.update(studentRef, { studentUid: uid, updatedAt: FieldValue.serverTimestamp() });
      tx.set(userRef, {
        uid, email: "", name: student.name, avatar: "", role: "student",
        studentDocId: studentRef.id, studentId: student.studentId, rollNo: student.rollNo,
        classCode: student.classCode, teacherUid: student.teacherUid, parentId: student.parentId,
        college: student.college || "", course: student.course || "", semester: "Semester IV",
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      studentDocId = studentRef.id;
    });
  } else {
    const parentName = typeof request.data?.displayName === "string"
      ? clean(request.data.displayName, "Parent / guardian name", 120)
      : "Parent / Guardian";
    const linkRef = db.doc("parentLinks/" + codeHash);
    await db.runTransaction(async (tx) => {
      const [linkSnap, userSnap] = await Promise.all([tx.get(linkRef), tx.get(userRef)]);
      if (!linkSnap.exists) throw new HttpsError("permission-denied", "The parent access code is invalid. Ask your teacher to verify or reissue it.");
      const link = linkSnap.data()!;
      if (link.codeHash !== codeHash) throw new HttpsError("permission-denied", "The parent access code is invalid.");
      const studentRef = db.doc("students/" + String(link.studentDocId || ""));
      const studentSnap = await tx.get(studentRef);
      if (!studentSnap.exists) throw new HttpsError("not-found", "The student record linked to this code no longer exists.");
      if (link.consumedByUid && link.consumedByUid !== uid) {
        throw new HttpsError("failed-precondition", "This parent access code is linked to another account. Ask the teacher to reissue it.");
      }
      if (!link.active && !(link.consumedByUid === uid && userSnap.exists && userSnap.data()?.role === "parent" && userSnap.data()?.childStudentDocId === studentRef.id)) {
        throw new HttpsError("permission-denied", "The parent access code is inactive. Ask your teacher to reissue it.");
      }
      if (userSnap.exists && (userSnap.data()?.role !== "parent" || userSnap.data()?.childStudentDocId !== studentRef.id)) {
        throw new HttpsError("already-exists", "This access code is already associated with a different portal profile.");
      }
      if (studentSnap.data()?.parentUid && studentSnap.data()?.parentUid !== uid) {
        throw new HttpsError("failed-precondition", "This student is linked to a different parent account. Ask the institution to review the link.");
      }
      if (link.active) {
        tx.update(linkRef, { active: false, consumedByUid: uid, consumedAt: FieldValue.serverTimestamp() });
        tx.update(studentRef, { parentUid: uid, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.set(userRef, {
        uid, email: "", name: parentName, avatar: "", role: "parent",
        childStudentDocId: studentRef.id, childStudentId: studentSnap.data()?.studentId,
        childName: studentSnap.data()?.name, parentId: studentSnap.data()?.parentId,
        classCode: studentSnap.data()?.classCode, teacherUid: studentSnap.data()?.teacherUid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      studentDocId = studentRef.id;
    });
  }

  const customToken = await getAdminAuth().createCustomToken(uid, { portalRole: role });
  return { customToken, studentDocId, role };
});

// Disable the previous Google-account/roll-number enrollment endpoints. All student and parent
// sign-ins must go through the high-entropy code redemption flow above.
export const claimStudentEnrollment = onCall({ region: REGION, cors }, async () => {
  throw new HttpsError("failed-precondition", "Student login now requires the unique student access code issued by the teacher.");
});
export const claimParentAccess = onCall({ region: REGION, cors }, async () => {
  throw new HttpsError("failed-precondition", "Parent login now requires the parent access code issued by the teacher.");
});
