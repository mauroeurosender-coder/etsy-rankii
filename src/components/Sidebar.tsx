import type { LucideIcon } from 'lucide-react';
import { BarChart3, GitCompareArrows, ListChecks, Search, Sparkles, Star, Store, TrendingUp } from 'lucide-react';
import type { Page } from '../types';

interface NavItem {
  page: Page;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'explorer', label: 'Keyword Explorer', icon: Search },
  { page: 'listing-auditor', label: 'Listing Auditor', icon: ListChecks },
  { page: 'compare', label: 'Compare Keywords', icon: GitCompareArrows },
  { page: 'rank-tracker', label: 'Rank Tracker', icon: TrendingUp },
  { page: 'shop-teardown', label: 'Shop Teardown', icon: Store },
];

const SOON_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: 'Trend Buzz', icon: BarChart3 },
  { label: 'Favorites', icon: Star },
];

interface SidebarProps {
  activePage: Page;
  onSelectPage: (page: Page) => void;
}

export function Sidebar({ activePage, onSelectPage }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">EtsyRanker AI</p>
          <p className="text-[11px] text-slate-500">Evidence-based SEO</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
          const isActive = page === activePage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onSelectPage(page)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                isActive ? 'bg-orange-500/10 text-orange-400' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}

        <div className="my-2 border-t border-slate-800" />

        {SOON_ITEMS.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
          >
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Soon
            </span>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-[11px] leading-relaxed text-slate-500">
        Grounded in live Etsy search results via the Gemini API.
      </div>
    </aside>
  );
}
