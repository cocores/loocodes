import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Set for local dev against `firebase emulators:start` — lets the app run
// against Firestore without a real project/credentials.
const EMULATOR_HOST = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? (EMULATOR_HOST ? "demo-api-key" : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? (EMULATOR_HOST ? "demo-loocodes" : undefined),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "No Firebase project configured. Set VITE_FIREBASE_* env vars (see web/README.md).",
    );
  }
  if (!app) app = initializeApp(config);
  if (!db) {
    db = getFirestore(app);
    if (EMULATOR_HOST) {
      const [host, port] = EMULATOR_HOST.split(":");
      connectFirestoreEmulator(db, host, Number(port));
    }
  }
  return db;
}
