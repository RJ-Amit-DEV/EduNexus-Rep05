# EduNexus enrollment and Firestore security model

## Identity and enrollment

- Teachers authenticate with Firebase Authentication and use `createTeacherClass` with a one-time institution-issued invitation. The backend creates a unique class code and binds the class to the teacher UID.
- A teacher registers each student through `addStudentToClass`. The backend validates roll-number uniqueness within that class, creates the student ID, and returns a high-entropy parent access code once. Only the code's SHA-256 hash is stored in `parentLinks`.
- Students authenticate with Google/Firebase and must submit their existing roll number and class code to `claimStudentEnrollment`. The backend links the enrollment to one Firebase UID and prevents that account from claiming another student.
- Parents authenticate with Google/Firebase and submit the one-time parent code to `claimParentAccess`. The backend links the parent UID to the exact student document and prevents the same account or code from being linked to another student.
- Student and parent dashboards read their canonical student document by document ID. Firestore rules enforce UID-linked access; a client-supplied name, roll number, or parent code is not sufficient to read an academic record.
- The teacher roster query is scoped to both the authenticated teacher UID and their class code. Notices and discussion queries are class-scoped.

## Required before production deployment

1. Provision a one-time teacher invitation code using `node functions/scripts/create-teacher-invite.mjs` from the repository root with `GOOGLE_APPLICATION_CREDENTIALS` pointing to an administrator service account and `TEACHER_INVITE_CODE` set to a long random secret. The script stores only its hash. Never commit service-account keys or invitation codes.
2. Run `npm --prefix functions install` and `npm --prefix functions run build`; then deploy Cloud Functions, Firestore rules, and indexes using the Firebase CLI configured for the intended Firebase project.
3. Configure Google as an enabled Firebase Authentication provider and add the exact local/deployment domains in Firebase Authentication settings.
4. Review and migrate existing records before enabling the new rules. Existing student documents need trusted `teacherUid` values and UID links where identities have been verified. Do not infer a parent UID from a parent code. Old low-entropy parent codes should be reissued.
5. Existing notices without `classCode`/ `authorId` and messages without `classCode` will not be visible under the new class-scoped rules; migrate or archive them deliberately.
6. Test the deployed rules and callable functions with the Firebase Emulator Suite and test accounts before production use.

## Callable functions

- `createTeacherClass({ displayName, teacherInviteCode })`
- `addStudentToClass({ classCode, name, rollNo, cgpa, ia1, ia2, attendance, quizPass })`
- `claimStudentEnrollment({ classCode, rollNo })`
- `claimParentAccess({ parentCode })`

The Firestore rules intentionally deny client-side creation of users, classes, student records, teacher invitations, and parent links. Trusted callable functions use the Admin SDK to provision these records.
