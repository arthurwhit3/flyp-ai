require("dotenv").config();

console.log("API KEY carregada:", !!process.env.GEMINI_API_KEY);

const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sessoes = new Map();

function gerarHistoricoInicial() {
  return [
    {
      role: "user",
      parts: [{ text: "Olá" }],
    },
    {
      role: "model",
      parts: [
        {
          text: "Olá! Eu sou o Flyp. Posso te ajudar com assuntos diversos. Pode perguntar!",
        },
      ],
    },
  ];
}

function obterHistorico(sessionId) {
  if (!sessoes.has(sessionId)) {
    sessoes.set(sessionId, gerarHistoricoInicial());
  }
  return sessoes.get(sessionId);
}

function limitarHistorico(historico, maxItens = 12) {
  if (historico.length <= maxItens) return historico;
  return historico.slice(-maxItens);
}

async function atendimentoFlypper(sessionId, mensagemUsuario) {
  const historico = obterHistorico(sessionId);

  historico.push({
    role: "user",
    parts: [{ text: mensagemUsuario }],
  });

  const historicoLimitado = limitarHistorico(historico);

  try {
    console.log("ENVIANDO PARA IA...");
    console.log("Sessão:", sessionId);
    console.log("Mensagem:", mensagemUsuario);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: historicoLimitado,
      config: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 500,
        systemInstruction: `
Você é o Flyp, um assistente virtual inteligente capaz de ajudar em diversos assuntos, como história, ciências, biologia, tecnologia e conhecimentos gerais.

Regras:
- Responda em português do Brasil.
- Só se apresente na primeira interação.
- Nas próximas mensagens, continue normalmente.
- Responda com segurança quando souber a resposta.
- Quando houver incerteza, deixe isso claro em vez de inventar.
- Se a pergunta estiver confusa, peça mais detalhes.
- Se o usuário quiser estudar, explique de forma didática.
- Se o usuário pedir resumo, resuma.
- Se o usuário pedir exemplos, dê exemplos.
- Se você não tiver certeza, deixe isso claro.

Temas principais:
- Conhecimentos gerais
- Biologia
- Ciências
- História
- Tecnologia
- Educação
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

    console.log("RESPOSTA DA IA:", resposta);

    return resposta;
  } catch (erro) {
    console.error("ERRO NA IA:");
    console.error(erro);

    if (erro?.status === 429) {
      return "A IA atingiu o limite de uso no momento. Troque a chave da API ou tente novamente mais tarde.";
    }

    return "No momento não consegui responder. Tente novamente em instantes.";
  }
}

app.post("/chat", async (req, res) => {
  try {
    console.log("BATEU NA ROTA /chat");
    console.log("BODY RECEBIDO:", req.body);

    const { mensagem, sessionId } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ erro: "Sessão inválida." });
    }

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ erro: "Mensagem vazia." });
    }

    const resposta = await atendimentoFlypper(sessionId, mensagem.trim());
    return res.json({ resposta });
  } catch (erro) {
    console.error("ERRO NA ROTA /chat:");
    console.error(erro);

    return res.status(500).json({
      erro: "Erro interno no servidor.",
    });
  }
});

app.post("/nova-conversa", (req, res) => {
  try {
    console.log("BATEU NA ROTA /nova-conversa");
    console.log("BODY RECEBIDO:", req.body);

    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ erro: "Sessão inválida." });
    }

    sessoes.set(sessionId, gerarHistoricoInicial());

    return res.json({ ok: true });
  } catch (erro) {
    console.error("ERRO NA ROTA /nova-conversa:");
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao iniciar nova conversa.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});