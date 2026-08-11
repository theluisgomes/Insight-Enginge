import React from "react";

export interface HeadlineCardProps {
  tags: string[];
  headline: string;
  excerpt: string;
  source_name: string;
  source_page: string;
  relevance_score: number;
  drive_bucket: string;
}

export default function HeadlineCard({
  tags,
  headline,
  excerpt,
  source_name,
  source_page,
  relevance_score,
  drive_bucket,
}: HeadlineCardProps) {
  const getProgressBarColor = (score: number) => {
    if (score >= 90) return "bg-[#00C9A7]";
    if (score >= 80) return "bg-[#F0B429]";
    return "bg-slate-400";
  };

  const getMetricColor = (score: number) => {
    if (score >= 90) return "text-[#00C9A7] bg-[#00C9A7]/10 border border-[#00C9A7]/20";
    if (score >= 80) return "text-[#F0B429] bg-[#F0B429]/10 border border-[#F0B429]/20";
    return "text-slate-400 bg-slate-400/10 border border-slate-700/20";
  };

  return (
    <div 
      className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-[#0D1B2A]/90 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 group"
      id={`insight-card-${source_name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Structural Lateral Color Bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${getProgressBarColor(relevance_score)}`} />

      <div className="pl-2">
        {/* Header containing Drive Bucket & Relevance Score */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-4">
          <span className="font-mono text-slate-300 font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-[#13283F] border border-slate-700/60">
            📁 {drive_bucket || "Drive: Compartilhado"}
          </span>
          <div className={`flex items-center gap-1.5 font-mono px-2.5 py-0.5 rounded-full ${getMetricColor(relevance_score)}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span className="font-bold text-[10px] uppercase tracking-wide">{relevance_score}% Fiel</span>
          </div>
        </div>

        {/* Dynamic Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-800/80 text-teal-300 border border-slate-700/30"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Elegant Display Title (Serif pairing) */}
        <h3 className="font-serif text-lg md:text-xl font-medium tracking-tight text-white mb-4 leading-snug group-hover:text-teal-300 transition-colors duration-200">
          {headline}
        </h3>

        {/* Verbatim Excerpt Block quoting original report without alteration */}
        <div className="relative rounded-lg bg-black/40 border border-slate-800/80 px-4 py-3 mb-4 text-xs leading-relaxed text-slate-300 group-hover:bg-black/50 transition-colors duration-200">
          <span className="absolute -top-2 left-3 bg-[#0D1B2A] text-[#F0B429] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider rounded border border-slate-800">
            CITAÇÃO FIEL (IPSIS LITTERIS)
          </span>
          <p className="italic font-sans text-slate-300 antialiased pt-2">
            "{excerpt}"
          </p>
        </div>
      </div>

      {/* Footer Meta Details containing document metadata, exact source & pagination */}
      <div className="mt-auto pt-3 pl-2 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7] shrink-0" />
          <span className="font-medium text-slate-200 truncate">{source_name}</span>
        </div>
        <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
          {source_page || "N/A"}
        </span>
      </div>

      {/* Progress Bar of Relevance of dynamic RAG engine */}
      <div className="w-full h-1 bg-slate-900 rounded-full mt-4 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(relevance_score)}`} 
          style={{ width: `${relevance_score}%` }} 
        />
      </div>
    </div>
  );
}
