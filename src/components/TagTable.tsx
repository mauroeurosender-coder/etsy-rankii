import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Tag as TagIcon } from 'lucide-react';
import type { CompetitionLevel, TagSuggestion } from '../types';

type SortKey = 'keyword' | 'volume' | 'competition';

const COMPETITION_RANK: Record<CompetitionLevel, number> = { Low: 0, Medium: 1, High: 2 };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'volume', label: 'Est. Volume' },
  { key: 'competition', label: 'Competition' },
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

export function TagTable({ tags }: { tags: TagSuggestion[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const arr = [...tags];
    arr.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'keyword') cmp = a.keyword.localeCompare(b.keyword);
      else if (sortKey === 'competition') cmp = COMPETITION_RANK[a.competition] - COMPETITION_RANK[b.competition];
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [tags, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <TagIcon className="h-4 w-4 text-slate-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Recommended Etsy Tags</h2>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        12 candidates for the listing's 13 tag slots (max 20 characters each) — click a column to sort
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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
            {sorted.map((tag) => (
              <tr key={tag.keyword} className="border-b border-slate-100 last:border-0 even:bg-slate-50/60 hover:bg-orange-50/40">
                <td className="py-2.5 pr-4 font-medium text-slate-800">
                  {tag.keyword}
                  <span className={`ml-2 font-mono text-xs ${tag.keyword.length > 20 ? 'text-red-500' : 'text-slate-400'}`}>
                    {tag.keyword.length}/20
                  </span>
                </td>
                <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-600">{tag.volume.toLocaleString()}</td>
                <td className="py-2.5 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${competitionBadge(tag.competition)}`}>
                    {tag.competition}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No tag suggestions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
