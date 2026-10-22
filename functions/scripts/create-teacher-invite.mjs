import { createHash } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const raw = process.env.TEACHER_INVITE_CODE?.trim().toUpperCase();
if (!raw || raw.length < 16) {
  console.error("Set TEACHER_INVITE_CODE to a random secret of at least 16 characters.");
  process.exit(1);
}
initializeApp({ credential: applicationDefault() });
const codeHash = createHash("sha256").update(raw).digest("hex");
await getFirestore().doc("teacherInvites/" + codeHash).create({
  active: true, claimedByUid: null, createdAt: new Date(),
  createdBy: process.env.INSTITUTION_ADMIN_UID || "manual-admin-provisioning"
});
console.log("One-time teacher invitation created. The raw code is not stored in Firestore.");
