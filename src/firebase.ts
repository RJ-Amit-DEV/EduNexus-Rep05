import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId;
if (!databaseId) {
  throw new Error('Firebase Firestore database ID is missing from firebase-applet-config.json.');
}

let database;
try {
  database = initializeFirestore(app, { localCache: memoryLocalCache() }, databaseId);
} catch {
  // If Firestore was already initialized, reuse the same explicitly configured database.
  database = getFirestore(app, databaseId);
}

export const db = database;
export const auth = getAuth(app);
