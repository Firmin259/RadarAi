import { Router } from "express";
import pool from "../db.js";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const router = Router();
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function ownedChat(chatId, userId) {
  const [rows] = await pool.execute("SELECT id,title,is_pinned FROM chats WHERE id=? AND user_id=?", [chatId, userId]);
  return rows[0];
}

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id,c.title,c.is_pinned,c.created_at,c.updated_at,
        (SELECT content FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1) AS last_message
       FROM chats c WHERE c.user_id=? ORDER BY c.is_pinned DESC,c.updated_at DESC`,
      [req.user.id]
    );
    res.json({ chats: rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const title = String(req.body.title || "New chat").trim().slice(0, 180) || "New chat";
    const [result] = await pool.execute("INSERT INTO chats (user_id,title) VALUES (?,?)", [req.user.id, title]);
    res.status(201).json({ chat: { id: result.insertId, title, is_pinned: 0 } });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const chat = await ownedChat(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    const [messages] = await pool.execute(
      "SELECT id,role,content,attachments,created_at FROM messages WHERE chat_id=? ORDER BY id ASC",
      [chat.id]
    );
    const parsed = messages.map(m => ({
      ...m, attachments: typeof m.attachments === "string" ? JSON.parse(m.attachments) : m.attachments
    }));
    res.json({ chat, messages: parsed });
  } catch (err) { next(err); }
});

router.patch("/:id/pin", async (req, res, next) => {
  try {
    const chat = await ownedChat(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    const pinned = !Boolean(chat.is_pinned);
    await pool.execute("UPDATE chats SET is_pinned=? WHERE id=? AND user_id=?", [pinned, chat.id, req.user.id]);
    res.json({ is_pinned: pinned });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM chats WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Chat not found." });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post("/:id/messages", async (req, res, next) => {
  try {
    const chat = await ownedChat(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    const content = String(req.body.content || "").trim();
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    if (!content && !attachments.length) return res.status(400).json({ error: "Write a message or attach a file." });

    const safeAttachments = attachments.slice(0, 10).map(a => ({
      name: String(a.name || "file").slice(0, 255),
      url: String(a.url || "").slice(0, 1000),
      type: String(a.type || "").slice(0, 100)
    }));
    await pool.execute(
      "INSERT INTO messages (chat_id,role,content,attachments) VALUES (?,'user',?,?)",
      [chat.id, content || "Please review the attached file.", JSON.stringify(safeAttachments)]
    );

    const [history] = await pool.execute(
      "SELECT role,content,attachments FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT 20", [chat.id]
    );
    const orderedHistory = history.reverse();
    if (!gemini) return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to server/.env." });

    // Convert saved messages to Gemini parts. Uploaded images are sent for visual understanding;
    // videos remain stored as attachments but are not sent to the chat model in this version.
    const contents = [];
    for (const item of orderedHistory) {
      const parts = [];
      if (item.content) parts.push({ text: item.content });
      let attachments = item.attachments;
      if (typeof attachments === "string") {
        try { attachments = JSON.parse(attachments); } catch { attachments = []; }
      }
      for (const attachment of (Array.isArray(attachments) ? attachments : [])) {
        if (!String(attachment.type || "").startsWith("image/")) continue;
        const filename = path.basename(String(attachment.url || ""));
        if (!filename) continue;
        const imagePath = path.resolve("uploads", filename);
        const uploadRoot = path.resolve("uploads") + path.sep;
        if (!imagePath.startsWith(uploadRoot)) continue;
        try {
          const imageBytes = await fs.readFile(imagePath);
          parts.push({ inlineData: { mimeType: attachment.type, data: imageBytes.toString("base64") } });
        } catch { /* An unavailable old upload is safely skipped. */ }
      }
      if (parts.length) contents.push({ role: item.role === "assistant" ? "model" : "user", parts });
    }

    const result = await gemini.models.generateContent({
      model: process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: "You are Radar Bot, a helpful, clear, friendly AI assistant. Be accurate and concise. If an image is attached, use its visual content when answering.",
        temperature: 0.7
      }
    });
    const reply = result.text || "I couldn't generate a response.";

    await pool.execute(
      "INSERT INTO messages (chat_id,role,content) VALUES (?,'assistant',?)", [chat.id, reply]
    );
    if (chat.title === "New chat" && content) {
      await pool.execute("UPDATE chats SET title=? WHERE id=?", [content.slice(0, 55), chat.id]);
    }
    res.json({ reply });
  } catch (err) { next(err); }
});

export default router;
