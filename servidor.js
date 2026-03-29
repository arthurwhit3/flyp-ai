require("dotenv").config();

const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* =========================
   SUPABASE CONFIG
========================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 🔐 SOMENTE NO BACKEND
);

/* =========================
   GEMINI CONFIG
========================= */

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* =========================
   MIDDLEWARE DE AUTENTICAÇÃO
========================= */

async function getUser(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

/* =========================
   CRIAR PERFIL AUTOMÁTICO
========================= */

async function ensureProfile(user) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) {
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.email,
    });
  }
}

/* =========================
   CRIAR CONVERSA
========================= */

async function criarConversa(userId, titulo = "Nova conversa") {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: titulo,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* =========================
   SALVAR MENSAGEM
========================= */

async function salvarMensagem(conversationId, userId, role, content) {
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
  });
}

/* =========================
   CHAT
========================= */

app.post("/chat", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({
        erro: "Usuário não autenticado",
      });
    }

    await ensureProfile(user);

    const { mensagem, conversationId } = req.body;

    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem vazia" });
    }

    let conversaId = conversationId;

    // se não tiver conversa, cria uma
    if (!conversaId) {
      const nova = await criarConversa(user.id, mensagem.slice(0, 30));
      conversaId = nova.id;
    }

    // salva mensagem do usuário
    await salvarMensagem(conversaId, user.id, "user", mensagem);

    // IA responde
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: mensagem }] }],
    });

    const resposta =
      (response.text || "").trim() ||
      "Não consegui responder agora.";

    // salva resposta
    await salvarMensagem(conversaId, user.id, "model", resposta);

    return res.json({
      resposta,
      conversationId: conversaId,
    });
  } catch (erro) {
    console.error("ERRO:", erro);

    return res.status(500).json({
      erro: "Erro interno",
    });
  }
});

/* =========================
   LISTAR CONVERSAS
========================= */

app.get("/conversations", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!user) return res.status(401).json({ erro: "Não autenticado" });

    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar conversas" });
  }
});

/* =========================
   LISTAR MENSAGENS
========================= */

app.get("/messages/:id", async (req, res) => {
  try {
    const user = await getUser(req);

    if (!user) return res.status(401).json({ erro: "Não autenticado" });

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", req.params.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar mensagens" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});