import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyB26FSx9mybYC0tp8XEnvD-T4PpF2qCMB4",
  authDomain: "andreacardonaspa.firebaseapp.com",
  projectId: "andreacardonaspa",
  storageBucket: "andreacardonaspa.firebasestorage.app",
  messagingSenderId: "218605189150",
  appId: "1:218605189150:web:13a1dcd513cdba8829960f",
  measurementId: "G-MWM47FK07Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Database
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
