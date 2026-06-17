import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBzoc3wEIwfGHOWOWaV38Loq3ZdIdpzoT0",
  authDomain: "voxofied-be8ca.firebaseapp.com",
  projectId: "voxofied-be8ca",
  storageBucket: "voxofied-be8ca.firebasestorage.app",
  messagingSenderId: "327594664716",
  appId: "1:327594664716:web:151470fb0f8e37897b1f29",
  measurementId: "G-BVRT840XL2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
