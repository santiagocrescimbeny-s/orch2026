
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBIcmyimekWwoeOQruvwXSP2tSv5YYMv8s",
    authDomain: "orchar2026.firebaseapp.com",
    databaseURL: "https://orchar2026-default-rtdb.firebaseio.com",
    projectId: "orchar2026",
    storageBucket: "orchar2026.firebasestorage.app",
    messagingSenderId: "803581330019",
    appId: "1:803581330019:web:b52d369fe1e54854a02e56",
    measurementId: "G-LQ1ZMWREDH"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app);