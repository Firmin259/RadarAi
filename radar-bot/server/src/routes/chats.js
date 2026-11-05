import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";

const router = Router();
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Temporary in-memory storage array instead of a broken MySQL database
const mockChats = [];
const mockMessages = [];

// Helper function to find a chat by its ID
async function ownedChat(chatId, userId) {
  return mockChats.find(c => String(c.id) === String(chatId));
}

// GET ALL CHATS
router.get("/", async (req, res, next) => {
  try {
    // Filter chats by user context
    const userChats = mockChats.filter(c => c.user_id === req.user.id);
    
    // Add last message preview to each chat block
    const chatsWithPreview = userChats.map(c => {
      const chatMsgs = mockMessages.filter(m => m.chat_id === c.id);
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      return {
        ...c,
        last_message: lastMsg ? lastMsg.content : null
      };
    });

    res.json({ chats: chatsWithPreview });
  } catch (err) { next(err); }
});

// CREATE A NEW CHAT
router.post("/", async (req, res, next) => {
  try {
    const title = String(req.body.title || "New chat").trim().slice(0, 180) || "New chat";
    
    const newChat = {
      id: String(Math.floor(Math.random() * 1000000)), // Generated unique ID string
      user_id: req.user.id,
      title,
      is_pinned: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    mockChats.push(newChat);
    res.status(201).json({ chat: newChat });
  } catch (err) { next(err); }
});

// GET SINGLE CHAT WITH MESSAGES
router.get("/:id", async (req, res, next) => {
  try {
    const chat = await ownedChat(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const messages = mockMessages.filter(m => m.chat_id === chat.id);
    res.json({ chat, messages });
  } catch (err) { next(err); }
});

// PIN / UNPIN A CHAT
router.patch("/:id/pin", async (req, res, next) => {
  try {
    const chat = await ownedChat(req.params.id, req.user.id);
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    chat.is_pinned = chat.is_pinned ? 0 : 1;
    res.json({ is_pinned: Boolean(chat.is_pinned) });
  } catch (err) { next(err); }
});

// DELETE A CHAT
router.delete("/:id", async (req, res, next) => {
  try {
    const chatIndex = mockChats.findIndex(c => String(c.id) === String(req.params.id));
    if (chatIndex === -1) return res.status(404).json({ error: "Chat not found." });

    mockChats.splice(chatIndex, 1);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// SEND MESSAGE & GENERATE GEMINI RESPONSE
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

    // Store user message in local array
    const userMsg = {
      id: Math.floor(Math.random() * 1000000),
      chat_id: chat.id,
      role: 'user',
      content: content || "Please review the attached file.",
      attachments: safeAttachments,
      created_at: new Date()
    };
    mockMessages.push(userMsg);

    // Fetch message history for AI context
    const history = mockMessages.filter(m => m.chat_id === chat.id).slice(-20);

    if (!gemini) {
      return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to environment variables." });
    }

    const contents = [];
    for (const item of history) {
      const parts = [];
      if (item.content) parts.push({ text: item.content });

      for (const attachment of (item.attachments || [])) {
        if (!String(attachment.type || "").startsWith("image/")) continue;
        const filename = path.basename(String(attachment.url || ""));
        if (!filename) continue;
        const imagePath = path.resolve("uploads", filename);
        try {
          const imageBytes = await fs.readFile(imagePath);
          parts.push({ inlineData: { mimeType: attachment.type, data: imageBytes.toString("base64") } });
        } catch { /* Suppress error if image file is unavailable */ }
      }
      if (parts.length) contents.push({ role: item.role === "assistant" ? "model" : "user", parts });
    }

    // Call Gemini API
    const result = await gemini.models.generateContent({
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: "You are Radar Bot, a helpful, clear, friendly AI assistant. Be accurate and concise. If an image is attached, use its visual content when answering.",
        temperature: 0.7
      }
    });
    
    const reply = result.text || "I couldn't generate a response.";

    // Store bot response in memory array
    const assistantMsg = {
      id: Math.floor(Math.random() * 1000000),
      chat_id: chat.id,
      role: 'assistant',
      content: reply,
      attachments: [],
      created_at: new Date()
    };
    mockMessages.push(assistantMsg);

    // Automatically update empty chat titles
    if (chat.title === "New chat" && content) {
      chat.title = content.slice(0, 55);
    }
    
    chat.updated_at = new Date();

    res.json({ reply });
  } catch (err) { next(err); }
});

export default router;
