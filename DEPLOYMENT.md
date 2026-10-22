# EduNexus production enrollment and access

## Required Firebase configuration
- Project ID: `gen-lang-client-0344681124`.
- Firestore database ID: `ai-studio-185f624b-3a40-477e-8250-23627f389344`.
- Enable the **Google** provider in Firebase Authentication for teachers.
- Student and parent login use high-entropy teacher-issued access codes and Firebase custom tokens; they do not use Google or email accounts.
- Ensure the Cloud Functions runtime service account can sign Firebase custom tokens (grant **Service Account Token Creator** to the runtime service account on itself if the project requires it).
- Keep `edu-nexus-rep05.vercel.app` in Firebase Authentication authorized domains for teacher Google sign-in. Add exact Vercel preview domains only if you intend to test teacher OAuth on those previews.
- Teacher invitation codes are one-time, administrator-provisioned secrets. Generate a separate invitation for each teacher who needs to create a class.

## Provision teacher invitation codes
Run from the repository root in a trusted administrator environment with Application Default Credentials for the correct Firebase project. Never commit service-account credentials.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/admin-service-account.json
export TEACHER_INVITE_CODE="$(openssl rand -hex 16)"
node functions/scripts/create-teacher-invite.mjs
```

Share the code privately with one approved teacher. Repeat the process with a **new** code for each additional teacher. Existing teacher accounts can sign in again with Google and leave the invitation field blank.

## Enrollment flow
1. Teacher signs in with Google and an institution invitation. EduNexus creates a unique class code.
2. Teacher registers a student with a unique roll number. The backend generates a student login code and a separate parent access code. The raw codes are returned only at creation; only hashes/metadata are stored.
3. Share the student code privately with the student and the parent code privately with the guardian. The codes are reusable credentials; treat them like passwords.
4. Each code redeems to a stable, code-derived Firebase UID, so the same user can sign in on another device without Google. Student records remain bound to their class/teacher; parent access is bound to exactly one linked child.
5. If a code is lost or exposed, do not share it publicly. An administrator should provision replacement access through a controlled process before reusing the platform with real student data.

## Build and deploy
```bash
npm ci
npm run lint
npm run build
npm --prefix functions install
npm --prefix functions run build
firebase deploy --project gen-lang-client-0344681124 --only functions,firestore:rules,firestore:indexes
```

Deploy Cloud Functions and Firestore rules/indexes before publishing the new frontend. Review the Firebase CLI's function update/delete plan carefully; the legacy Google/roll-number claim endpoints now return a failed-precondition error.

## Data migration and rollout
The rules intentionally deny legacy records that lack trusted `teacherUid`, `studentUid`, and `parentUid` links. Back up the database, verify identities, and migrate legacy documents with an Admin SDK script before production cutover. Do not infer parent identity from old `PAR-####` identifiers. Existing student records need new private access-code documents created by an administrator or by re-registering them through the teacher dashboard.

## Manual release acceptance checklist
- Teacher A signs in with invitation A and receives class code A.
- Teacher B signs in with invitation B and receives a different class code B.
- Teacher A cannot list or modify Teacher B's roster.
- Register a student in class A; confirm the UI displays one student code and one distinct parent code.
- Student code signs in without Google and shows only that student's CGPA/IA1/IA2 and class notices.
- Parent code signs in without Google and shows only the linked child's records and parent/all notices.
- A parent cannot read discussion messages or another student's record.
- An invalid code, wrong role, duplicate roll number, or inactive parent code is rejected.
- Reload and sign in again using the same code; access remains linked to the same stable identity.
- Verify Cloud Functions, Firestore rules, composite indexes, and the production Vercel build in their respective consoles. A green frontend CI run alone does not prove Firebase deployment succeeded.
