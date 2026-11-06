import api from "./api.js";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

// Check if running on localhost or on live Vercel
const IS_PRODUCTION = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

export async function loginWithGoogle() {
  // Sign in using Google Firebase authentication
  const result = await signInWithPopup(auth, googleProvider);

  // Get Firebase ID token
  const idToken = await result.user.getIdToken();

  let data;

  if (IS_PRODUCTION) {
    // Force absolute direct path in production (bypasses broken environment layers)
    const response = await api.post("https://onrender.com", { idToken });
    data = response.data;
  } else {
    // Standard relative routing mapping for your local computer
    const response = await api.post("/auth/firebase", { idToken });
    data = response.data;
  }

  if (!data.token || !data.user) {
    throw new Error("Backend did not return a valid Radar Bot login token.");
  }

  // Save Radar Bot JWT using the SAME key as App.jsx
  localStorage.setItem("radar_token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}
