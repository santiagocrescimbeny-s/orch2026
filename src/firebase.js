import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB1cmv1mcKwuoo0ruwXSPzI5v5YMWv8s",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "orchar2026.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://orchar2026-default-rtdb.firebaseio.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "orchar2026",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "orchar2026.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "803581330019",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:803581330019:web:b52d369fe1e54854a02e56",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LQI7PWNEDI"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app);
export default app;