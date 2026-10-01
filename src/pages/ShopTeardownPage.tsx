import { useState } from 'react';
import { AlertTriangle, Loader2, Store } from 'lucide-react';
import { CompetitorTable } from '../components/CompetitorTable';
import { DataSourcesSidebar } from '../components/DataSourcesSidebar';
import { analyzeShopTeardown } from '../services/geminiService';
import type { ShopTeardown } from '../types';

type ViewState = 'idle' | 'loading' | 'error' | 'ready';

export function ShopTeardownPage() {
  const [shopInput, setShopInput] = useState('');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [teardown, setTeardown] = useState<ShopTeardown | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoading = viewState === 'loading';

  const runTeardown = async () => {
    if (!shopInput.trim() || isLoading) return;
    setViewState('loading');
    setErrorMessage('');
    try {
      setTeardown(await analyzeShopTeardown(shopInput));
      setViewState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setViewState('error');
    }
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <h1 className="text-lg font-bold text-slate-900">Shop Teardown</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Enter a competitor's Etsy shop name (or shop URL) to see their title and keyword patterns.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 lg:max-w-2xl">
          <input
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runTeardown();
              }
            }}
            placeholder="Shop name or etsy.com/shop/... URL"
            disabled={isLoading}
            className="min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
          <button
            onClick={runTeardown}
            disabled={isLoading || !shopInput.trim()}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Shop'
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        {viewState === 'idle' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Store className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Analyze a competitor shop</h2>
            <p className="text-sm text-slate-500">
              Enter a shop name above to see recurring keyword themes and title structure patterns across their
              listings.
            </p>
          </div>
        )}

        {viewState === 'loading' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-orange-100">
              <Store className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Searching for this shop's listings...</h2>
          </div>
        )}

        {viewState === 'error' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-sm font-bold text-red-800">Analysis failed</h2>
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={runTeardown}
              className="mt-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {viewState === 'ready' && teardown && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                    <Store className="h-4 w-4 text-slate-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">{teardown.shopName}</h2>
                </div>
                <p className="mt-2 text-sm text-slate-600">{teardown.summary}</p>
                {teardown.estimatedNiche && (
                  <p className="mt-3 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    Niche: {teardown.estimatedNiche}
                  </p>
                )}
              </div>

              {teardown.commonKeywordThemes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Common Keyword Themes</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {teardown.commonKeywordThemes.map((theme, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {teardown.titlePatternInsights.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Title Pattern Insights</h2>
                  <ul className="mt-3 space-y-2">
                    {teardown.titlePatternInsights.map((insight, i) => (
                      <li key={i} className="rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <CompetitorTable
                leaders={teardown.listings.map((l) => ({
                  title: l.title,
                  shopName: teardown.shopName,
                  price: l.price,
                  signal: l.signal,
                  badges: l.badges,
                  reviewCount: l.reviewCount,
                  reportedSales: l.reportedSales,
                }))}
              />
            </div>

            <DataSourcesSidebar sources={teardown.sources} />
          </div>
        )}
      </main>
    </>
  );
}
