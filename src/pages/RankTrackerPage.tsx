import { useMemo, useState } from 'react';
import { ArrowRight, Minus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Sparkline } from '../components/Sparkline';
import { clearHistory, getHistory, groupByKeyword, removeKeywordHistory } from '../lib/history';
import { scoreTone } from '../lib/score';

function timeAgo(timestamp: number): string {
  const diffMin = Math.round((Date.now() - timestamp) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export function RankTrackerPage({ onRecheck }: { onRecheck: (keyword: string) => void }) {
  const [snapshots, setSnapshots] = useState(() => getHistory());

  const groups = useMemo(() => {
    const grouped = groupByKeyword(snapshots);
    return [...grouped.entries()]
      .map(([key, entries]) => ({ key, keyword: entries[entries.length - 1].keyword, entries }))
      .sort((a, b) => b.entries[b.entries.length - 1].timestamp - a.entries[a.entries.length - 1].timestamp);
  }, [snapshots]);

  const handleRemove = (keyword: string) => {
    removeKeywordHistory(keyword);
    setSnapshots(getHistory());
  };

  const handleClearAll = () => {
    clearHistory();
    setSnapshots([]);
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Rank Tracker</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Every Keyword Explorer search is logged here automatically, so you can watch a keyword's opportunity
              score change over time.
            </p>
          </div>
          {groups.length > 0 && (
            <button
              onClick={handleClearAll}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-600"
            >
              Clear all history
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        {groups.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <TrendingUp className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800">No tracked keywords yet</h2>
            <p className="text-sm text-slate-500">
              Run a search in Keyword Explorer to start tracking its opportunity score over time — every search you
              run there gets logged here automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map(({ key, keyword, entries }) => {
              const latest = entries[entries.length - 1];
              const previous = entries.length > 1 ? entries[entries.length - 2] : null;
              const delta = previous ? latest.score - previous.score : null;
              const tone = scoreTone(latest.score);

              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-[160px] flex-1">
                    <p className="font-semibold text-slate-800">{keyword}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {entries.length} check{entries.length === 1 ? '' : 's'} · last {timeAgo(latest.timestamp)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-xl font-bold ${tone.text}`}>{Math.round(latest.score)}</span>
                    <span className="text-xs text-slate-400">/100</span>
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-semibold ${
                          delta > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {delta > 0 ? '+' : ''}
                        {Math.round(delta)}
                      </span>
                    )}
                    {delta === 0 && <Minus className="h-3 w-3 text-slate-300" />}
                  </div>

                  <Sparkline values={entries.map((e) => e.score)} />

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => onRecheck(keyword)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                    >
                      Re-check <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleRemove(keyword)}
                      aria-label={`Remove ${keyword} from tracking`}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
