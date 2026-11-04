
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export async function loginWithGoogle() {
  // Sign in using Google Firebase authentication
  const result = await signInWithPopup(auth, googleProvider);

  // Get Firebase ID token
  const idToken = await result.user.getIdToken();

  // Send Firebase token to Radar Bot backend
  const response = await fetch(`${API_URL}/auth/firebase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ idToken })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Google login failed.");
  }

  if (!data.token || !data.user) {
    throw new Error("Backend did not return a valid Radar Bot login token.");
  }

  // Save Radar Bot JWT using the SAME key as App.jsx
  localStorage.setItem("radar_token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}
