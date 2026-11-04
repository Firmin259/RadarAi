
import React, { useEffect, useRef, useState } from "react";
import { loginWithGoogle } from "./firebaseLogin.js";
import {
  Activity, ArrowUp, CircleHelp, Image as ImageIcon,
  LogOut, Menu, MessageSquare, Paperclip, Pin, Plus,
  Search, Send, ShieldCheck, Sparkles, Trash2, Video, X
} from "lucide-react";
import api, { assetUrl } from "./api";

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const endpoint =
        mode === "login" ? "/auth/login" : "/auth/register";

      const { data } = await api.post(endpoint, {
        name,
        email,
        password
      });

      localStorage.setItem("radar_token", data.token);
      onAuth(data.user);

    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Unable to connect. Check the backend."
      );
    } finally {
      setBusy(false);
    }
  }

  // Google login handler belongs inside AuthScreen
  async function handleGoogleLogin() {
    setError("");
    setBusy(true);

    try {
      const user = await loginWithGoogle();
      onAuth(user);
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Google login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow glow-a" />
      <div className="auth-glow glow-b" />

      <section className="auth-card">
        <div className="brand brand-center">
          <div className="brand-mark">
            <Activity size={22} />
          </div>
          <span>radar<span className="brand-light">bot</span></span>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">YOUR AI WORKSPACE</span>
          <h1>
            {mode === "login"
              ? "Welcome back."
              : "Create your account."}
          </h1>
          <p>
            Think clearly. Create freely. Keep everything in one place.
          </p>
        </div>

        <form onSubmit={submit} className="auth-form">

          {mode === "register" && (
            <label>
              Your name
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Morgan"
                required
                minLength="2"
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength="8"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button
            className="primary-btn full-btn"
            disabled={busy}
            type="submit"
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            <ArrowUp size={17} />
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-login"
          onClick={handleGoogleLogin}
          disabled={busy}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            width="20"
            height="20"
            alt="Google"
          />
          Continue with Google
        </button>

        {error && <div className="error-box">{error}</div>}

        <p className="auth-switch">
          {mode === "login"
            ? "New to Radar Bot?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>

        <div className="secure-note">
          <ShieldCheck size={14} />
          Your conversations are saved to your account
        </div>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("chat");
  const [notice, setNotice] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [search, setSearch] = useState("");

  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("radar_token");

    if (!token) {
      setAuthChecked(true);
      return;
    }

    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("radar_token"))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function loadChats() {
    try {
      const { data } = await api.get("/chats");
      setChats(data.chats || []);
    } catch {
      setNotice("Couldn't load your chat history.");
    }
  }

  async function newChat() {
    try {
      const { data } = await api.post("/chats", {
        title: "New chat"
      });

      setChats(prev => [data.chat, ...prev]);
      setActiveId(data.chat.id);
      setMessages([]);
      setMode("chat");
      setMobileSidebar(false);
    } catch {
      setNotice("Couldn't create a new chat.");
    }
  }

  async function openChat(id) {
    try {
      const { data } = await api.get(`/chats/${id}`);

      setActiveId(id);
      setMessages(data.messages || []);
      setMode("chat");
      setMobileSidebar(false);
    } catch {
      setNotice("Couldn't open this conversation.");
    }
  }

  async function togglePin(e, id) {
    e.stopPropagation();

    try {
      const { data } = await api.patch(`/chats/${id}/pin`);

      setChats(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, is_pinned: data.is_pinned }
            : c
        ).sort(
          (a, b) =>
            Number(b.is_pinned) - Number(a.is_pinned)
        )
      );
    } catch {
      setNotice("Couldn't update pinned chat.");
    }
  }

  async function deleteChat(e, id) {
    e.stopPropagation();

    if (!window.confirm("Delete this conversation permanently?")) {
      return;
    }

    try {
      await api.delete(`/chats/${id}`);

      setChats(prev => prev.filter(c => c.id !== id));

      if (String(activeId) === String(id)) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setNotice("Couldn't delete this conversation.");
    }
  }

  async function ensureChat() {
    if (activeId) return activeId;

    const { data } = await api.post("/chats", {
      title: "New chat"
    });

    setActiveId(data.chat.id);
    setChats(prev => [data.chat, ...prev]);

    return data.chat.id;
  }

  async function uploadFiles() {
    if (!files.length) return [];

    const form = new FormData();

    files.forEach(file => form.append("files", file));

    const { data } = await api.post(
      "/uploads",
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return data.files;
  }

  async function sendMessage(e) {
    e?.preventDefault();

    if ((!draft.trim() && !files.length) || busy) return;

    setBusy(true);
    setNotice("");

    const text = draft.trim();
    const localFiles = [...files];

    setDraft("");
    setFiles([]);

    setMessages(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        attachments: localFiles.map(file => ({
          name: file.name,
          type: file.type,
          localUrl: URL.createObjectURL(file)
        }))
      }
    ]);

    try {
      const id = await ensureChat();
      const uploaded = await uploadFiles();

      const { data } = await api.post(
        `/chats/${id}/messages`,
        {
          content: text,
          attachments: uploaded
        }
      );

      setMessages(prev => [
        ...prev.filter(m => !String(m.id).startsWith("temp-")),
        {
          id: `sent-${Date.now()}`,
          role: "user",
          content: text,
          attachments: uploaded
        },
        {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: data.reply
        }
      ]);

      await loadChats();

    } catch (err) {
      setNotice(
        err.response?.data?.error ||
        "Message could not be sent. Please try again."
      );

      setDraft(text);
      setFiles(localFiles);

      setMessages(prev =>
        prev.filter(m => !String(m.id).startsWith("temp-"))
      );
    } finally {
      setBusy(false);
    }
  }

  async function generate(e) {
    e?.preventDefault();

    if (!draft.trim() || busy) return;

    setBusy(true);
    setNotice("");

    const prompt = draft.trim();
    setDraft("");

    setMessages(prev => [
      ...prev,
      {
        id: `prompt-${Date.now()}`,
        role: "user",
        content:
          `${mode === "image" ? "Create an image: " : "Create a video: "}${prompt}`
      }
    ]);

    try {
      const { data } = await api.post(
        `/generation/${mode}`,
        { prompt }
      );

      setMessages(prev => [
        ...prev,
        {
          id: `generated-${Date.now()}`,
          role: "assistant",
          content:
            mode === "image"
              ? "Your image is ready."
              : "Your video is ready.",
          attachments: [
            {
              name: `Generated ${mode}`,
              type: mode === "image" ? "image/png" : "video/mp4",
              url: data.url
            }
          ]
        }
      ]);

      await loadChats();
      setNotice("Generation complete.");

    } catch (err) {
      setNotice(
        err.response?.data?.error || "Generation failed."
      );

      setDraft(prompt);

      setMessages(prev =>
        prev.filter(m => !String(m.id).startsWith("prompt-"))
      );
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("radar_token");
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveId(null);
  }

  function selectMode(next) {
    setMode(next);
    setNotice("");
  }

  const visibleChats = chats.filter(c =>
    String(c.title).toLowerCase().includes(search.toLowerCase())
  );

  if (!authChecked) {
    return (
      <div className="loading-screen">
        <div className="brand-mark"><Activity /></div>
        <span>Loading Radar Bot...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}>

        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark"><Activity size={19} /></div>
            <span>radar<span className="brand-light">bot</span></span>
          </div>

          <button
            className="icon-btn sidebar-close"
            onClick={() => setMobileSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={newChat}>
          <Plus size={17} /> New chat <span>⌘ K</span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={`nav-link ${mode === "chat" ? "nav-active" : ""}`}
          onClick={() => selectMode("chat")}
        >
          <MessageSquare size={17} /> Chat
        </button>

        <div className="history-head">
          <span className="sidebar-label">YOUR HISTORY</span>
          <span className="history-count">{chats.length}</span>
        </div>

        <div className="search-wrap">
          <Search size={15} />
          <input
            placeholder="Search conversations"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="chat-list">
          {visibleChats.map(chat => (
            <div
              key={chat.id}
              className={`chat-row ${
                String(activeId) === String(chat.id)
                  ? "chat-selected"
                  : ""
              }`}
              onClick={() => openChat(chat.id)}
            >
              <MessageSquare size={15} className="chat-row-icon" />

              <span className="chat-title">{chat.title}</span>

              {Boolean(chat.is_pinned) && (
                <Pin size={13} className="pin-indicator" />
              )}

              <div className="chat-actions">
                <button
                  title={chat.is_pinned ? "Unpin" : "Pin"}
                  onClick={e => togglePin(e, chat.id)}
                >
                  <Pin size={13} />
                </button>

                <button
                  title="Delete"
                  onClick={e => deleteChat(e, chat.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {!visibleChats.length && (
            <p className="empty-history">
              {search
                ? "No matching chats yet."
                : "Your conversations will appear here."}
            </p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile-row">
            <div className="avatar">
              {user.name?.slice(0, 1).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>

            <button
              className="icon-btn"
              title="Sign out"
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-panel">

        <header className="topbar">
          <div className="topbar-left">

            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileSidebar(true)}
            >
              <Menu />
            </button>

            <div>
              <span className="top-eyebrow">
                RADAR BOT / WORKSPACE
              </span>

              <h2>
                {mode === "chat"
                  ? chats.find(c => String(c.id) === String(activeId))?.title || "New conversation"
                  : mode === "image"
                    ? "Image studio"
                    : "Video studio"}
              </h2>
            </div>
          </div>

          <div className="topbar-right">
            <div className="status-pill">
              <span className="status-dot" />
              Systems operational
            </div>

            <button className="icon-btn help-btn" title="Help">
              <CircleHelp size={18} />
            </button>
          </div>
        </header>

        <section className="content-area">

          {messages.length === 0 && mode === "chat" ? (
            <div className="welcome">
              <div className="welcome-orb">
                <div className="orb-core"><Activity size={30} /></div>
                <span className="orb-ring ring-one" />
                <span className="orb-ring ring-two" />
              </div>

              <span className="eyebrow">YOUR THINKING PARTNER</span>

              <h1>
                Where should we<br />
                <span>start today?</span>
              </h1>

              <p>
                Ask a question, explore an idea, or bring something new to life.
              </p>

              <div className="prompt-grid">
                {[
                  "Explain a complex topic simply",
                  "Help me plan a project",
                  "Brainstorm creative ideas",
                  "Review an image or video"
                ].map((p, i) => (
                  <button key={p} onClick={() => setDraft(p)}>
                    <span>{["✳", "◈", "✧", "▧"][i]}</span>
                    {p}
                    <ArrowUp size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">

              {messages.map(m => (
                <article
                  key={m.id}
                  className={`message message-${m.role}`}
                >
                  <div className="message-avatar">
                    {m.role === "assistant"
                      ? <Activity size={17} />
                      : user.name?.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="message-body">

                    <div className="message-meta">
                      <strong>
                        {m.role === "assistant" ? "Radar Bot" : "You"}
                      </strong>
                      <span>
                        {m.role === "assistant" ? "AI assistant" : "You"}
                      </span>
                    </div>

                    {m.content && (
                      <p className="message-text">{m.content}</p>
                    )}

                    {m.attachments?.map((a, i) => (
                      <div className="attachment-preview" key={i}>
                        {(a.type || "").startsWith("video") ? (
                          <video controls src={a.localUrl || assetUrl(a.url)} />
                        ) : (
                          <img
                            src={a.localUrl || assetUrl(a.url)}
                            alt={a.name}
                          />
                        )}
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {busy && (
                <div className="typing-row">
                  <div className="message-avatar"><Activity size={17} /></div>
                  <span className="typing-dots"><i /><i /><i /></span>
                  <span>Radar Bot is thinking</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-area">

          {notice && (
            <div className={`notice ${
              notice === "Generation complete." ? "notice-success" : ""
            }`}>
              <span>{notice}</span>
              <button onClick={() => setNotice("")}><X size={14} /></button>
            </div>
          )}

          <div className="mode-tabs">
            <button
              className={mode === "chat" ? "mode-active" : ""}
              onClick={() => selectMode("chat")}
            >
              <MessageSquare size={15} /> Chat
            </button>

            <button
              className={mode === "image" ? "mode-active" : ""}
              onClick={() => selectMode("image")}
            >
              <ImageIcon size={15} /> Image
            </button>

            <button
              className={mode === "video" ? "mode-active" : ""}
              onClick={() => selectMode("video")}
            >
              <Video size={15} /> Video
            </button>
          </div>

          <form
            className="composer"
            onSubmit={mode === "chat" ? sendMessage : generate}
          >

            {files.length > 0 && (
              <div className="file-chips">
                {files.map((f, i) => (
                  <span key={i}>
                    <Paperclip size={12} />
                    {f.name}
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(prev => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  mode === "chat" ? sendMessage() : generate();
                }
              }}
              placeholder={
                mode === "chat"
                  ? "Message Radar Bot..."
                  : mode === "image"
                    ? "Describe the image you want to create..."
                    : "Describe the video you want to create..."
              }
              rows={2}
            />

            <div className="composer-bottom">

              <div className="composer-tools">

                {mode === "chat" && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      multiple
                      hidden
                      onChange={e => {
                        setFiles(prev => [
                          ...prev,
                          ...Array.from(e.target.files || [])
                        ]);
                        e.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      className="tool-btn"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Paperclip size={16} /> Attach
                    </button>

                    <span className="tool-hint">
                      Images & videos · unlimited uploads
                    </span>
                  </>
                )}

                {mode !== "chat" && (
                  <span className="tool-hint">
                    <Sparkles size={14} />
                    Generation availability depends on provider limits
                  </span>
                )}
              </div>

              <button
                className="send-btn"
                type="submit"
                disabled={
                  busy ||
                  (!draft.trim() && (mode !== "chat" || !files.length))
                }
              >
                <span>
                  {mode === "chat" ? "Send" : `Generate ${mode}`}
                </span>

                {mode === "chat"
                  ? <Send size={16} />
                  : <Sparkles size={16} />}
              </button>
            </div>
          </form>

          <p className="disclaimer">
            Radar Bot can make mistakes. Check important information.
            <span> • </span>
            Your data stays associated with your account.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
