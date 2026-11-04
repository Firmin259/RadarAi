
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
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
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email
  };
}

// REGISTER
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        error: "Name must be 2-100 characters."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must contain at least 8 characters."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash)
       VALUES (?, ?, ?)`,
      [name, email, passwordHash]
    );

    const user = {
      id: result.insertId,
      name,
      email
    };

    return res.status(201).json({
      token: makeToken(user),
      user: publicUser(user)
    });

  } catch (err) {
    next(err);
  }
});

// EMAIL/PASSWORD LOGIN
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (
      !rows.length ||
      !rows[0].password_hash ||
      !(await bcrypt.compare(password, rows[0].password_hash))
    ) {
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    return res.json({
      token: makeToken(rows[0]),
      user: publicUser(rows[0])
    });

  } catch (err) {
    next(err);
  }
});

// GOOGLE / FIREBASE LOGIN
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

    const firebaseUid = decoded.uid;
    const email = decoded.email.toLowerCase();

    const name = String(
      decoded.name || email.split("@")[0]
    ).trim().slice(0, 100);

    // Find existing Firebase account
    const [firebaseUsers] = await pool.execute(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [firebaseUid]
    );

    let user;

    if (firebaseUsers.length) {
      user = firebaseUsers[0];

    } else {
      // Check existing email account
      const [emailUsers] = await pool.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (emailUsers.length) {
        const existing = emailUsers[0];

        if (
          existing.firebase_uid &&
          existing.firebase_uid !== firebaseUid
        ) {
          return res.status(409).json({
            error: "This account is linked to another Firebase user."
          });
        }

        // Link Firebase identity
        await pool.execute(
          "UPDATE users SET firebase_uid = ? WHERE id = ?",
          [firebaseUid, existing.id]
        );

        user = {
          ...existing,
          firebase_uid: firebaseUid
        };

      } else {
        // Create new Google account
        const [result] = await pool.execute(
          `INSERT INTO users
           (name, email, password_hash, firebase_uid)
           VALUES (?, ?, NULL, ?)`,
          [name, email, firebaseUid]
        );

        user = {
          id: result.insertId,
          name,
          email
        };
      }
    }

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

// GET CURRENT USER
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Account not found."
      });
    }

    return res.json({
      user: publicUser(rows[0])
    });

  } catch (err) {
    next(err);
  }
});

export default router;
