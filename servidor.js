require("dotenv").config();

const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));


if (!process.env.SUPABASE_URL) {
  console.error("ERRO: SUPABASE_URL não definida.");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não definida.");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("ERRO: GEMINI_API_KEY não definida.");
  process.exit(1);
}


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
}

async function getUserFromRequest(req) {
  const token = getBearerToken(req);

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

function validarMensagem(mensagem) {
  return (
    typeof mensagem === "string" &&
    mensagem.trim().length > 0 &&
    mensagem.trim().length <= 4000
  );
}

function validarConversationId(conversationId) {
  if (conversationId == null) return true;

  return typeof conversationId === "string" && conversationId.trim().length > 0;
}



async function ensureProfile(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.email || "Usuário",
    });

    if (insertError) {
      throw insertError;
    }
  }
}


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

async function buscarConversaDoUsuario(conversationId, userId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function salvarMensagem(conversationId, userId, role, content) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
  });

  if (error) throw error;
}

async function buscarMensagensDaConversa(conversationId, userId) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

function converterMensagensParaGemini(messages) {
  return messages.map((msg) => ({
    role: msg.role === "model" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}


app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.post("/chat", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        erro: "Usuário não autenticado.",
      });
    }

    await ensureProfile(user);

    const { mensagem, conversationId } = req.body;

    if (!validarMensagem(mensagem)) {
      return res.status(400).json({
        erro: "Mensagem inválida.",
      });
    }

    if (!validarConversationId(conversationId)) {
      return res.status(400).json({
        erro: "Conversa inválida.",
      });
    }

    let conversaId = conversationId ? conversationId.trim() : null;

    if (conversaId) {
      const conversa = await buscarConversaDoUsuario(conversaId, user.id);

      if (!conversa) {
        return res.status(403).json({
          erro: "Você não tem acesso a esta conversa.",
        });
      }
    } else {
      const nova = await criarConversa(
        user.id,
        mensagem.trim().slice(0, 40) || "Nova conversa"
      );
      conversaId = nova.id;
    }

    await salvarMensagem(conversaId, user.id, "user", mensagem.trim());

    const mensagens = await buscarMensagensDaConversa(conversaId, user.id);
    const contents = converterMensagensParaGemini(mensagens);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        temperature: 0.6,
        maxOutputTokens: 500,
      },
    });

    const resposta =
      (response.text || "").trim() || "Não consegui responder agora.";

    await salvarMensagem(conversaId, user.id, "model", resposta);

    return res.json({
      resposta,
      conversationId: conversaId,
    });
  } catch (erro) {
    console.error("ERRO /chat:", erro?.message || erro);

    return res.status(500).json({
      erro: "Erro interno no servidor.",
    });
  }
});


app.get("/conversations", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ erro: "Não autenticado." });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (erro) {
    console.error("ERRO /conversations:", erro?.message || erro);
    return res.status(500).json({ erro: "Erro ao buscar conversas." });
  }
});


app.get("/messages/:id", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ erro: "Não autenticado." });
    }

    const conversationId = req.params.id;

    const conversa = await buscarConversaDoUsuario(conversationId, user.id);

    if (!conversa) {
      return res.status(403).json({
        erro: "Você não tem acesso a esta conversa.",
      });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.json(data || []);
  } catch (erro) {
    console.error("ERRO /messages/:id:", erro?.message || erro);
    return res.status(500).json({ erro: "Erro ao buscar mensagens." });
  }
});


app.delete("/conversations/:id", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ erro: "Não autenticado." });
    }

    const conversationId = req.params.id;

    const conversa = await buscarConversaDoUsuario(conversationId, user.id);

    if (!conversa) {
      return res.status(403).json({
        erro: "Você não tem acesso a esta conversa.",
      });
    }

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) throw error;

    return res.json({ ok: true });
  } catch (erro) {
    console.error("ERRO DELETE /conversations/:id:", erro?.message || erro);
    return res.status(500).json({ erro: "Erro ao excluir conversa." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});