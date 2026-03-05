import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  // ====== ELEMENTOS ======
  const chatEl = $("chat");
  const msgEl = $("msg");
  const sendBtn = $("send");

  const btnNewChat = $("btnNewChat");
  const btnClear = $("btnClear");
  const btnExport = $("btnExport");
  const chatList = $("chatList");
  const chatSearch = $("chatSearch");

  const statusPill = $("status");
  const hint = $("hint");
  const btnDeleteCloud = $("btnDeleteCloud");

  // Modal
  const modal = $("modal");
  const btnLogin = $("btnLogin");
  const btnLogout = $("btnLogout");
  const closeModalX = $("closeModalX");
  const closeModalBtn = $("closeModal");

  const doLogin = $("doLogin");
  const doSignup = $("doSignup");
  const emailEl = $("email");
  const passEl = $("pass");
  const authErr = $("authErr");

  // ====== PRO UX (Halo + Thinking + Animación) ======
  const chatArea = document.querySelector(".chat-area");
  const composer = document.querySelector(".composer");

  function setActiveChat(on) {
    if (!chatArea) return;
    chatArea.classList.toggle("is-active", !!on);
  }

  // Activamos el halo al usar el chat
  setActiveChat(true);
  composer?.addEventListener("click", () => setActiveChat(true));
  msgEl?.addEventListener("focus", () => setActiveChat(true));

  // Indicador "Neura está pensando..."
  let typingEl = null;

  function showTyping() {
    if (!chatEl) return;
    if (typingEl) return;

    typingEl = document.createElement("div");
    typingEl.className = "msg ai typing pop-in";
    typingEl.innerHTML = `
      <div class="bubble">
        <span class="muted">Neura está pensando</span>
        <span class="dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
      </div>
    `;
    chatEl.appendChild(typingEl);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  // Animar SOLO el último mensaje renderizado
  function popLastMessage() {
    const last = chatEl?.lastElementChild;
    if (!last) return;
    last.classList.add("pop-in");
  }

  // ====== SUPABASE CLIENT ======
  let supa = null;
  if (window.supabase?.createClient) {
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn("Supabase CDN no cargó. Revisa el script en index.html");
  }

  // ====== ESTADO ======
  // ✅ Limpio para Neura (nuevas keys)
  const LS_KEY = "neura_guest_chats_v1";
  const LS_OPEN = "neura_open_chat_v1";

  let chats = loadChats();
  let openId = localStorage.getItem(LS_OPEN) || (chats[0]?.id ?? null);

  let session = null; // Supabase session (si existe)

  if (!openId) {
    openId = createChat("Chat principal").id;
    saveOpen(openId);
  }

  // ====== MODAL: abrir/cerrar (INFALIBLE) ======
  function openModal() {
    if (!modal) return;
    authErr.textContent = "";
    modal.classList.remove("hidden");
    modal.style.display = "flex"; // respaldo (por si CSS falla)
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => emailEl?.focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.display = "none"; // respaldo (por si CSS falla)
    modal.setAttribute("aria-hidden", "true");
  }

  // NUNCA abrir solo al cargar
  closeModal();

  btnLogin?.addEventListener("click", openModal);
  closeModalX?.addEventListener("click", closeModal);
  closeModalBtn?.addEventListener("click", closeModal);

  // click fuera (solo si das click en el fondo)
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.getAttribute("aria-hidden") === "false") {
      closeModal();
    }
  });

  // ====== UI SEGÚN SESIÓN ======
  function setGuestUI() {
    session = null;
    statusPill.textContent = "Invitado (sin memoria)";
    hint.textContent = "Modo invitado: al cerrar, no se guarda.";
    btnLogin.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    btnDeleteCloud?.classList.add("hidden");
  }

  function setUserUI(userEmail) {
    statusPill.textContent = `Conectado: ${userEmail}`;
    hint.textContent = "Cuenta activa: (próximo) aquí guardaremos tu historial.";
    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    btnDeleteCloud?.classList.remove("hidden");
  }

  // ====== AUTH REAL (Supabase) ======
  async function handleLogin() {
    authErr.textContent = "";
    if (!supa) return (authErr.textContent = "Supabase no cargó 😅 (revisa el CDN).");

    const email = (emailEl.value || "").trim();
    const password = (passEl.value || "").trim();
    if (!email || !password) return (authErr.textContent = "Escribe email y contraseña.");

    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return (authErr.textContent = error.message);

    session = data.session;
    setUserUI(session.user.email || "usuario");
    closeModal();
  }

  async function handleSignup() {
    authErr.textContent = "";
    if (!supa) return (authErr.textContent = "Supabase no cargó 😅 (revisa el CDN).");

    const email = (emailEl.value || "").trim();
    const password = (passEl.value || "").trim();
    if (!email || !password) return (authErr.textContent = "Escribe email y contraseña.");

    const { data, error } = await supa.auth.signUp({ email, password });
    if (error) return (authErr.textContent = error.message);

    // A veces Supabase pide confirmación por email; lo mostramos bonito:
    if (!data.session) {
      authErr.textContent = "Cuenta creada ✅ Revisa tu correo para confirmar (si te lo pide).";
      return;
    }

    session = data.session;
    setUserUI(session.user.email || "usuario");
    closeModal();
  }

  async function handleLogout() {
    if (supa) await supa.auth.signOut();
    setGuestUI();
  }

  doLogin?.addEventListener("click", handleLogin);
  doSignup?.addEventListener("click", handleSignup);
  btnLogout?.addEventListener("click", handleLogout);

  // Al iniciar: revisar si ya hay sesión
  (async () => {
    if (!supa) {
      setGuestUI();
      render();
      return;
    }

    const { data } = await supa.auth.getSession();
    session = data.session;

    if (session?.user?.email) setUserUI(session.user.email);
    else setGuestUI();

    // Escuchar cambios de auth
    supa.auth.onAuthStateChange((_event, newSession) => {
      session = newSession;
      if (session?.user?.email) setUserUI(session.user.email);
      else setGuestUI();
    });

    render();
  })();

  // ====== CHAT: render ======
  function render() {
    const open = getOpenChat();
    renderChatList();
    renderMessages(open);
  }

  function renderChatList() {
    const q = (chatSearch?.value || "").toLowerCase().trim();
    const items = chats
      .filter((c) => !q || c.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    chatList.innerHTML = "";
    for (const c of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-item" + (c.id === openId ? " active" : "");
      btn.textContent = c.title;
      btn.addEventListener("click", () => {
        openId = c.id;
        saveOpen(openId);
        render();
      });
      chatList.appendChild(btn);
    }
  }

  function renderMessages(chat) {
    chatEl.innerHTML = "";
    for (const m of chat.messages) {
      chatEl.appendChild(bubble(m.role, m.content));
    }
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function bubble(role, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + (role === "user" ? "user" : "ai");

    const inner = document.createElement("div");
    inner.className = "bubble";
    inner.textContent = text;

    wrap.appendChild(inner);
    return wrap;
  }

  // ====== CHAT: helpers ======
  function createChat(title = "Nuevo chat") {
    const now = Date.now();
    const c = {
      id: crypto.randomUUID(),
      title,
      messages: [{ role: "assistant", content: "Hola 😊 Soy Neura. ¿En qué te ayudo hoy?", ts: now }],
      createdAt: now,
      updatedAt: now,
    };
    chats.push(c);
    saveChats();
    return c;
  }

  function getOpenChat() {
    let c = chats.find((x) => x.id === openId);
    if (!c) {
      c = createChat("Chat principal");
      openId = c.id;
      saveOpen(openId);
    }
    return c;
  }

  function pushMessage(role, content) {
    const c = getOpenChat();
    c.messages.push({ role, content, ts: Date.now() });
    c.updatedAt = Date.now();

    if (c.title === "Nuevo chat" || c.title === "Chat principal") {
      const firstUser = c.messages.find((m) => m.role === "user")?.content || "";
      if (firstUser.trim()) c.title = firstUser.trim().slice(0, 28);
    }

    saveChats();
    renderMessages(c);
    popLastMessage();
  }

  // ====== ENVIAR MENSAJE ======
  async function send() {
    const text = (msgEl.value || "").trim();
    if (!text) return;

    msgEl.value = "";
    autosize(msgEl);

    // mensaje del usuario
    pushMessage("user", text);

    // ✅ "Neura está pensando..." (ya NO guardamos "…")
    showTyping();

    const c = getOpenChat();

    const last = c.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: last }),
      });

      const data = await res.json().catch(() => ({}));

      hideTyping();

      const reply = data.reply || data.error || "Tuve un detalle técnico 😅";
      c.messages.push({ role: "assistant", content: reply, ts: Date.now() });
      c.updatedAt = Date.now();

      saveChats();
      renderMessages(c);
      popLastMessage();
    } catch {
      hideTyping();

      c.messages.push({
        role: "assistant",
        content: "Ahorita tuve un detalle técnico 😅 (revisa que /api/chat exista en Pages).",
        ts: Date.now(),
      });
      c.updatedAt = Date.now();
      saveChats();
      renderMessages(c);
      popLastMessage();
    }
  }

  sendBtn?.addEventListener("click", send);

  msgEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  msgEl?.addEventListener("input", () => autosize(msgEl));
  autosize(msgEl);

  // ====== BOTONES LATERALES ======
  btnNewChat?.addEventListener("click", () => {
    const c = createChat("Nuevo chat");
    openId = c.id;
    saveOpen(openId);
    render();
  });

  btnClear?.addEventListener("click", () => {
    chats = chats.filter((c) => c.id !== openId);
    saveChats();
    openId = chats[0]?.id || createChat("Chat principal").id;
    saveOpen(openId);
    render();
  });

  btnExport?.addEventListener("click", () => {
    const c = getOpenChat();
    const lines = c.messages.map((m) => `${m.role === "user" ? "Tú" : "IA"}: ${m.content}`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(c.title || "chat").replace(/[^\w\-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  chatSearch?.addEventListener("input", renderChatList);

  // ====== STORAGE ======
  function loadChats() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveChats() {
    localStorage.setItem(LS_KEY, JSON.stringify(chats));
  }

  function saveOpen(id) {
    localStorage.setItem(LS_OPEN, id);
  }

  function autosize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }
});