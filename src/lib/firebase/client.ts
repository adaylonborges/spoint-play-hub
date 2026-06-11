import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAC4jDiv0nNuQzah8cSrS4wQFN2AXjVZnA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "poc-fidelidade-dev-ibg6ve.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "poc-fidelidade-dev-ibg6ve",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "poc-fidelidade-dev-ibg6ve.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "544123245104",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:544123245104:web:0168ca22b695ba0b5dd3f5",
  measurementId: "G-63BM4HEPNJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Se você instalar o Java futuramente e quiser rodar os emuladores locais (npx firebase-tools emulators:start),
// basta descomentar o bloco abaixo para apontar o app local para o banco simulado.
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectStorageEmulator(storage, "127.0.0.1", 9199);
// }
