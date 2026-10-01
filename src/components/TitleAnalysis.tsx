import { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { KeywordAnalysis } from '../types';
import { CompetitorTable } from './CompetitorTable';

function TitleRow({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing to fall back to.
    }
  };

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-orange-100 bg-orange-50/60 p-3 text-sm leading-snug text-slate-800">
      <span>{title}</span>
      <button
        onClick={handleCopy}
        aria-label="Copy title"
        className="shrink-0 rounded-md p-1 text-orange-500 transition hover:bg-orange-100"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </li>
  );
}

export function TitleAnalysis({ analysis }: { analysis: KeywordAnalysis }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">AI Recommended Titles</h2>
        </div>
        <ul className="mt-4 space-y-2.5">
          {analysis.generatedTitles.map((title, i) => (
            <TitleRow key={i} title={title} />
          ))}
          {analysis.generatedTitles.length === 0 && (
            <li className="text-sm text-slate-400">No titles generated.</li>
          )}
        </ul>
      </div>

      <CompetitorTable leaders={analysis.marketLeaders} />
    </div>
  );
}
