import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Preloaded B2B strict document knowledge-base for the RAG simulator
const CORPUS = [
  {
    text: "A recent brand tracker conducted for O Boticário in Q3 highlighted that 34% of surveyed women aged 30 to 45 stated they are actively trying to conceive or planning a pregnancy in the next 12 months. This trend is stable across regions.",
    source: "Brand Tracker O Boticário Q3",
    page: "Página 14",
    drive_bucket: "Drive: Boticário"
  },
  {
    text: "Euromonitor Brazil 2024 report indicates premium cosmetics sector grew by 18.2% year-on-year, driven heavily by skincare lines containing organic Amazonian ingredients. Active older demographics (55+) contributed more than 40% of this growth segment.",
    source: "Euromonitor Brazil Report",
    page: "Página 42",
    drive_bucket: "Drive: Categoria"
  },
  {
    text: "GWI Brazil Q4 2023 survey points out that 68% of Gen Z consumers prefer to discover new brands via interactive short videos rather than static search engine ads, with average daily screen times on video networks reaching 3.4 hours in Brazil.",
    source: "GWI Brazil Q4 2023 Study",
    page: "Página 19",
    drive_bucket: "Drive: Compartilhado"
  },
  {
    text: "A deep dive study on pet parenting habits in LATAM found that 72% of single households in Brazilian capital cities consider their dogs/cats as primary children ('filhos de quatro patas'), directing 15% of their monthly income to specialized nutrition and premium vet care.",
    source: "Estudo Amigos de Quatro Patas - GWI 2024",
    page: "Página 3",
    drive_bucket: "Drive: Compartilhado"
  },
  {
    text: "Estudos de pós-venda da Heineken revelaram que 45% dos consumidores jovens de cervejas premium preferem latas de alumínio especiais com isolamento térmico temporário para eventos outdoor, mesmo que o valor unitário custe até 22% a mais do que o envase tradicional.",
    source: "Insight Report Heineken Brasil",
    page: "Página 7",
    drive_bucket: "Drive: Heineken"
  },
  {
    text: "Tracker de performance em capitais do Sudeste revelou que 52% dos corredores amadores de alta renda afirmam correr mais de 15km por semana no período noturno devido a rotinas de trabalho flexíveis combinadas com temperaturas urbanas elevadas durante o dia.",
    source: "Nike Run Insight Q1",
    page: "Página 11",
    drive_bucket: "Drive: Nike"
  },
  {
    text: "McKinsey LATAM survey on high-end luxury e-commerce reveals online channels now account for 29% of all premium retail transactions in Brazil, growing 3x faster than traditional brick-and-mortar boutique sales in premium shopping centers due to logistical convenience.",
    source: "McKinsey Luxury LATAM",
    page: "Página 22",
    drive_bucket: "Drive: Categoria"
  },
  {
    text: "Pesquisa NielsenIQ constatou que 61% das famílias de classe média-alta no Brasil agora escolhem ativamente refis de produtos de limpeza ecológicos biodegradáveis para reduzir o desperdício de plástico de uso único e alinhar com valores ecológicos.",
    source: "Green Living Trend - NielsenIQ",
    page: "Página 5",
    drive_bucket: "Drive: Categoria"
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Real Gemini Server-Side RAG Engine Proxy Endpoint
  app.post("/api/insights/query", async (req, res) => {
    const { query } = req.body;
    const normQuery = (query || "").toLowerCase();

    // 1. Local Retrieval (BM25 / Keyword filtering over our preloaded Corporate Database)
    // We score occurrences of query keywords in our document strings
    const words = normQuery.split(/\s+/).filter((w: string) => w.length > 2);
    const scoredDocs = CORPUS.map(doc => {
      let score = 0;
      const textToSearch = `${doc.text} ${doc.source} ${doc.drive_bucket}`.toLowerCase();
      
      // Match query words
      for (const word of words) {
        if (textToSearch.includes(word)) {
          score += 10;
        }
      }
      return { ...doc, matchScore: score };
    });

    // Sort by matches, and take top 4 matches
    const retrieved = scoredDocs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);

    // If no words matched, take default top 3 entries for high contextual density
    const contextDocs = retrieved[0].matchScore > 0 ? retrieved : CORPUS.slice(0, 3);

    // 2. Validate API key presence for real intelligence. If missing, fall back to high-fidelity matching
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.log("[RAG Engine] API Key is missing. Serving high-fidelity simulated structured output.");
      const simulatorOutput = simulateLlmStructure(normQuery, contextDocs);
      return res.json({ insights: simulatorOutput, offline: true });
    }

    try {
      // 3. Connect to Google Gemini API
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Construct Context and strictly instruct anti-hallucination policies
      const formattedContext = contextDocs.map((doc, idx) => {
        return `--- REGISTRO ${idx} ---\nFONTE: ${doc.source}\nPÁGINA: ${doc.page}\nBUCKET DO GOOGLE DRIVE: ${doc.drive_bucket}\nCONTEÚDO DO DOCUMENTO: ${doc.text}`;
      }).join("\n\n");

      const systemInstruction = (
        "Você é o Gerador de Insights do Insight Engine, plataforma B2B corporativa da AlmapBBDO para planejadores criativos.\n"
        + "Sua tarefa é ler a consulta do planejador e os registros de dados fornecidos, e produzir um array estruturado de manchetes diretas.\n"
        + "REGRAS DE CONFORMIDADE CRÍTICAS (REGIME DE RIGOR ABSOLUTO):\n"
        + "1. TOLERÂNCIA ZERO PARA ALUCINAÇÕES. Você SÓ pode emitir uma manchete se ela estiver 100% embasada por dados numéricos ou qualitativos fortes presentes no contexto.\n"
        + "2. Citação Rastreável: O campo 'excerpt' DEVE obter a frase exata contendo o dado, extraída de forma literal/ipsis litteris (sem mudar letras nem palavras, mantendo o idioma original do relatório, geralmente em inglês ou português) dos documentos do contexto.\n"
        + "3. Manchete Direta (headline): Transforme a conclusão em uma frase matadora e direta de impacto estratégico, escrita exclusivamente em Português de alta qualidade (PT-BR). Evite preâmbulos do tipo 'Segundo o relatório...' ou 'Como vimos...'.\n"
        + "4. extraia a 'source_name' exata, 'source_page' exata e o 'drive_bucket' exato associado ao documento de origem.\n"
        + "5. 'relevance_score' deve ser um inteiro de 0 a 100 medindo quão alinhado o dado está com a busca do usuário.\n"
        + "6. Se nenhum dado do contexto atual responder à query, retorne um array vazio []."
      );

      const promptMessage = `Pergunta do Planejador: "${query}"\n\nContexto dos Relatórios Disponíveis:\n${formattedContext}`;

      console.log("[RAG Engine] Executing Gemini-3.5-flash content generation...");
      
      // Implement robust retry with 2 attempts for transient 503/high-demand API exceptions
      let response;
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        try {
          attempts++;
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptMessage,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                description: "Lista de manchetes extraídas com citação direta do contexto",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de 2 a 3 tags temáticas ou de tipo de estudo"
                    },
                    headline: {
                      type: Type.STRING,
                      description: "Manchete direta com o dado de impacto traduzido para Português (PT-BR)."
                    },
                    excerpt: {
                      type: Type.STRING,
                      description: "Citação direta literal (ipsis litteris) em inglês ou português conforme contida no documento fonte de apoio."
                    },
                    source_name: { type: Type.STRING, description: "Nome correto do relatório de origem" },
                    source_page: { type: Type.STRING, description: "Número correspondente da página" },
                    relevance_score: { type: Type.INTEGER, description: "Score de relevância geral entre 0 e 100" },
                    drive_bucket: { type: Type.STRING, description: "O drive_bucket original. Ex: 'Drive: Boticário'" }
                  },
                  required: ["tags", "headline", "excerpt", "source_name", "source_page", "relevance_score", "drive_bucket"]
                }
              }
            }
          });
          break; // break loop on success
        } catch (e: any) {
          if (attempts >= maxAttempts) {
            throw e; // rethrow to be caught by main try-catch and trigger simulated fallback
          }
          console.warn(`[RAG Engine] Attempt ${attempts} failed with transient error: ${e.message || e}. Retrying in 150ms...`);
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      if (!response) {
        throw new Error("No response returned from the Gemini API model");
      }

      const responseText = response.text || "[]";
      console.log("[RAG Engine] Gemini success, parse count: ", responseText.length);
      const parsedInsights = JSON.parse(responseText);
      
      return res.json({ insights: parsedInsights, offline: false });

    } catch (error: any) {
      console.warn("[RAG Engine] Gemini invocation failed with service error. Falling back smoothly to corporate simulator:", error.message || error);
      // Fallback in case of rate limits or service disturbances
      const fallbackOutput = simulateLlmStructure(normQuery, contextDocs);
      return res.json({ 
        insights: fallbackOutput, 
        offline: true, 
        error: "O modelo de IA está temporariamente sob alta demanda internacional. O Insight Engine reverteu automaticamente para o banco de dados corporativo local." 
      });
    }
  });

  // Serve static files in production setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Insight Engine Server] Running on http://localhost:${PORT}`);
  });
}

// Simulated LLM model output matching exact RAG instructions
function simulateLlmStructure(query: string, docs: any[]) {
  const list: any[] = [];
  for (const doc of docs) {
    const text = doc.text;
    const source = doc.source;
    const drive_bucket = doc.drive_bucket;

    if (source.includes("Boticário")) {
      list.push({
        tags: ["Maternidade", "Mulheres 30+", "Quantitativo"],
        headline: "1 em cada 3 mulheres brasileiras na faixa de 30-45 anos pretende engravidar nos próximos 12 meses.",
        excerpt: "34% of surveyed women aged 30 to 45 stated they are actively trying to conceive or planning a pregnancy in the next 12 months.",
        source_name: source,
        source_page: doc.page,
        relevance_score: 95,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("Euromonitor")) {
      list.push({
        tags: ["Skincare", "Sêniores (55+)", "Cosméticos Premium"],
        headline: "Consumidores sêniores (55+) sustentam expansão de cosméticos premium no Brasil, liderando 40% do crescimento do setor.",
        excerpt: "Active older demographics (55+) contributed more than 40% of this growth segment.",
        source_name: source,
        source_page: doc.page,
        relevance_score: 88,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("GWI") && text.includes("short videos")) {
      list.push({
        tags: ["Geração Z", "Vídeos Curtos", "Estudo de Canais"],
        headline: "Vídeos curtos superam anúncios de buscas tradicionais para 68% da Geração Z ao descobrir novas marcas no Brasil.",
        excerpt: "68% of Gen Z consumers prefer to discover new brands via interactive short videos rather than static search engine ads",
        source_name: source,
        source_page: doc.page,
        relevance_score: 92,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("Quatro Patas")) {
      list.push({
        tags: ["Mercado Pet", "Filhos de 4 Patas", "Orçamento Familiar"],
        headline: "Casais sem filhos ou solteiros direcionam até 15% da renda mensal para nutrição especializada de seus pets em capitais.",
        excerpt: "72% of single households in Brazilian capital cities consider their dogs/cats as primary children... directing 15% of their monthly income to specialized nutrition",
        source_name: source,
        source_page: doc.page,
        relevance_score: 94,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("Heineken")) {
      list.push({
        tags: ["Cerveja Premium", "Conveniência", "Eventos Outdoor"],
        headline: "Embalagens com isolamento térmico atraem 45% do público jovem de cerveja premium no Brasil, suportando ágio de até 22%.",
        excerpt: "45% dos consumidores jovens de cervejas premium preferem latas de alumínio especiais com isolamento térmico... mesmo que o valor unitário custe até 22% a mais",
        source_name: source,
        source_page: doc.page,
        relevance_score: 90,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("Nike")) {
      list.push({
        tags: ["Corrida Noturna", "Hábitos Saudáveis", "Gasto Premium"],
        headline: "Mais da metade dos atletas urbanos amadores (52%) corre à noite para fugir do calor e conciliar horários de trabalho.",
        excerpt: "52% dos corredores amadores de alta renda afirmam correr mais de 15km por semana no período noturno devido a rotinas de trabalho flexíveis",
        source_name: source,
        source_page: doc.page,
        relevance_score: 91,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("McKinsey")) {
      list.push({
        tags: ["Varejo de Luxo", "E-Commerce", "Conveniência"],
        headline: "Online cresce 3x mais rápido do que lojas físicas e conquista 29% das vendas de alto luxo no Brasil.",
        excerpt: "online channels now account for 29% of all premium retail transactions in Brazil, growing 3x faster than traditional brick-and-mortar boutique sales",
        source_name: source,
        source_page: doc.page,
        relevance_score: 89,
        drive_bucket: drive_bucket
      });
    } else if (source.includes("Nielsen")) {
      list.push({
        tags: ["Consumo Verde", "Sustentabilidade", "Embalagens"],
        headline: "Preferência por embalagens ecológicas atinge 61% das famílias de alta renda brasileiras no segmento de limpeza doméstica.",
        excerpt: "61% das famílias de classe média-alta no Brasil agora escolhem ativamente refis de produtos de limpeza ecológicos biodegradáveis",
        source_name: doc.source,
        source_page: doc.page,
        relevance_score: 86,
        drive_bucket: drive_bucket
      });
    }
  }

  // Fallback in case list is empty, return top 3 to guarantee view context
  return list.length > 0 ? list : [
    {
      tags: ["Maternidade", "Mulheres 30+", "Quantitativo"],
      headline: "1 em cada 3 mulheres brasileiras de 30 a 45 anos planeja engravidar nos próximos 12 meses.",
      excerpt: "34% of surveyed women aged 30 to 45 stated they are actively trying to conceive or planning a pregnancy in the next 12 months.",
      source_name: "Brand Tracker O Boticário Q3",
      source_page: "Página 14",
      relevance_score: 96,
      drive_bucket: "Drive: Boticário"
    }
  ];
}

startServer();
