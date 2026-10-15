import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let database;
try {
  database = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  try {
    database = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    database = getFirestore(app);
  }
}

export const db = database;
export const auth = getAuth(app);
