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
const menuLimparConversa = document.getElementById("menuLimparConversa");
const menuExportarConversa = document.getElementById("menuExportarConversa");

const aboutOverlay = document.getElementById("aboutOverlay");
const aboutPanel = document.getElementById("aboutPanel");
const openAboutFlyp = document.getElementById("openAboutFlyp");
const closeAboutFlyp = document.getElementById("closeAboutFlyp");

const prismEasterEgg = document.getElementById("prismEasterEgg");
const themeButtons = document.querySelectorAll(".theme-btn");

function gerarSessionId() {
  if (window.crypto && crypto.randomUUID) {
    return "sessao-" + crypto.randomUUID();
  }

  return "sessao-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function obterSessionId() {
  let sessionId = localStorage.getItem("flyp_session_id");

  if (!sessionId) {
    sessionId = gerarSessionId();
    localStorage.setItem("flyp_session_id", sessionId);
  }

  return sessionId;
}

function aplicarTemaSalvo() {
  const tema = localStorage.getItem("flyp_theme") || "blue";
  document.documentElement.setAttribute("data-theme", tema);
}

function salvarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  localStorage.setItem("flyp_theme", tema);
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

  if (t.includes("pearl jam")) return "História da Pearl Jam";
  if (t.includes("pink floyd")) return "Universo do Pink Floyd";
  if (t.includes("fotoss")) return "Explicação sobre Fotossíntese";
  if (t.includes("biologia")) return "Dúvida de Biologia";
  if (t.includes("história")) return "Pergunta de História";
  if (t.includes("ciencia") || t.includes("ciência")) return "Pergunta de Ciências";
  if (t.includes("tecnologia")) return "Tema de Tecnologia";

  const limpo = texto
    .replace(/[?!.]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
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
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(key, JSON.stringify(mensagens));

  let index = getHistoryIndex();
  let existente = index.find((item) => item.sessionId === sessionId);

  const primeiraMensagemUsuario = mensagens.find((msg) => msg.role === "user");
  const previewBase = primeiraMensagemUsuario?.content || mensagens[0]?.content || "Nova conversa";
  const preview = previewBase.slice(0, 80);
  const title = primeiraMensagemUsuario ? normalizarTitulo(primeiraMensagemUsuario.content) : "Nova conversa";

  if (!existente) {
    index.unshift({
      sessionId,
      title,
      preview,
      updatedAt: new Date().toISOString()
    });
  } else {
    existente.updatedAt = new Date().toISOString();
    existente.preview = preview;
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
    criarMensagem(msg.content, msg.role === "user" ? "user" : "bot", msg.role !== "user");
  });

  scrollChat();
  atualizarTituloDoChat();
}

function renderizarChatsRecentes() {
  const index = getHistoryIndex();

  if (!recentChatsList) return;

  recentChatsList.innerHTML = "";

  if (index.length === 0) {
    recentChatsList.innerHTML = `<p class="recent-empty">Nenhuma conversa ainda.</p>`;
    return;
  }

  index.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "recent-chat-item";
    btn.type = "button";

    if (item.sessionId === sessionId) {
      btn.classList.add("active");
    }

    btn.innerHTML = `
      <div class="recent-chat-title">${item.title}</div>
      <div class="recent-chat-preview">${item.preview}</div>
    `;

    btn.addEventListener("click", () => {
      sessionId = item.sessionId;
      localStorage.setItem("flyp_session_id", sessionId);
      renderizarConversaSalva(sessionId);
      renderizarChatsRecentes();
    });

    recentChatsList.appendChild(btn);
  });
}

function limparConversaAtual() {
  localStorage.removeItem(getChatStorageKey(sessionId));

  const index = getHistoryIndex().filter((item) => item.sessionId !== sessionId);
  setHistoryIndex(index);

  if (chat) {
    chat.innerHTML = "";
  }

  const mensagemInicial =
    "Olá! Eu sou o **Flyp**.\n\nPosso te ajudar com biologia, ciências, história, tecnologia e assuntos diversos. Pode perguntar.";

  criarMensagem(mensagemInicial, "bot", true);
  salvarMensagemNoHistorico("model", mensagemInicial);
  fecharMenu();
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
      gfm: true
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
        sessionId,
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      typingWrapper.classList.remove("typing");
      typingBubble.textContent = dados.erro || "Não consegui responder agora.";
      return;
    }

    const textoResposta = dados.resposta || "Não consegui responder agora.";

    await digitarTextoMarkdown(typingBubble, textoResposta, 8);
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

async function novaConversa() {
  sessionId = gerarSessionId();
  localStorage.setItem("flyp_session_id", sessionId);

  if (chat) {
    chat.innerHTML = "";
  }

  const mensagemInicial =
    "Olá! Eu sou o **Flyp**.\n\nPosso te ajudar com biologia, ciências, história, tecnologia e assuntos diversos. Pode perguntar.";

  criarMensagem(mensagemInicial, "bot", true);
  salvarMensagemNoHistorico("model", mensagemInicial);
  renderizarChatsRecentes();

  try {
    await fetch("/nova-conversa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });
  } catch (erro) {
    console.error("Erro ao iniciar nova conversa:", erro);
  }
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
    const aberto = sideMenu.classList.contains("open");

    if (aberto) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });
}

if (closeMenu) {
  closeMenu.addEventListener("click", fecharMenu);
}

if (menuOverlay) {
  menuOverlay.addEventListener("click", fecharMenu);
}

if (openAboutFlyp) {
  openAboutFlyp.addEventListener("click", abrirSobreFlyp);
}

if (closeAboutFlyp) {
  closeAboutFlyp.addEventListener("click", fecharSobreFlypPanel);
}

if (aboutOverlay) {
  aboutOverlay.addEventListener("click", fecharSobreFlypPanel);
}

if (menuLimparConversa) {
  menuLimparConversa.addEventListener("click", limparConversaAtual);
}

if (menuExportarConversa) {
  menuExportarConversa.addEventListener("click", exportarConversaAtual);
}

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tema = btn.dataset.theme;
    salvarTema(tema);
    fecharMenu();
  });
});

renderizarChatsRecentes();
atualizarTituloDoChat();