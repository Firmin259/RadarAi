import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import Replicate from "replicate";
import pool from "../db.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

router.post("/image", async (req, res, next) => {
  const prompt = String(req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Enter an image prompt." });
  if (!gemini) return res.status(503).json({ error: "Gemini image generation is not configured. Add GEMINI_API_KEY to server/.env." });

  try {
    const result = await gemini.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      contents: prompt,
      config: { responseModalities: ["IMAGE"] }
    });
    const imagePart = result.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (!imagePart) throw new Error("Gemini returned no image. Try a different prompt.");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const extension = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
    const dir = path.resolve("uploads", "generated");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${crypto.randomUUID()}.${extension}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(imagePart.inlineData.data, "base64"));
    res.json({ url: `/uploads/generated/${filename}` });
  } catch (err) { next(err); }
});

router.post("/video", async (req, res, next) => {
  const prompt = String(req.body.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Enter a video prompt." });
  if (!replicate || !process.env.REPLICATE_MODEL_VERSION) {
    return res.status(503).json({ error: "Video generation is not configured. Set REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION in server/.env." });
  }

  try {
    const output = await replicate.run(process.env.REPLICATE_MODEL_VERSION, { input: { prompt } });
    const candidate = Array.isArray(output) ? output[0] : output;
    const url = typeof candidate === "string" ? candidate : candidate?.url;
    if (!url) throw new Error("The selected video model returned an unsupported output. Update generation.js for that model's output schema.");
    res.json({ url });
  } catch (err) { next(err); }
});

export default router;
