import type { ReactNode } from 'react';
import { Search, Swords, TrendingUp } from 'lucide-react';
import type { KeywordAnalysis } from '../types';
import { scoreTone } from '../lib/score';
import { ScoreGauge } from './ScoreGauge';

function peakMonth(trendData: KeywordAnalysis['trendData']): string {
  if (trendData.length === 0) return 'N/A';
  const peak = trendData.reduce((max, p) => (p.volume > max.volume ? p : max), trendData[0]);
  return `Peaks in ${peak.month}`;
}

function StatRow({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col justify-center p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export function MetricCards({ analysis }: { analysis: KeywordAnalysis }) {
  const tone = scoreTone(analysis.score);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-[220px_1fr] md:divide-x md:divide-y-0">
        <div className="flex items-center gap-4 p-5">
          <ScoreGauge score={analysis.score} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Opportunity Score</p>
            <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone.bg} ${tone.text}`}>
              {tone.verdict}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatRow
            icon={<Search className="h-3.5 w-3.5" />}
            label="Search Volume"
            value={analysis.searchVolumeLabel}
            sub="Derived from listing 'bought' signals"
          />
          <StatRow
            icon={<Swords className="h-3.5 w-3.5" />}
            label="Competition"
            value={analysis.competitionLabel}
            sub="Based on top-listing density"
          />
          <StatRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Seasonality"
            value={peakMonth(analysis.trendData)}
            sub="12-month relative demand curve"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{analysis.summary}</div>
    </div>
  );
}
