import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Star } from 'lucide-react';
import type { CompetitionLevel, RelatedKeyword } from '../types';

type SortKey = 'keyword' | 'volume' | 'competition' | 'cpc' | 'ctr';

const COMPETITION_RANK: Record<CompetitionLevel, number> = { Low: 0, Medium: 1, High: 2 };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'volume', label: 'Est. Volume' },
  { key: 'competition', label: 'Competition' },
  { key: 'cpc', label: 'Est. CPC' },
  { key: 'ctr', label: 'Est. CTR' },
];

function competitionBadge(level: CompetitionLevel): string {
  switch (level) {
    case 'Low':
      return 'bg-emerald-100 text-emerald-700';
    case 'Medium':
      return 'bg-orange-100 text-orange-700';
    case 'High':
      return 'bg-red-100 text-red-700';
  }
}

export function KeywordTable({ keywords }: { keywords: RelatedKeyword[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const arr = [...keywords];
    arr.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'keyword') cmp = a.keyword.localeCompare(b.keyword);
      else if (sortKey === 'competition') cmp = COMPETITION_RANK[a.competition] - COMPETITION_RANK[b.competition];
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [keywords, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleFavorite = (keyword: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Long-Tail Keyword Opportunities</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Variants found in real Etsy listing titles &amp; tags — click a column to sort
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="w-8 py-2" />
              {COLUMNS.map((col) => (
                <th key={col.key} className="py-2 pr-4 font-semibold">
                  <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-slate-800">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-300" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((kw) => (
              <tr key={kw.keyword} className="border-b border-slate-100 last:border-0 even:bg-slate-50/60 hover:bg-orange-50/40">
                <td className="py-2.5 pl-1">
                  <button onClick={() => toggleFavorite(kw.keyword)} aria-label={`Favorite ${kw.keyword}`}>
                    <Star className={`h-4 w-4 ${favorites.has(kw.keyword) ? 'fill-orange-400 text-orange-400' : 'text-slate-300'}`} />
                  </button>
                </td>
                <td className="py-2.5 pr-4 font-medium text-slate-800">{kw.keyword}</td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-600">{kw.volume.toLocaleString()}</td>
                <td className="py-2.5 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${competitionBadge(kw.competition)}`}>
                    {kw.competition}
                  </span>
                </td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-600">${kw.cpc.toFixed(2)}</td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-600">{kw.ctr.toFixed(1)}%</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No related keywords found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
