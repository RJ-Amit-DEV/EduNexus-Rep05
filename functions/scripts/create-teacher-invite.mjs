import { createHash } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.TEACHER_INVITE_CODE?.trim().toUpperCase();
if (!raw || raw.length < 12) {
  console.error("Set TEACHER_INVITE_CODE to a one-time institution-issued secret of at least 12 characters.");
  process.exit(1);
}
initializeApp({ credential: applicationDefault() });
const hash = createHash("sha256").update(raw).digest("hex");
await getFirestore().doc(`teacherInvites/${hash}`).create({
  active: true,
  claimedByUid: null,
  createdAt: new Date(),
  createdBy: process.env.INSTITUTION_ADMIN_UID || "manual-admin-provisioning"
});
console.log("Teacher invitation provisioned. Give the raw code to one approved teacher; it is not stored in Firestore.");
