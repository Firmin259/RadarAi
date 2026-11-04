
import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import Replicate from "replicate";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve uploads relative to the server directory
const uploadsDir = path.resolve(__dirname, "../../uploads/generated");

function getGemini() {
  const key = process.env.GEMINI_API_KEY?.trim();

  if (!key) return null;

  return new GoogleGenAI({ apiKey: key });
}

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN?.trim();

  if (!token) return null;

  return new Replicate({ auth: token });
}

// Extract video URL from different Replicate output formats
function extractVideoUrl(output) {
  const candidate = Array.isArray(output) ? output[0] : output;

  if (typeof candidate === "string") return candidate;

  if (candidate?.url) {
    return typeof candidate.url === "function"
      ? candidate.url().toString()
      : String(candidate.url);
  }

  if (candidate?.href) return candidate.href;

  return null;
}

// IMAGE GENERATION
router.post("/image", async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        error: "Enter an image prompt."
      });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({
        error: "Image prompt is too long."
      });
    }

    const gemini = getGemini();

    if (!gemini) {
      return res.status(503).json({
        error: "Gemini API is not configured. Add GEMINI_API_KEY to server/.env."
      });
    }

    const result = await gemini.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"]
      }
    });

    const parts = result.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find(
      part => part.inlineData?.data
    );

    if (!imagePart) {
      throw new Error(
        result.candidates?.[0]?.finishReason
          ? `Gemini did not return an image. Finish reason: ${result.candidates[0].finishReason}`
          : "Gemini returned no image. Try another prompt."
      );
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";

    const extensions = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    const extension = extensions[mimeType];

    if (!extension) {
      throw new Error("Gemini returned an unsupported image format.");
    }

    fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `${crypto.randomUUID()}.${extension}`;

    fs.writeFileSync(
      path.join(uploadsDir, filename),
      Buffer.from(imagePart.inlineData.data, "base64")
    );

    return res.json({
      url: `/uploads/generated/${filename}`,
      type: mimeType
    });

  } catch (err) {
    console.error("IMAGE GENERATION ERROR:", err);

    const status = err.status || err.statusCode;

    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: "Gemini rejected the API credentials. Check GEMINI_API_KEY."
      });
    }

    return res.status(500).json({
      error: err.message || "Image generation failed."
    });
  }
});

// VIDEO GENERATION
router.post("/video", async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        error: "Enter a video prompt."
      });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({
        error: "Video prompt is too long."
      });
    }

    const replicate = getReplicate();

    if (!replicate || !process.env.REPLICATE_MODEL_VERSION) {
      return res.status(503).json({
        error: "Video generation is not configured. Check REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION."
      });
    }

    const output = await replicate.run(
      process.env.REPLICATE_MODEL_VERSION,
      {
        input: { prompt }
      }
    );

    const url = extractVideoUrl(output);

    if (!url) {
      throw new Error(
        "Replicate returned an unsupported video output."
      );
    }

    return res.json({
      url,
      type: "video/mp4"
    });

  } catch (err) {
    console.error("VIDEO GENERATION ERROR:", err);

    return res.status(500).json({
      error: err.message || "Video generation failed."
    });
  }
});

export default router;
