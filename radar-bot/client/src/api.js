
import axios from "axios";

const API_URL = (
  import.meta.env.API_URL_CONFIG ||  "https://radarai-u9v9.onrender.com"
).replace(/\/+$/, "");

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
