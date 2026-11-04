
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDX98ie6QcP75icaxPmjJnuVUYBWFyvVg",
  authDomain: "radar-bot-877e7.firebaseapp.com",
  projectId: "radar-bot-877e7",
  storageBucket: "radar-bot-877e7.firebasestorage.app",
  messagingSenderId: "228969710584",
  appId: "1:228969710584:web:3c3700b35b6f6489200c0d",
  measurementId: "G-X45H729MR6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});
