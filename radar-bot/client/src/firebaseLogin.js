import api from "./api.js";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

export async function loginWithGoogle() {
  // Sign in using Google Firebase authentication
  const result = await signInWithPopup(auth, googleProvider);

  // Get Firebase ID token
  const idToken = await result.user.getIdToken();

  // Clean Fix: Leverage your imported 'api' axios instance tool to manage the path correctly
  const response = await api.post("/auth/firebase", { idToken });
  const data = response.data;

  if (!data.token || !data.user) {
    throw new Error("Backend did not return a valid Radar Bot login token.");
  }

  // Save Radar Bot JWT using the SAME key as App.jsx
  localStorage.setItem("radar_token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}
