// ====== Firebase Singleton Configuration (Client-side) ======
// This file initializes Firebase ONLY ONCE (singleton pattern).
// Uses the provided Firebase config for Apna Cricket project.
// Analytics is initialized only in browser environment.

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDT6DmyY3eCt24P_q053aevVayQ_OwjTfc",
  authDomain: "apna-7c472.firebaseapp.com",
  projectId: "apna-7c472",
  storageBucket: "apna-7c472.firebasestorage.app",
  messagingSenderId: "421635256337",
  appId: "1:421635256337:web:b73e769aae4253c12f41b0",
  measurementId: "G-TZ8W2JES68",
};

// ====== Singleton: prevent duplicate initializeApp() ======
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ====== Initialize Firestore ======
const db = getFirestore(app);

// ====== Initialize Auth (client-side only) ======
const auth = typeof window !== "undefined" ? getAuth(app) : null;

// ====== Initialize Storage ======
const storage = getStorage(app);

// ====== Initialize Analytics (browser only, lazy-loaded) ======
let analytics: any = null;
if (typeof window !== "undefined") {
  // Dynamic import to avoid SSR issues
  import("firebase/analytics")
    .then(({ getAnalytics }) => {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics may fail in dev — ignore
      }
    })
    .catch(() => {
      // Ignore analytics errors
    });
}

export { app, db, auth, storage, analytics };
export default app;
