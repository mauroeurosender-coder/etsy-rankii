import { useState } from 'react';
import { AlertTriangle, ArrowRight, GitCompareArrows, Loader2, Trophy, X } from 'lucide-react';
import { analyzeKeyword } from '../services/geminiService';
import { scoreTone } from '../lib/score';
import type { KeywordAnalysis } from '../types';

type ViewState = 'idle' | 'loading' | 'ready';

interface ComparisonRow {
  keyword: string;
  status: 'success' | 'error';
  data?: KeywordAnalysis;
  error?: string;
}

const MAX_KEYWORDS = 5;
const MIN_KEYWORDS = 2;

function peakMonth(trendData: KeywordAnalysis['trendData']): string {
  if (trendData.length === 0) return 'N/A';
  const peak = trendData.reduce((max, p) => (p.volume > max.volume ? p : max), trendData[0]);
  return peak.month;
}

export function CompareKeywordsPage({ onViewInExplorer }: { onViewInExplorer: (keyword: string) => void }) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  const isLoading = viewState === 'loading';

  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || keywords.length >= MAX_KEYWORDS) return;
    if (keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    setKeywords((prev) => [...prev, trimmed]);
    setInputValue('');
  };

  const removeKeyword = (keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const runComparison = async () => {
    if (keywords.length < MIN_KEYWORDS || isLoading) return;
    setViewState('loading');

    const settled = await Promise.allSettled(keywords.map((k) => analyzeKeyword(k)));
    const nextRows: ComparisonRow[] = settled.map((result, i) => {
      if (result.status === 'fulfilled') {
        return { keyword: keywords[i], status: 'success', data: result.value };
      }
      const reason = result.reason;
      return {
        keyword: keywords[i],
        status: 'error',
        error: reason instanceof Error ? reason.message : 'Analysis failed.',
      };
    });

    setRows(nextRows);
    setViewState('ready');
  };

  const bestKeyword = rows
    .filter((r): r is ComparisonRow & { data: KeywordAnalysis } => r.status === 'success' && !!r.data)
    .reduce<string | null>((best, row) => {
      if (!best) return row.keyword;
      const bestScore = rows.find((r) => r.keyword === best)?.data?.score ?? -1;
      return row.data.score > bestScore ? row.keyword : best;
    }, null);

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <h1 className="text-lg font-bold text-slate-900">Compare Keywords</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Score {MIN_KEYWORDS}-{MAX_KEYWORDS} candidate keywords side-by-side before committing to one.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 lg:max-w-2xl">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder={keywords.length >= MAX_KEYWORDS ? `Max ${MAX_KEYWORDS} keywords` : 'Add a keyword and press Enter'}
            disabled={isLoading || keywords.length >= MAX_KEYWORDS}
            className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={isLoading || !inputValue.trim() || keywords.length >= MAX_KEYWORDS}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={runComparison}
            disabled={isLoading || keywords.length < MIN_KEYWORDS}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              'Compare'
            )}
          </button>
        </div>

        {keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  disabled={isLoading}
                  aria-label={`Remove ${kw}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        {viewState === 'idle' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <GitCompareArrows className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Add keywords to compare</h2>
            <p className="text-sm text-slate-500">
              Add at least {MIN_KEYWORDS} candidate keywords above, then run them all at once to see which is the
              strongest opportunity.
            </p>
          </div>
        )}

        {viewState === 'loading' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-orange-100">
              <GitCompareArrows className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Running {keywords.length} analyses in parallel...</h2>
          </div>
        )}

        {viewState === 'ready' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Keyword</th>
                    <th className="py-2 pr-4 font-semibold">Score</th>
                    <th className="py-2 pr-4 font-semibold">Volume</th>
                    <th className="py-2 pr-4 font-semibold">Competition</th>
                    <th className="py-2 pr-4 font-semibold">Peaks</th>
                    <th className="py-2 pr-4 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    if (row.status === 'error') {
                      return (
                        <tr key={row.keyword} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{row.keyword}</td>
                          <td colSpan={3} className="py-2.5 pr-4 text-red-600">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {row.error}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4" />
                          <td className="py-2.5 pr-4 text-right">
                            <button
                              onClick={() => onViewInExplorer(row.keyword)}
                              className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                            >
                              Retry in Explorer <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const data = row.data!;
                    const tone = scoreTone(data.score);
                    const isBest = row.keyword === bestKeyword;

                    return (
                      <tr key={row.keyword} className="border-b border-slate-100 last:border-0 even:bg-slate-50/60">
                        <td className="py-2.5 pr-4 font-medium text-slate-800">
                          <span className="flex items-center gap-1.5">
                            {row.keyword}
                            {isBest && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                <Trophy className="h-3 w-3" />
                                Best pick
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`font-bold ${tone.text}`}>{Math.round(data.score)}</span>
                          <span className="text-slate-400">/100</span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{data.searchVolumeLabel}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{data.competitionLabel}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{peakMonth(data.trendData)}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <button
                            onClick={() => onViewInExplorer(row.keyword)}
                            className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                          >
                            Full analysis <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
