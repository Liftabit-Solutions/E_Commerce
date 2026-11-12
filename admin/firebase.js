// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword,
  signInWithEmailAndPassword } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuYajQJpadF-Nmg4BhA5MQuXlctI4WjHQ",
  authDomain: "clean-every-day.firebaseapp.com",
  projectId: "clean-every-day",
  storageBucket: "clean-every-day.firebasestorage.app",
  messagingSenderId: "645530120032",
  appId: "1:645530120032:web:1e9b58f803657dc7d13805",
  measurementId: "G-0KWJDK55D5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();