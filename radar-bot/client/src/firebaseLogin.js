import api from "./api.js";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

const IS_PRODUCTION = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  let data;

  if (IS_PRODUCTION) {
    const response = await api.post("https://onrender.com", { idToken });
    data = response.data;
  } else {
    const response = await api.post("/auth/firebase", { idToken });
    data = response.data;
  }

  if (!data.token || !data.user) {
    throw new Error("Backend did not return a valid Radar Bot login token.");
  }

  localStorage.setItem("radar_token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}
