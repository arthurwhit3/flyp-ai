const { GoogleGenAI } = require("@google/genai");
const readline = require("readline");

const ai = new GoogleGenAI({
  apiKey: "AIzaSyCFeOgzirgf7IixsZmPRasCnbux6TTZKWg"
});

async function atendimentoFlypper(mensagemUsuario) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: mensagemUsuario,
    config: {
      systemInstruction: `
Você é o "Flyp", o assistente virtual da Flypper Sistemas.
Seu objetivo é ajudar clientes e interessados sobre as soluções de software da empresa.

Diretrizes:
1. Seja profissional, ágil e prestativo.
2. Fale sobre os principais produtos: ERP Flypper, Gestão para Postos de Combustíveis, Varejo e Automação Comercial.
3. Se o usuário quiser suporte técnico, oriente-o a abrir um chamado ou entrar em contato pelo telefone/WhatsApp oficial.
4. Se o usuário quiser uma demonstração, peça o nome e o segmento da empresa dele.
5. Nunca invente preços; se perguntarem, diga que um consultor entrará em contato para entender as necessidades específicas.

Contexto da Empresa: A Flypper Sistemas foca em tecnologia para gestão empresarial, buscando simplificar processos complexos.
      `
    }
  });

  return response.text;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Digite sua pergunta para o Flyp: ", async (pergunta) => {
  try {
    const resposta = await atendimentoFlypper(pergunta);
    console.log("\nResposta do agente:\n");
    console.log(resposta);
  } catch (erro) {
    console.error("\nErro ao executar o agente:");
    console.error(erro);
  } finally {
    rl.close();
  }
});