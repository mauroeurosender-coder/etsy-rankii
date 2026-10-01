import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '../types';

export function TrendChart({ trendData }: { trendData: TrendPoint[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Seasonal Demand Trend</h2>
      <p className="mt-0.5 text-xs text-slate-500">Relative search interest across the year (0-100)</p>
      <div className="mt-4 h-64 w-full">
        {trendData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelStyle={{ fontWeight: 600, color: '#0f172a' }}
              />
              <Area type="monotone" dataKey="volume" stroke="#f97316" strokeWidth={2} fill="url(#trendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
