
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

// Load local server/.env.
// Render environment variables are supplied separately.
dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

// Read credentials path
const credentialsPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

if (!credentialsPath) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_PATH is missing."
  );
}

// Support both absolute Render paths and local relative paths
const fullPath = path.isAbsolute(credentialsPath)
  ? credentialsPath
  : path.resolve(__dirname, "..", credentialsPath);

// Check credentials file
if (!fs.existsSync(fullPath)) {
  throw new Error(
    `Firebase credentials file not found: ${fullPath}`
  );
}

// Read and validate JSON
let serviceAccount;

try {
  serviceAccount = JSON.parse(
    fs.readFileSync(fullPath, "utf8")
  );
} catch {
  throw new Error(
    "Firebase service account JSON is invalid."
  );
}

if (
  !serviceAccount.project_id ||
  !serviceAccount.client_email ||
  !serviceAccount.private_key
) {
  throw new Error(
    "Firebase service account JSON is missing required fields."
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

