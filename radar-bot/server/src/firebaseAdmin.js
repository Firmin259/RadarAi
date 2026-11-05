import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  initializeApp,
  getApps,
  cert
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local server/.env (only needed for local development)
dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

let serviceAccount;

// 1. Check if the JSON is passed directly as a string (Best for Railway/Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim());
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON string is invalid JSON.");
  }
} 
// 2. Fallback to the file path layout (Best for local development)
else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim();
  const fullPath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(__dirname, "..", credentialsPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Firebase credentials file not found: ${fullPath}`);
  }

  try {
    serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    throw new Error("Firebase service account JSON file is invalid.");
  }
} 
// 3. Throw a clear error if neither environment variable exists
else {
  throw new Error(
    "Missing Firebase credentials. Provide either FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

// Validate that required fields exist
if (
  !serviceAccount.project_id ||
  !serviceAccount.client_email ||
  !serviceAccount.private_key
) {
  throw new Error(
    "Firebase service account JSON is missing required fields (project_id, client_email, private_key)."
  );
}

// Initialize Firebase only once
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

// Export Firebase authentication
export const firebaseAdmin = {
  app,
  auth: getAuth(app)
};

console.log(
  `Firebase Admin connected successfully. Project: ${serviceAccount.project_id}`
);

