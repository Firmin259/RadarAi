import axios from "axios";

// Force production URL when running live on Vercel, use localhost only when testing on your own PC
const IS_PRODUCTION = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

const API_URL = IS_PRODUCTION 
  ? "https://onrender.com" 
  : "http://localhost:5000/api";

const SERVER_URL = new URL(API_URL).origin;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Automatically attach Radar Bot JWT
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("radar_token");

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

// Convert uploaded file paths into accessible URLs
export const assetUrl = url => {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${SERVER_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default api;
