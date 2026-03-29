require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERRO: GEMINI_API_KEY não encontrada.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Sessões temporárias em memória.
 * Isso ainda NÃO é persistência segura de usuário.
 * Quando entrarmos com Supabase, isso será substituído por banco + auth.
 */
const sessoes = new Map();

/**
 * Rate limit simples em memória por IP.
 * Bom para proteção básica de testes.
 */
const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 20;

function limparRateLimitAntigo() {
  const agora = Date.now();

  for (const [ip, dados] of rateLimitStore.entries()) {
    if (agora - dados.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

function verificarRateLimit(ip) {
  limparRateLimitAntigo();

  const agora = Date.now();
  const atual = rateLimitStore.get(ip);

  if (!atual) {
    rateLimitStore.set(ip, {
      count: 1,
      windowStart: agora,
    });
    return true;
  }

  if (agora - atual.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, {
      count: 1,
      windowStart: agora,
    });
    return true;
  }

  if (atual.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  atual.count += 1;
  return true;
}

function gerarHistoricoInicial() {
  return [];
}

function obterHistorico(sessionId) {
  if (!sessoes.has(sessionId)) {
    sessoes.set(sessionId, gerarHistoricoInicial());
  }
  return sessoes.get(sessionId);
}

function limitarHistorico(historico, maxItens = 12) {
  if (!Array.isArray(historico)) return [];
  if (historico.length <= maxItens) return historico;
  return historico.slice(-maxItens);
}

function validarSessionId(sessionId) {
  return (
    typeof sessionId === "string" &&
    sessionId.trim().length >= 8 &&
    sessionId.trim().length <= 120
  );
}

function validarMensagem(mensagem) {
  return (
    typeof mensagem === "string" &&
    mensagem.trim().length > 0 &&
    mensagem.trim().length <= 2000
  );
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function hashSessionId(sessionId) {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}

async function atendimentoFlyp(sessionId, mensagemUsuario) {
  const historico = obterHistorico(sessionId);

  historico.push({
    role: "user",
    parts: [{ text: mensagemUsuario }],
  });

  const historicoLimitado = limitarHistorico(historico);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: historicoLimitado,
      config: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 500,
        systemInstruction: `
Você é o Flyp, um assistente virtual inteligente.

Regras:
- Responda em português do Brasil.
- Seja claro, simpático e objetivo.
- Não se apresente em toda mensagem.
- Se não souber algo, diga com honestidade.
- Não invente dados.
- Ajude em estudos, curiosidades, tecnologia, história, biologia e temas gerais.
        `,
      },
    });

    const resposta =
      (response.text || "").trim() ||
      "Não consegui gerar uma resposta válida agora.";

    historico.push({
      role: "model",
      parts: [{ text: resposta }],
    });

    sessoes.set(sessionId, limitarHistorico(historico));

    return resposta;
  } catch (erro) {
    console.error("ERRO NA IA:", {
      status: erro?.status || null,
      message: erro?.message || "Erro desconhecido",
    });

    if (erro?.status === 429) {
      return "A IA atingiu o limite de uso no momento. Tente novamente mais tarde.";
    }

    return "No momento não consegui responder. Tente novamente em instantes.";
  }
}

/**
 * Middleware básico de segurança
 */
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.post("/chat", async (req, res) => {
  try {
    const ip = getClientIp(req);

    if (!verificarRateLimit(ip)) {
      return res.status(429).json({
        erro: "Muitas requisições. Tente novamente em instantes.",
      });
    }

    const { mensagem, sessionId } = req.body;

    if (!validarSessionId(sessionId)) {
      return res.status(400).json({ erro: "Sessão inválida." });
    }

    if (!validarMensagem(mensagem)) {
      return res.status(400).json({
        erro: "Mensagem inválida. Ela deve ter entre 1 e 2000 caracteres.",
      });
    }

    const resposta = await atendimentoFlyp(sessionId.trim(), mensagem.trim());

    return res.json({ resposta });
  } catch (erro) {
    console.error("ERRO NA ROTA /chat:", {
      message: erro?.message || "Erro desconhecido",
    });

    return res.status(500).json({
      erro: "Erro interno no servidor.",
    });
  }
});

app.post("/nova-conversa", (req, res) => {
  try {
    const ip = getClientIp(req);

    if (!verificarRateLimit(ip)) {
      return res.status(429).json({
        erro: "Muitas requisições. Tente novamente em instantes.",
      });
    }

    const { sessionId } = req.body;

    if (!validarSessionId(sessionId)) {
      return res.status(400).json({ erro: "Sessão inválida." });
    }

    sessoes.set(sessionId.trim(), gerarHistoricoInicial());

    return res.json({ ok: true });
  } catch (erro) {
    console.error("ERRO NA ROTA /nova-conversa:", {
      message: erro?.message || "Erro desconhecido",
    });

    return res.status(500).json({
      erro: "Erro ao iniciar nova conversa.",
    });
  }
});

/**
 * Endpoint temporário para depuração mínima
 * Não retorna conteúdo das conversas, só quantidade.
 */
app.get("/debug/session-count", (_req, res) => {
  return res.json({
    totalSessions: sessoes.size,
  });
});

/**
 * Limpeza simples de sessões muito antigas
 * (exemplo de endurecimento até entrar banco real)
 */
setInterval(() => {
  // Se no futuro quiser, aqui podemos guardar timestamp por sessão
  // e remover as antigas. Por enquanto deixamos como placeholder.
}, 10 * 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});