import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-uMGOpeYJb3HNnRWVwjIqOni8fJtvRNM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "spoint-play-hub.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "spoint-play-hub",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "spoint-play-hub.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "688969783166",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:688969783166:web:3ab881ae38f747ead2852f",
  measurementId: "G-FS1KQW20PG"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
