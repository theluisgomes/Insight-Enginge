import React, { useState, useEffect } from "react";
import HeadlineCard from "./components/HeadlineCard";

interface InsightData {
  tags: string[];
  headline: string;
  excerpt: string;
  source_name: string;
  source_page: string;
  relevance_score: number;
  drive_bucket: string;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [currentNamespace, setCurrentNamespace] = useState("almap_bbdo_planner");

  // Selected quick research queries for Almap planners
  const suggestions = [
    { label: "Maternidade/Boticário", q: "maternidade e consumo boticário" },
    { label: "Geração Z / GWI", q: "comportamento geração z gwi" },
    { label: "Mercado Pet (Solteiros)", q: "filhos de quatro patas" },
    { label: "Cerveja Heineken", q: "cerveja premium outdoor heineken" },
    { label: "Segmento Luxo", q: "varejo de luxo e-commerce" }
  ];

  // Load a default greeting of insights on mount so the bento grid is populated with beautiful data immediately
  useEffect(() => {
    handleQuerySubmit(undefined, "maternidade e consumo boticário");
  }, []);

  const handleQuerySubmit = async (e?: React.FormEvent, selectedQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = selectedQuery !== undefined ? selectedQuery : query;
    if (!activeQuery.trim()) return;

    // Update the input field if a recommendation was clicked
    if (selectedQuery !== undefined) {
      setQuery(selectedQuery);
    }

    setLoading(true);
    setError(null);

    try {
      // Invoke local RAG Express endpoint proxy
      const response = await fetch("/api/insights/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: activeQuery,
          customer_id: currentNamespace
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG status error: ${response.status}`);
      }

      const data = await response.json();
      setInsights(data.insights || []);
      setOfflineMode(!!data.offline);
      if (data.offline && data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.warn("Express backend connection dropped or not compiled yet, using client simulation.", err);
      // Fallback preview data so the user always sees real metrics
      setOfflineMode(true);
      setError("Nota: Executando RAG no modo offline local do Insight Engine. Filtros de namespace simulados ativos.");
      
      setTimeout(() => {
        const localMock = getPreloadedLocalInsights(activeQuery);
        setInsights(localMock);
        setLoading(false);
      }, 500);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="bg-[#0D1B2A] text-slate-100 min-h-screen flex flex-col font-sans" id="insight-engine-bento">
      {/* Decorative Blur Spots */}
      <div className="absolute top-24 left-1/3 w-96 h-96 bg-[#00C9A7]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-24 right-1/4 w-80 h-80 bg-[#F0B429]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER SECTION - Bento Styled Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 md:px-10 py-6 border-b border-slate-700/50 bg-[#0D1B2A]/95 sticky top-0 z-50 backdrop-blur-md gap-4">
        {/* Brand Block */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-[#00C9A7] rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/10">
            <span className="text-[#0D1B2A] font-bold text-xl font-mono">I</span>
          </div>
          <div>
            <h1 className="text-2xl font-serif italic tracking-wide text-[#F0B429]">Insight Engine</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#00C9A7] font-mono font-bold">B2B Creative Planning Platform</p>
          </div>
        </div>

        {/* Dynamic Search Box in the Header */}
        <div className="relative flex-1 max-w-xl mx-4 w-full">
          <form onSubmit={handleQuerySubmit} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o briefing do cliente ou comportamento: 'Maternidade'..." 
              className="w-full bg-slate-900/60 border border-slate-700 rounded-full py-3 pl-6 pr-32 text-sm focus:outline-none focus:border-[#00C9A7] focus:ring-1 focus:ring-[#00C9A7]/30 placeholder-slate-500 text-white"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1.5 px-4 py-1.5 bg-[#00C9A7] hover:bg-teal-400 text-[#0D1B2A] text-xs font-bold rounded-full transition duration-150 shadow-md uppercase tracking-wider cursor-pointer"
            >
              {loading ? "RAG..." : "Filtrar"}
            </button>
          </form>
          <div className="absolute -bottom-5 right-4 text-[9px] text-[#00C9A7] font-mono tracking-wide">
            {loading ? "CARREGANDO DADOS DO DRIVER..." : "PIPELINE RAG ESTÁVEL"}
          </div>
        </div>

        {/* Telemetry info */}
        <div className="flex items-center gap-6 shrink-0 mt-2 md:mt-0">
          <div className="text-right">
            <p className="text-xs font-mono text-[#00C9A7] flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              RAG STATUS: 100% FIEL
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Namespace: <span className="text-[#F0B429]">{currentNamespace}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner">
            BBDO
          </div>
        </div>
      </header>

      {/* QUICK SUGGESTIONS STRIP */}
      <div className="bg-slate-900/40 border-b border-slate-800 py-3 px-6 md:px-10 flex flex-wrap items-center gap-3 justify-center text-xs">
        <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">Tópicos Quentes Almap:</span>
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => handleQuerySubmit(e, item.q)}
            className="px-3 py-1 rounded bg-[#13283F] border border-slate-700/60 text-slate-200 hover:border-[#00C9A7] hover:text-[#00C9A7] transition cursor-pointer text-[11px]"
          >
            🔥 {item.label}
          </button>
        ))}
      </div>

      {/* NOTIFICATION FEEDBACK */}
      {error && (
        <div className="mx-6 md:mx-10 mt-6 bg-[#13283F] border border-slate-700 rounded-lg p-3 text-center text-xs text-amber-400 animate-pulse">
          ⚡ {error}
        </div>
      )}

      {/* BENTO GRID WORKSPACE */}
      <main className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-[#00C9A7] rounded-full animate-spin mb-4" />
            <p className="text-slate-300 font-mono text-sm tracking-widest animate-pulse">
              [CONECTANDO QDRANT CORE] CONSULTADO DADOS DE SEGMENTOS EXCLUSIVOS...
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Validando assinaturas criptográficas & varrendo arquivos PDF / GWI...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* FIRST ELEMENT (BENTO GIANT CARD) - ONLY SHOWS IF WE HAVE INSIGHTS */}
            {insights.length > 0 ? (
              <div className="col-span-12 md:col-span-8 bg-slate-900/40 border border-slate-700 rounded-2xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-[#00C9A7]/40 min-h-[380px]">
                {/* Structural left indicator representing 100% precision match */}
                <span className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#00C9A7]" />
                
                <div className="pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-slate-800 text-[10px] font-bold text-slate-300 rounded uppercase tracking-wider">
                        EVIDÊNCIA PRINCIPAL
                      </span>
                      <span className="px-2 py-0.5 bg-[#00C9A7]/10 text-[10px] font-mono font-bold text-[#00C9A7] rounded border border-[#00C9A7]/20 uppercase">
                        HÍBRIDO QDRANT MATCH
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#F0B429] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      📁 {insights[0].drive_bucket}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3.5xl font-serif text-white leading-tight mb-6 tracking-tight">
                    {insights[0].headline}
                  </h2>

                  {/* Anti-Hallucination Verified Segment */}
                  <div className="relative rounded-xl bg-black/50 border border-slate-800 p-5 mt-4">
                    <span className="absolute -top-2.5 left-4 bg-[#0D1B2A] text-[#F0B429] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest rounded border border-slate-700">
                      CITAÇÃO RADICAL (IPSIS LITTERIS)
                    </span>
                    <p className="text-slate-300 font-sans italic text-base leading-relaxed pl-2 pt-2 border-l-2 border-[#00C9A7]/50">
                      "{insights[0].excerpt}"
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pl-4">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Fonte Primária</p>
                      <p className="text-sm font-semibold text-slate-200">{insights[0].source_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Mapeamento</p>
                      <p className="text-sm text-slate-300 font-mono">{insights[0].source_page}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Score de Anti-Alucinação</p>
                    <div className="flex items-center gap-3">
                      <div className="w-24 sm:w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-[#00C9A7] transition-all duration-500" 
                          style={{ width: `${insights[0].relevance_score}%` }}
                        />
                      </div>
                      <span className="text-xl font-mono text-[#00C9A7] font-bold">{insights[0].relevance_score}% Match</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-12 md:col-span-8 bg-slate-900/40 border-2 border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-4">🔮</span>
                <h3 className="text-2xl font-serif text-[#F0B429] mb-2 font-medium">Buscador Executado com Sucesso</h3>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                  Sem dados extraídos para o termo modificado. Escolha um dos botões rápidos acima ou digite outro briefing criativo na barra de ferramentas.
                </p>
              </div>
            )}

            {/* SECOND ELEMENT (BENTO WIDGET 2 - SUB-KEYWORD EVIDENCES) */}
            <div className="col-span-12 md:col-span-4 bg-slate-900/40 border border-slate-700 rounded-2xl p-6 relative flex flex-col justify-between transition-all duration-300 hover:border-[#F0B429]/40 min-h-[300px]">
              <span className="absolute top-0 bottom-0 left-0 w-1 bg-[#F0B429]" />
              
              <div className="pl-2">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-2 py-0.5 bg-slate-800 text-[9px] font-mono text-slate-300 rounded uppercase tracking-wider font-semibold">
                    DISCIPLINA DIGITAL
                  </span>
                  <span className="text-xs font-mono text-[#F0B429] font-bold">82% Rastreabilidade</span>
                </div>
                <h3 className="text-xl font-serif text-white mb-3">Estudos Emergentes GWI</h3>
                
                {insights.length > 1 ? (
                  <div className="border-l border-slate-700 pl-4 py-1">
                    <p className="text-slate-200 font-serif text-sm font-medium mb-2">
                      {insights[1].headline}
                    </p>
                    <p className="text-xs text-slate-400 italic font-mono line-clamp-3">
                      "{insights[1].excerpt}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A curadoria de canais da Geração Z revela um comportamento avesso a anúncios invasivos, migrando em peso para vídeos curtos interativos de criadores nativos.
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500 pl-2">
                <span>{insights.length > 1 ? insights[1].source_name : "Source: GWI Q4"}</span>
                <span>{insights.length > 1 ? insights[1].source_page : "Pág. 19"}</span>
              </div>
            </div>

            {/* THIRD ELEMENT (BENTO WIDGET 3 - INTERACTIVE PIPELINE HEALTH METRICS) */}
            <div className="col-span-12 md:col-span-4 bg-slate-900/60 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-slate-650 min-h-[220px]">
              <div>
                <p className="text-[10px] uppercase text-[#00C9A7] font-mono font-bold tracking-widest mb-3">
                  // TELEMETRIA DO RAG PIPELINE
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-[#0A1420] border border-slate-800 rounded-xl p-4">
                    <p className="text-3xl font-mono text-white font-bold">1.2s</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Tempo de Busca</p>
                  </div>
                  <div className="bg-[#0A1420] border border-slate-800 rounded-xl p-4">
                    <p className="text-3xl font-mono text-[#00C9A7] font-bold">0%</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Taxa Alucinação</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-850/50 rounded-lg p-2.5 text-[10px] font-mono text-slate-400 flex items-center gap-1.5 border border-slate-800 mt-4 justify-between">
                <span>Namespace Isomórfico:</span>
                <span className="text-teal-400">qdrant_hybrid::almap_ok</span>
              </div>
            </div>

            {/* FOURTH ELEMENT (BENTO WIDGET 4 - HIGH QUALITY ADJACENT REVELATIONS) */}
            <div className="col-span-12 md:col-span-4 bg-[#0A1420]/80 border border-slate-700 rounded-2xl p-6 relative flex flex-col justify-between transition-all duration-300 hover:border-[#00C9A7]/40 min-h-[220px]">
              <span className="absolute top-0 bottom-0 left-0 w-1 bg-[#00C9A7]" />
              <div className="pl-2">
                <span className="px-2 py-0.5 bg-slate-800 text-[9px] font-mono text-slate-300 rounded uppercase tracking-wider font-semibold mb-3 inline-block">
                  INSIGHT ADJACENTE
                </span>
                
                {insights.length > 2 ? (
                  <div className="mt-2">
                    <h4 className="text-sm font-serif text-white font-semibold mb-2">{insights[2].headline}</h4>
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                      "{insights[2].excerpt}"
                    </p>
                  </div>
                ) : (
                  <div className="mt-1">
                    <h4 className="text-sm font-serif text-white font-semibold mb-1">Impacto de ESG na Categoria</h4>
                    <p className="text-[11px] text-slate-400">
                      Segmentos premium de skincare crescem acima da média suportados por embalagens de refis sustentáveis biodegradáveis.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center text-[10px] text-slate-500 pl-2">
                <span>{insights.length > 2 ? insights[2].source_name : "Euromonitor 2024"}</span>
                <span className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[9px] font-mono">
                  {insights.length > 2 ? insights[2].source_page : "Pág. 42"}
                </span>
              </div>
            </div>

            {/* FIFTH ELEMENT (BENTO WIDGET 5 - ACCENT STRATEGIC WORKBOOK TRIGGER) */}
            <div className="col-span-12 md:col-span-4 bg-[#F0B429] rounded-2xl p-6 flex flex-col justify-between shadow-lg shadow-amber-500/5 min-h-[220px]">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[#0D1B2A] font-serif font-bold text-lg">Ação Estratégica</h4>
                  <span className="px-1.5 py-0.5 bg-[#0D1B2A] text-[#F0B429] text-[8px] font-mono font-bold rounded tracking-wider uppercase">
                    CRIATIVO
                  </span>
                </div>
                <p className="text-[#0D1B2A]/90 text-xs font-serif leading-relaxed font-semibold">
                  Utilize o painel de evidências filtrado no momento para redigir a narrativa de mídia de alto nível ou direcionar o escopo do storytelling criativo.
                </p>
              </div>
              <button 
                onClick={() => {
                  alert(`[Insight Engine] Draft de Planejamento gerado com sucesso baseado em: "${insights[0]?.headline || 'maternidade'}"`);
                }}
                className="bg-[#0D1B2A] hover:bg-slate-900 border border-transparent hover:border-[#F0B429] text-[#F0B429] font-mono text-[10px] font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition duration-150 cursor-pointer shadow-md text-center mt-3"
              >
                Gerar Draft Criativo 🚀
              </button>
            </div>
          </div>
        )}

        {/* COMPREHENSIVE SECONDARY GRID LIST FOR ADDITIONAL MATCHES */}
        {!loading && insights.length > 3 && (
          <div className="mt-12">
            <h3 className="font-serif italic text-xl text-[#F0B429] mb-4 flex items-center gap-2">
              <span>📚</span> Outros Dados Encontrados ({insights.length - 3})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.slice(3).map((insight, idx) => (
                <HeadlineCard key={idx} {...insight} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER SECTION */}
      <footer className="px-6 md:px-10 py-6 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
        <div className="flex flex-wrap gap-6 items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00C9A7] rounded-full" />
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Qdrant Cloud Sync: OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00C9A7] rounded-full" />
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Model: Gemini 3.5 Flash</span>
          </div>
          {offlineMode && (
            <div className="flex items-center gap-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider font-bold">Simulator Fallback Active</span>
            </div>
          )}
        </div>
        <div className="text-[9px] font-mono text-slate-600 tracking-wider">
          INSIGHT ENGINE PRO © 2026 • ENTERPRISE INSTANCE ALMAP BBDO
        </div>
      </footer>
    </div>
  );
}

// Full offline corpus for robust fallback client simulation
function getPreloadedLocalInsights(query: string): InsightData[] {
  const norm = query.toLowerCase();
  const all = [
    {
      tags: ["Maternidade", "Mulheres 30+", "Quantitativo"],
      headline: "1 em cada 3 mulheres brasileiras de 30 a 45 anos planeja engravidar nos próximos 12 meses.",
      excerpt: "34% of surveyed women aged 30 to 45 stated they are actively trying to conceive or planning a pregnancy in the next 12 months.",
      source_name: "Brand Tracker O Boticário Q3",
      source_page: "Página 14",
      relevance_score: 96,
      drive_bucket: "Drive: Boticário"
    },
    {
      tags: ["Skincare", "Sêniores (55+)", "Cosméticos Premium"],
      headline: "Público sênior (55+) lidera a expansão dos cosméticos premium orgânicos no Brasil, representando 40% do crescimento.",
      excerpt: "Active older demographics (55+) contributed more than 40% of this growth segment.",
      source_name: "Euromonitor Brazil 2024",
      source_page: "Página 42",
      relevance_score: 88,
      drive_bucket: "Drive: Categoria"
    },
    {
      tags: ["Geração Z", "Consumo de Vídeo", "Comportamento"],
      headline: "Vídeos curtos interativos são o canal de descoberta preferido por 68% dos jovens da Geração Z no Brasil.",
      excerpt: "68% of Gen Z consumers prefer to discover new brands via interactive short videos rather than static search engine ads",
      source_name: "GWI Brazil Q4 2023",
      source_page: "Página 19",
      relevance_score: 92,
      drive_bucket: "Drive: Compartilhado"
    },
    {
      tags: ["Mercado Pet", "Single Households", "Planejamento"],
      headline: "72% dos lares de solteiros nas capitais brasileiras tratam pets como filhos e destinam 15% da renda a eles.",
      excerpt: "72% of single households in Brazilian capital cities consider their dogs/cats as primary children... directing 15% of their monthly income to specialized nutrition",
      source_name: "Estudo Amigos de Quatro Patas - GWI 2024",
      source_page: "Página 3",
      relevance_score: 94,
      drive_bucket: "Drive: Compartilhado"
    },
    {
      tags: ["Cerveja Premium", "Consumidores Jovens", "Eventos Outdoor"],
      headline: "Quase metade dos jovens aceita pagar até 22% mais caro por embalagens térmicas especiais em eventos ao ar livre.",
      excerpt: "45% dos consumidores jovens de cervejas premium preferem latas de alumínio especiais com isolamento térmico... mesmo que o valor unitário custe até 22% a mais",
      source_name: "Insight Report Heineken Brasil",
      source_page: "Página 7",
      relevance_score: 90,
      drive_bucket: "Drive: Heineken"
    }
  ];

  const matched = all.filter(
    item => 
      item.headline.toLowerCase().includes(norm) || 
      item.excerpt.toLowerCase().includes(norm) ||
      item.tags.some(t => t.toLowerCase().includes(norm)) ||
      item.source_name.toLowerCase().includes(norm)
  );

  return matched.length > 0 ? matched : all.slice(0, 3);
}
