
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import {
  initializeApp,
  cert,
  getApps
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";

dotenv.config({
  path: path.resolve(process.cwd(), ".env")
});

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!keyPath) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_PATH is missing from server/.env"
  );
}

const fullPath = path.resolve(process.cwd(), keyPath);

if (!fs.existsSync(fullPath)) {
  throw new Error(
    `Firebase service account file not found: ${fullPath}`
  );
}

const serviceAccount = JSON.parse(
  fs.readFileSync(fullPath, "utf8")
);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

export const firebaseAdmin = {
  auth: () => getAuth(firebaseApp)
};

console.log("Firebase Admin connected successfully.");
