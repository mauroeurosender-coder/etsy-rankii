import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ExplorerPage, type ExplorerSeed } from './pages/ExplorerPage';
import { ListingAuditorPage } from './pages/ListingAuditorPage';
import { CompareKeywordsPage } from './pages/CompareKeywordsPage';
import { RankTrackerPage } from './pages/RankTrackerPage';
import { ShopTeardownPage } from './pages/ShopTeardownPage';
import type { Page } from './types';

function App() {
  const [activePage, setActivePage] = useState<Page>('explorer');
  const [explorerSeed, setExplorerSeed] = useState<ExplorerSeed | null>(null);

  const seedExplorer = (keyword: string) => {
    setExplorerSeed({ keyword, nonce: Date.now() });
    setActivePage('explorer');
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage={activePage} onSelectPage={setActivePage} />

      <div className="flex min-w-0 flex-1 flex-col">
        {activePage === 'explorer' && <ExplorerPage seed={explorerSeed} />}
        {activePage === 'listing-auditor' && <ListingAuditorPage />}
        {activePage === 'compare' && <CompareKeywordsPage onViewInExplorer={seedExplorer} />}
        {activePage === 'rank-tracker' && <RankTrackerPage onRecheck={seedExplorer} />}
        {activePage === 'shop-teardown' && <ShopTeardownPage />}
      </div>
    </div>
  );
}

export default App;
