# EduNexus secure enrollment deployment

## Before deployment
- Confirm the Firebase project ID is `gen-lang-client-0344681124` and that you have project-owner/editor access.
- Enable Google in Firebase Authentication and add `edu-nexus-rep05.vercel.app` to Authorized domains.
- The teacher signup flow requires an institution-issued, one-time invitation code. This prevents any Google user from self-assigning the teacher role.
- Student claim uses Google authentication plus the teacher-provided roll number and class code. A roster record can only be claimed once.
- Parent claim uses a high-entropy, one-time parent access code. The code is shown only once when the teacher registers the student; Firestore stores only its hash and binds the parent's UID to one student.

## Provision first teacher invitation
Run from the repository root in an administrator environment with Application Default Credentials pointing at a Firebase admin service account. Do not commit service account keys.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/admin-service-account.json
export TEACHER_INVITE_CODE="$(openssl rand -hex 16)"
node functions/scripts/create-teacher-invite.mjs
```

Share the value of `TEACHER_INVITE_CODE` privately with the approved teacher. It is single-use.

## Build and deploy
```bash
npm ci
npm run lint
npm run build
npm --prefix functions install
npm --prefix functions run build
firebase deploy --project gen-lang-client-0344681124 --only functions,firestore:rules,firestore:indexes
```

The deploying account must have permission to deploy Cloud Functions and Firestore rules/indexes. Deploy the functions before enabling the updated client flow if the current production frontend is still live.

## Data migration warning
The new rules intentionally deny legacy records that lack trusted `teacherUid`, `studentUid`, and `parentUid` links. Back up the database, verify identities, and migrate legacy documents with an Admin SDK script before production cutover. Never infer or assign parent UIDs based only on old `PAR-####` codes. Reissue old predictable parent codes.
