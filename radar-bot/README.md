# Radar Bot

A full-stack AI chatbot starter with React + Vite, Express, MySQL, JWT authentication,
chat history, pinned conversations, unlimited media uploads, Gemini text chat, and Gemini image generation with no in-app credit counter.

## Requirements
- Node.js 20+
- MySQL 8+
- npm
- Gemini API key for text and image generation
- Optional Replicate API token + model version for video generation

## Setup

### 1. Database
Create a MySQL database and run `database/schema.sql`:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd server
cp .env.example .env
```
Edit `.env` and set your MySQL password, a long random JWT secret, and API keys.

```bash
npm install
npm run dev
```
Backend runs at `http://localhost:5000`.

### 3. Frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Environment
- `GEMINI_API_KEY`: required for AI text chat and image generation.
- `GEMINI_CHAT_MODEL`: defaults to `gemini-3.8-flash`; change to a model enabled for your API project.
- `GEMINI_IMAGE_MODEL`: defaults to `gemini-3.1-flash-image`; use a model available to your API project.
- `REPLICATE_API_TOKEN` and `REPLICATE_MODEL_VERSION`: optional; required for video generation.
  The selected Replicate model must accept an `input.prompt` field and return a video URL or an array containing one.

## Features
- Account registration/login with bcrypt password hashes and JWT.
- User-scoped chat history, message storage, pin/unpin, and delete.
- Unlimited image/video file uploads (subject to server storage and configured file-size limits).
- No Radar Bot in-app credits are deducted for chat, uploads, image generation, or optional video generation. Provider usage limits or charges may still apply.
- Text chat and image generation use Google Gemini. Uploaded images can be sent to Gemini for visual questions. Video generation uses an optional configurable Replicate model version.

## Important production notes
This is a runnable development starter, not a production-hosted service. Before public deployment:
- Use HTTPS and secure, httpOnly cookies instead of localStorage JWT storage.
- Put uploads in private object storage (for example, an S3-compatible service), scan uploads, and serve them through authenticated download routes.
- Add rate limiting, email verification, password reset, CSRF protections if using cookies, backups, monitoring, and a privacy/retention policy.
- Set reverse-proxy upload limits and persistent storage.
- Replicate models have different input/output schemas; choose a model version compatible with `input: { prompt }` and adjust `server/src/routes/generation.js` if needed.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/:id`
- `PATCH /api/chats/:id/pin`
- `DELETE /api/chats/:id`
- `POST /api/chats/:id/messages`
- `POST /api/uploads`
- `POST /api/generation/image`
- `POST /api/generation/video`
- `GET /api/health`


## Updated Gemini configuration

Radar Bot now uses the official `@google/genai` JavaScript SDK. Set `GEMINI_API_KEY` in `server/.env`; text chat uses `gemini-3.8-flash` and image generation uses `gemini-3.1-flash-image` by default. Uploaded images can be included in chat for visual questions. Uploads are stored locally; video attachments are stored but are not yet passed to the chat model.

The app no longer deducts internal credits for chatting, uploads, image generation, or optional video generation. This does not mean provider usage is free: Google Gemini and Replicate may apply their own usage limits or charges.

After replacing the project files, run `npm install` in `server` and `client` folders again. Keep all API keys and database passwords in `server/.env`, never in frontend code or Git.
