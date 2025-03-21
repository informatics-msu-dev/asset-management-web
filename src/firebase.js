import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDcoxZUsGJfgkI256l8GgkGOqZY15DmPJg",
    authDomain: "repair-service-64038.firebaseapp.com",
    databaseURL: "https://repair-service-64038-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "repair-service-64038",
    storageBucket: "repair-service-64038.firebasestorage.app",
    messagingSenderId: "239837293511",
    appId: "1:239837293511:web:6d9bf0041905544b7647e2",
    measurementId: "G-PJT0E99060"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
