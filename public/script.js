const chat = document.getElementById("chat");
const input = document.getElementById("mensagem");
const botao = document.getElementById("enviar");
const chatForm = document.getElementById("chatForm");
const novaConversaBtn = document.getElementById("novaConversa");
const entrarBtn = document.getElementById("entrarBtn");
const landingScreen = document.getElementById("landingScreen");
const appWrapper = document.getElementById("appWrapper");

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

let sessionId = obterSessionId();

function scrollChat() {
  chat.scrollTop = chat.scrollHeight;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderMarkdown(texto) {
  const bruto = marked.parse(texto, {
    breaks: true,
    gfm: true
  });

  return DOMPurify.sanitize(bruto);
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
  chat.appendChild(wrapper);
  scrollChat();

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
  landingScreen.classList.add("exit");

  setTimeout(() => {
    landingScreen.classList.add("hidden");
    appWrapper.classList.remove("hidden");
  }, 420);
}

async function enviarMensagem() {
  const mensagem = input.value.trim();
  if (!mensagem) return;

  criarMensagem(mensagem, "user", false);
  input.value = "";
  input.focus();

  botao.disabled = true;

  const typingWrapper = document.createElement("div");
  typingWrapper.className = "message bot typing";

  const typingBubble = document.createElement("div");
  typingBubble.className = "bubble markdown-content";
  typingBubble.textContent = "Digitando...";

  typingWrapper.appendChild(typingBubble);
  chat.appendChild(typingWrapper);
  scrollChat();

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

  chat.innerHTML = "";
  criarMensagem(
    "Olá! Eu sou o **Flyp**.\n\nPosso te ajudar com biologia, ciências, história, tecnologia e assuntos diversos. Pode perguntar.",
    "bot",
    true
  );

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

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  enviarMensagem();
});

botao.addEventListener("click", () => {
  enviarMensagem();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    enviarMensagem();
  }
});

novaConversaBtn.addEventListener("click", novaConversa);
entrarBtn.addEventListener("click", entrarNoChat);