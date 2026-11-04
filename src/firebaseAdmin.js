
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

// Load server/.env
dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

// Read Firebase credentials path
const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!credentialsPath) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_PATH is missing from server/.env"
  );
}

// Locate JSON file
const fullPath = path.resolve(
  __dirname,
  "..",
  credentialsPath
);

if (!fs.existsSync(fullPath)) {
  throw new Error("Firebase credentials file not found: " + fullPath);
}

// Read credentials
const serviceAccount = JSON.parse(
  fs.readFileSync(fullPath, "utf8")
);

// Initialize Firebase Admin
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

console.log("Firebase Admin connected successfully.");
