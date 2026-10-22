# Teacher invitation provisioning

The teacher portal intentionally requires an institution-issued one-time invitation. A self-selected role is not proof that a user is a teacher.

1. Set `GOOGLE_APPLICATION_CREDENTIALS` to an administrator service-account JSON file outside the repository.
2. Set `TEACHER_INVITE_CODE` to a random secret with at least 12 characters.
3. Run `node functions/scripts/create-teacher-invite.mjs` from an environment with `firebase-admin` available (for example from `functions` after installing dependencies).
4. Give the raw code to the approved teacher privately. It is single-use; the Firestore document contains only its SHA-256 hash.
5. Never commit service-account keys or invitation codes.
