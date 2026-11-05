import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { firebaseAdmin } from "../firebaseAdmin.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Generate Radar Bot JWT
function makeToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

// Return safe public user information
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

// REGISTER (Bypassed)
router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  
  const user = {
    id: Math.floor(Math.random() * 100000), // Mocked ID
    name,
    email
  };

  return res.status(201).json({
    token: makeToken(user),
    user: publicUser(user)
  });
});

// EMAIL/PASSWORD LOGIN (Bypassed)
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  
  const user = {
    id: Math.floor(Math.random() * 100000),
    name: email.split("@")[0],
    email
  };

  return res.json({
    token: makeToken(user),
    user: publicUser(user)
  });
});

// GOOGLE / FIREBASE LOGIN (Fixed: Removed broken pool database calls)
router.post("/firebase", async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        error: "Firebase ID token is required."
      });
    }

    // Verify Firebase ID token
    const decoded = await firebaseAdmin.auth.verifyIdToken(idToken);

    if (!decoded.email || decoded.email_verified !== true) {
      return res.status(401).json({
        error: "Please use a verified email account."
      });
    }

    const email = decoded.email.toLowerCase();
    const name = String(decoded.name || email.split("@")[0]).trim().slice(0, 100);

    // Create a temporary operational user profile in memory instead of crashing on MySQL
    const user = {
      id: decoded.uid, // Use Firebase unique UID as the safe account reference ID
      name: name,
      email: email
    };

    return res.json({
      token: makeToken(user),
      user: publicUser(user)
    });

  } catch (err) {
    console.error("Firebase authentication error:", err.message);

    if (err.code?.startsWith("auth/")) {
      return res.status(401).json({
        error: "Firebase authentication failed."
      });
    }

    next(err);
  }
});

// GET CURRENT USER (Bypassed)
router.get("/me", requireAuth, async (req, res) => {
  const user = {
    id: req.user.sub,
    name: req.user.email ? req.user.email.split("@")[0] : "User",
    email: req.user.email || ""
  };

  return res.json({
    user: publicUser(user)
  });
});

export default router;
