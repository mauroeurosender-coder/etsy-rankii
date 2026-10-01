import { ExternalLink, Link2 } from 'lucide-react';
import type { DataSource } from '../types';

export function DataSourcesSidebar({ sources }: { sources: DataSource[] }) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <Link2 className="h-4 w-4 text-slate-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Etsy Data Sources</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">Grounded citations from etsy.com used in this analysis</p>

      <ul className="mt-4 space-y-2">
        {sources.map((source, i) => (
          <li key={i}>
            <a
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 rounded-lg border border-slate-100 p-2.5 text-xs transition hover:border-orange-200 hover:bg-orange-50"
            >
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-orange-500" />
              <span className="line-clamp-2 text-slate-600 group-hover:text-orange-700">{source.title}</span>
            </a>
          </li>
        ))}
        {sources.length === 0 && (
          <li className="text-xs text-slate-400">No etsy.com sources were grounded for this query.</li>
        )}
      </ul>
    </aside>
  );
}
