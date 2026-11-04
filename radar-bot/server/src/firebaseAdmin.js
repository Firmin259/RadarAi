
import admin from "firebase-admin";

const serviceAccountJSON =
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJSON) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_JSON is missing from Render Environment Variables"
  );
}

const serviceAccount = JSON.parse(serviceAccountJSON);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

console.log("Firebase Admin connected successfully.");

export const firebaseAdmin = admin;
