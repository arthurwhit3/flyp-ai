let userGlobal = null;
let conversationId = null;
let modoAuth = "login";

const chat = document.getElementById("chat");
const input = document.getElementById("mensagem");
const botao = document.getElementById("enviar");
const chatForm = document.getElementById("chatForm");
const novaConversaBtn = document.getElementById("novaConversa");
const entrarBtn = document.getElementById("entrarBtn");
const landingScreen = document.getElementById("landingScreen");
const appWrapper = document.getElementById("appWrapper");
const chatTitle = document.getElementById("chatTitle");
const recentChatsList = document.getElementById("recentChatsList");

const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const closeMenu = document.getElementById("closeMenu");
const menuExcluirChat = document.getElementById("menuExcluirChat");
const menuExportarConversa = document.getElementById("menuExportarConversa");

const aboutOverlay = document.getElementById("aboutOverlay");
const aboutPanel = document.getElementById("aboutPanel");
const openAboutFlyp = document.getElementById("openAboutFlyp");
const closeAboutFlyp = document.getElementById("closeAboutFlyp");

const configOverlay = document.getElementById("configOverlay");
const configPanel = document.getElementById("configPanel");
const openConfigPanel = document.getElementById("openConfigPanel");
const closeConfigPanel = document.getElementById("closeConfigPanel");
const typingSpeedSelect = document.getElementById("typingSpeedSelect");
const animationsSelect = document.getElementById("animationsSelect");

const confirmDeleteOverlay = document.getElementById("confirmDeleteOverlay");
const confirmDeletePanel = document.getElementById("confirmDeletePanel");
const confirmDeleteChat = document.getElementById("confirmDeleteChat");
const cancelDeleteChat = document.getElementById("cancelDeleteChat");

const prismEasterEgg = document.getElementById("prismEasterEgg");
const themeButtons = document.querySelectorAll(".theme-btn");

const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const authModal = document.getElementById("authModal");
const authTitle = document.getElementById("authTitle");
const authEmail = document.getElementById("email");
const authPassword = document.getElementById("password");
const authSubmit = document.getElementById("authSubmit");
const closeModalBtn = document.getElementById("closeModal");

function abrirLogin() {
  modoAuth = "login";
  if (authTitle) authTitle.innerText = "Login";
  if (authModal) authModal.classList.remove("hidden");
}

function abrirSignup() {
  modoAuth = "signup";
  if (authTitle) authTitle.innerText = "Criar Conta";
  if (authModal) authModal.classList.remove("hidden");
}

function fecharModal() {
  if (authModal) authModal.classList.add("hidden");
}

function gerarSessionId() {
  if (window.crypto && crypto.randomUUID) {
    return "sessao-" + crypto.randomUUID();
  }
  return "sessao-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function obterSessionId() {
  let value = localStorage.getItem("flyp_session_id");
  if (!value) {
    value = gerarSessionId();
    localStorage.setItem("flyp_session_id", value);
  }
  return value;
}

function aplicarTemaSalvo() {
  const tema = localStorage.getItem("flyp_theme") || "blue";
  document.documentElement.setAttribute("data-theme", tema);
}

function salvarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem("flyp_theme", tema);
}

function getTypingSpeed() {
  return Number(localStorage.getItem("flyp_typing_speed") || "8");
}

function setTypingSpeed(value) {
  localStorage.setItem("flyp_typing_speed", String(value));
}

function getAnimationsEnabled() {
  return localStorage.getItem("flyp_animations") !== "off";
}

function setAnimationsEnabled(value) {
  localStorage.setItem("flyp_animations", value ? "on" : "off");
}

let sessionId = obterSessionId();
aplicarTemaSalvo();

function getHistoryIndex() {
  const raw = localStorage.getItem("flyp_chat_history_index");
  return raw ? JSON.parse(raw) : [];
}

function setHistoryIndex(index) {
  localStorage.setItem("flyp_chat_history_index", JSON.stringify(index));
}

function getChatStorageKey(id) {
  return `flyp_chat_${id}`;
}

function normalizarTitulo(texto) {
  const t = texto.toLowerCase().trim();

  if (t.includes("pearl jam")) return "Pearl Jam e sua história";
  if (t.includes("pink floyd")) return "Pink Floyd e sua trajetória";
  if (t.includes("fotoss")) return "Explicação sobre fotossíntese";
  if (t.includes("biologia")) return "Dúvida de biologia";
  if (t.includes("história")) return "Pergunta de história";
  if (t.includes("ciencia") || t.includes("ciência")) return "Pergunta de ciências";
  if (t.includes("tecnologia")) return "Tema de tecnologia";

  const limpo = texto
    .replace(/[?!.]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  if (!limpo) return "Nova conversa";

  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

function atualizarTituloDoChat() {
  const index = getHistoryIndex();
  const atual = index.find((item) => item.sessionId === sessionId);
  if (chatTitle) {
    chatTitle.textContent = atual?.title || "Nova conversa";
  }
}

function salvarMensagemNoHistorico(role, content) {
  const key = getChatStorageKey(sessionId);
  const raw = localStorage.getItem(key);
  const mensagens = raw ? JSON.parse(raw) : [];

  mensagens.push({
    role,
    content,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(key, JSON.stringify(mensagens));

  const index = getHistoryIndex();
  let existente = index.find((item) => item.sessionId === sessionId);

  const primeiraMensagemUsuario = mensagens.find((msg) => msg.role === "user");
  const title = primeiraMensagemUsuario
    ? normalizarTitulo(primeiraMensagemUsuario.content)
    : "Nova conversa";

  if (!existente) {
    index.unshift({
      sessionId,
      title,
      updatedAt: new Date().toISOString(),
    });
  } else {
    existente.updatedAt = new Date().toISOString();
    existente.title = title;
  }

  index.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  setHistoryIndex(index);
  renderizarChatsRecentes();
  atualizarTituloDoChat();
}

function carregarMensagensDaSessao(id) {
  const key = getChatStorageKey(id);
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function renderizarConversaSalva(id) {
  const mensagens = carregarMensagensDaSessao(id);
  if (!chat) return;

  chat.innerHTML = "";

  mensagens.forEach((msg) => {
    criarMensagem(
      msg.content,
      msg.role === "user" ? "user" : "bot",
      msg.role !== "user"
    );
  });

  scrollChat();
  atualizarTituloDoChat();
}

function renderizarChatsRecentes() {
  const index = getHistoryIndex();

  if (!recentChatsList) return;

  recentChatsList.innerHTML = "";

  if (index.length === 0) {
    recentChatsList.innerHTML =
      `<p class="recent-empty">Nenhuma conversa ainda.</p>`;
    return;
  }

  index.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "recent-chat-item";
    btn.type = "button";

    if (item.sessionId === sessionId) {
      btn.classList.add("active");
    }

    btn.innerHTML = `<div class="recent-chat-title">${item.title}</div>`;

    btn.addEventListener("click", () => {
      sessionId = item.sessionId;
      localStorage.setItem("flyp_session_id", sessionId);
      renderizarConversaSalva(sessionId);
      renderizarChatsRecentes();
    });

    recentChatsList.appendChild(btn);
  });
}

function excluirChatAtual() {
  localStorage.removeItem(getChatStorageKey(sessionId));

  const index = getHistoryIndex().filter((item) => item.sessionId !== sessionId);
  setHistoryIndex(index);

  if (index.length > 0) {
    sessionId = index[0].sessionId;
    localStorage.setItem("flyp_session_id", sessionId);
    renderizarConversaSalva(sessionId);
  } else {
    sessionId = gerarSessionId();
    localStorage.setItem("flyp_session_id", sessionId);
    if (chat) chat.innerHTML = "";
    atualizarTituloDoChat();
  }

  renderizarChatsRecentes();
}

function exportarConversaAtual() {
  const mensagens = carregarMensagensDaSessao(sessionId);
  if (!mensagens.length) return;

  const texto = mensagens
    .map((msg) => `${msg.role === "user" ? "Você" : "Flyp"}: ${msg.content}`)
    .join("\n\n");

  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chatTitle?.textContent || "conversa"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  fecharMenu();
}

function scrollChat() {
  if (chat) {
    chat.scrollTop = chat.scrollHeight;
  }
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderMarkdown(texto) {
  if (window.marked && window.DOMPurify) {
    const bruto = marked.parse(texto, {
      breaks: true,
      gfm: true,
    });
    return DOMPurify.sanitize(bruto);
  }
  return texto;
}

function criarMensagem(texto, tipo, usarMarkdown = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${tipo}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble markdown-content";

  if (usarMarkdown) {
    bubble.innerHTML = renderMarkdown(texto);
  } else {
    bubble.textContent = texto;
  }

  wrapper.appendChild(bubble);

  if (chat) {
    chat.appendChild(wrapper);
    scrollChat();
  }

  return bubble;
}

async function digitarTextoMarkdown(elemento, texto, velocidade = 9) {
  const animacoesLigadas = getAnimationsEnabled();

  if (!animacoesLigadas) {
    elemento.innerHTML = renderMarkdown(texto);
    scrollChat();
    return;
  }

  let acumulado = "";

  for (let i = 0; i < texto.length; i++) {
    acumulado += texto[i];
    elemento.innerHTML = renderMarkdown(acumulado);
    scrollChat();
    await esperar(velocidade);
  }
}

function entrarNoChat() {
  if (!landingScreen || !appWrapper) return;

  landingScreen.classList.add("exit");

  setTimeout(() => {
    landingScreen.classList.add("hidden");
    appWrapper.classList.remove("hidden");
    renderizarChatsRecentes();
    atualizarTituloDoChat();
  }, 420);
}

function abrirMenu() {
  if (!sideMenu || !menuOverlay || !menuToggle) return;
  sideMenu.classList.add("open");
  menuOverlay.classList.add("open");
  menuToggle.classList.add("active");
}

function fecharMenu() {
  if (!sideMenu || !menuOverlay || !menuToggle) return;
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("open");
  menuToggle.classList.remove("active");
}

function abrirSobreFlyp() {
  if (!aboutOverlay || !aboutPanel) return;
  aboutOverlay.classList.add("open");
  aboutPanel.classList.add("open");
  fecharMenu();
}

function fecharSobreFlypPanel() {
  if (!aboutOverlay || !aboutPanel) return;
  aboutOverlay.classList.remove("open");
  aboutPanel.classList.remove("open");
}

function abrirConfig() {
  if (!configOverlay || !configPanel) return;
  configOverlay.classList.add("open");
  configPanel.classList.add("open");
  fecharMenu();
}

function fecharConfig() {
  if (!configOverlay || !configPanel) return;
  configOverlay.classList.remove("open");
  configPanel.classList.remove("open");
}

function abrirConfirmacaoExclusao() {
  if (!confirmDeleteOverlay || !confirmDeletePanel) return;
  confirmDeleteOverlay.classList.add("open");
  confirmDeletePanel.classList.add("open");
  fecharMenu();
}

function fecharConfirmacaoExclusao() {
  if (!confirmDeleteOverlay || !confirmDeletePanel) return;
  confirmDeleteOverlay.classList.remove("open");
  confirmDeletePanel.classList.remove("open");
}

function mostrarPrismaEasterEgg() {
  if (!prismEasterEgg) return;

  prismEasterEgg.classList.add("active");

  setTimeout(() => {
    prismEasterEgg.classList.remove("active");
  }, 1800);
}

function ativarShineOn() {
  salvarTema("shine");
  mostrarPrismaEasterEgg();
}

async function enviarMensagem() {
  if (!input || !botao) return;

  const mensagem = input.value.trim();
  if (!mensagem) return;

  if (mensagem.toLowerCase() === "shine on") {
    criarMensagem(mensagem, "user", false);
    input.value = "";
    input.focus();
    salvarMensagemNoHistorico("user", mensagem);
    ativarShineOn();
    renderizarChatsRecentes();
    return;
  }

  criarMensagem(mensagem, "user", false);
  salvarMensagemNoHistorico("user", mensagem);

  input.value = "";
  input.focus();
  botao.disabled = true;

  const typingWrapper = document.createElement("div");
  typingWrapper.className = "message bot typing";

  const typingBubble = document.createElement("div");
  typingBubble.className = "bubble markdown-content";
  typingBubble.textContent = "Digitando...";

  typingWrapper.appendChild(typingBubble);

  if (chat) {
    chat.appendChild(typingWrapper);
    scrollChat();
  }

  try {
    const resposta = await fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensagem,
        userId: userGlobal?.id || null,
        conversationId,
      }),
    });

    const dados = await resposta.json();

    if (dados.conversationId) {
      conversationId = dados.conversationId;
    }

    if (!resposta.ok) {
      typingWrapper.classList.remove("typing");
      typingBubble.textContent = dados.erro || "Não consegui responder agora.";
      return;
    }

    const textoResposta = dados.resposta || "Não consegui responder agora.";
    await digitarTextoMarkdown(typingBubble, textoResposta, getTypingSpeed());
    typingWrapper.classList.remove("typing");
    salvarMensagemNoHistorico("model", textoResposta);
    renderizarChatsRecentes();
  } catch (erro) {
    console.error("ERRO NO FRONTEND:", erro);
    typingWrapper.classList.remove("typing");
    typingBubble.textContent = "Erro de conexão com o servidor.";
  } finally {
    botao.disabled = false;
    input.focus();
    scrollChat();
  }
}

function novaConversa() {
  sessionId = gerarSessionId();
  localStorage.setItem("flyp_session_id", sessionId);

  conversationId = null;

  if (chat) {
    chat.innerHTML = "";
  }

  atualizarTituloDoChat();
  renderizarChatsRecentes();
}

async function submitAuth() {
  const email = authEmail?.value?.trim();
  const password = authPassword?.value?.trim();

  if (!email || !password) {
    alert("Preencha email e senha.");
    return;
  }

  if (!window.supabaseClient) {
    alert("Supabase não inicializado.");
    return;
  }

  try {
    if (modoAuth === "signup") {
      const { error } = await window.supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Conta criada com sucesso.");
    } else {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      userGlobal = data.user;
      alert("Logado com sucesso.");
    }

    fecharModal();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    alert("Erro ao autenticar.");
  }
}

async function verificarUsuario() {
  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
      console.error("Erro ao verificar usuário:", error.message);
      return;
    }

    userGlobal = data.user || null;
  } catch (error) {
    console.error("Erro inesperado ao verificar usuário:", error);
  }
}

if (typingSpeedSelect) {
  typingSpeedSelect.value = String(getTypingSpeed());
  typingSpeedSelect.addEventListener("change", () => {
    setTypingSpeed(Number(typingSpeedSelect.value));
  });
}

if (animationsSelect) {
  animationsSelect.value = getAnimationsEnabled() ? "on" : "off";
  animationsSelect.addEventListener("change", () => {
    setAnimationsEnabled(animationsSelect.value === "on");
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    enviarMensagem();
  });
}

if (botao) {
  botao.addEventListener("click", () => {
    enviarMensagem();
  });
}

if (input) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      enviarMensagem();
    }
  });
}

if (novaConversaBtn) {
  novaConversaBtn.addEventListener("click", novaConversa);
}

if (entrarBtn) {
  entrarBtn.addEventListener("click", entrarNoChat);
}

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const aberto = sideMenu?.classList.contains("open");
    if (aberto) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });
}

if (closeMenu) closeMenu.addEventListener("click", fecharMenu);
if (menuOverlay) menuOverlay.addEventListener("click", fecharMenu);

if (openAboutFlyp) openAboutFlyp.addEventListener("click", abrirSobreFlyp);
if (closeAboutFlyp) closeAboutFlyp.addEventListener("click", fecharSobreFlypPanel);
if (aboutOverlay) aboutOverlay.addEventListener("click", fecharSobreFlypPanel);

if (openConfigPanel) openConfigPanel.addEventListener("click", abrirConfig);
if (closeConfigPanel) closeConfigPanel.addEventListener("click", fecharConfig);
if (configOverlay) configOverlay.addEventListener("click", fecharConfig);

if (menuExcluirChat) menuExcluirChat.addEventListener("click", abrirConfirmacaoExclusao);
if (cancelDeleteChat) cancelDeleteChat.addEventListener("click", fecharConfirmacaoExclusao);
if (confirmDeleteOverlay) confirmDeleteOverlay.addEventListener("click", fecharConfirmacaoExclusao);

if (confirmDeleteChat) {
  confirmDeleteChat.addEventListener("click", () => {
    excluirChatAtual();
    fecharConfirmacaoExclusao();
  });
}

if (menuExportarConversa) {
  menuExportarConversa.addEventListener("click", exportarConversaAtual);
}

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tema = btn.dataset.theme;
    salvarTema(tema);
  });
});

if (btnLogin) {
  btnLogin.addEventListener("click", abrirLogin);
}

if (btnSignup) {
  btnSignup.addEventListener("click", abrirSignup);
}

if (authSubmit) {
  authSubmit.addEventListener("click", submitAuth);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", fecharModal);
}

verificarUsuario();
renderizarChatsRecentes();
atualizarTituloDoChat();