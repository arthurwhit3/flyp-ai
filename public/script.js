const chat = document.getElementById("chat");
const input = document.getElementById("mensagem");
const botao = document.getElementById("enviar");
const chatForm = document.getElementById("chatForm");
const novaConversaBtn = document.getElementById("novaConversa");

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

function criarMensagem(texto, tipo) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${tipo}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = texto;

  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);
  scrollChat();

  return bubble;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function digitarTexto(elemento, texto, velocidade = 15) {
  elemento.textContent = "";

  for (let i = 0; i < texto.length; i++) {
    elemento.textContent += texto[i];
    scrollChat();
    await esperar(velocidade);
  }
}

async function enviarMensagem() {
  const mensagem = input.value.trim();
  if (!mensagem) return;

  criarMensagem(mensagem, "user");
  input.value = "";
  input.focus();

  botao.disabled = true;

  const typingWrapper = document.createElement("div");
  typingWrapper.className = "message bot typing";

  const typingBubble = document.createElement("div");
  typingBubble.className = "bubble";
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
      typingBubble.textContent = dados.erro || "Não consegui responder agora.";
      return;
    }

    const textoResposta = dados.resposta || "Não consegui responder agora.";
    await digitarTexto(typingBubble, textoResposta, 15);

    typingWrapper.classList.remove("typing");
    typingWrapper.classList.add("bot");
  } catch (erro) {
    console.error("ERRO NO FRONTEND:", erro);
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
    "Olá! Eu sou o Flyp. Posso te ajudar com sistemas de gestão, ERP e automação comercial.",
    "bot"
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