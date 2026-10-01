import { Info, Store } from 'lucide-react';
import type { MarketLeader } from '../types';
import { estimateSales, estimateViews } from '../lib/salesEstimate';

const BADGE_STYLES: Record<string, string> = {
  'Star Seller': 'bg-purple-100 text-purple-700',
  "Etsy's Pick": 'bg-orange-100 text-orange-700',
  Bestseller: 'bg-amber-100 text-amber-700',
  Trending: 'bg-pink-100 text-pink-700',
};

function BadgePills({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {badges.map((badge, i) => (
        <span
          key={i}
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_STYLES[badge] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

export function CompetitorTable({ leaders }: { leaders: MarketLeader[] }) {
  const hasAnyEstimate = leaders.some((l) => l.reportedSales !== null || l.reviewCount !== null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
          <Store className="h-4 w-4 text-slate-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Top Competitor Listings</h2>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="w-8 py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-4 font-semibold">Listing</th>
              <th className="py-2 pr-4 font-semibold">Price</th>
              <th className="py-2 pr-4 font-semibold">Sales</th>
              <th className="py-2 pr-4 font-semibold">Est. Views</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader, i) => {
              const sales = estimateSales(leader.reportedSales, leader.reviewCount);
              const views = estimateViews(sales.value);

              return (
                <tr key={i} className="border-b border-slate-100 align-top last:border-0 even:bg-slate-50/60">
                  <td className="py-2.5 pr-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium leading-snug text-slate-800">{leader.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {leader.shopName} <span className="text-slate-300">·</span>{' '}
                      <span className="italic text-slate-400">{leader.signal}</span>
                    </p>
                    <BadgePills badges={leader.badges} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-sm font-semibold tabular-nums text-emerald-600">
                    ${leader.price.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-700">
                    {sales.value === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <>
                        {formatCount(sales.value)}
                        <span className="ml-1 font-sans text-[10px] font-normal text-slate-400">
                          {sales.source === 'reported' ? 'reported' : 'est.'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-700">
                    {views === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <>
                        ~{formatCount(views)}
                        <span className="ml-1 font-sans text-[10px] font-normal text-slate-400">modeled</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {leaders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No competitor listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasAnyEstimate && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          "Reported" sales come from Etsy's own disclosed count on the listing. "Est." sales are modeled from review
          count (~10x, an industry rule of thumb, not an Etsy figure). Views are always modeled from the sales figure
          at an assumed ~2.5% conversion rate — Etsy never discloses views for a competitor's listing, so treat these
          directionally, not as exact numbers.
        </p>
      )}
    </div>
  );
}
