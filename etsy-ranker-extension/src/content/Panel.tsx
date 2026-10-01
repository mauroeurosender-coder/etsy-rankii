import { useEffect, useState } from 'react';
import type { ApiKeyStatusResponse, QuickResearch, ResearchResponse, ScrapedListing } from '../lib/types';
import { estimateSales, estimateViews } from '../lib/salesEstimate';

type ResearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: QuickResearch };

type Tab = 'sales' | 'listing';

function formatMoney(value: number | null, currency: string | null): string | null {
  if (value === null) return null;
  return `${currency ?? ''} ${value.toFixed(2)}`.trim();
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function CopyTagsBox({ tags }: { tags: string[] }) {
  const [copied, setCopied] = useState(false);
  const joined = tags.join(', ');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing to fall back to.
    }
  };

  return (
    <div className="section">
      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Listing Keywords (copy all)</span>
        <button className="link-btn" onClick={handleCopy} disabled={tags.length === 0}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="tag-copy-box">{joined || 'Run "Research this keyword" first.'}</p>
    </div>
  );
}

export function Panel({ listing }: { listing: ScrapedListing }) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('sales');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [research, setResearch] = useState<ResearchState>({ status: 'idle' });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_API_KEY_STATUS' }, (res: ApiKeyStatusResponse) => {
      setHasApiKey(res?.hasKey ?? false);
    });
  }, []);

  const runResearch = () => {
    setResearch({ status: 'loading' });
    chrome.runtime.sendMessage({ type: 'RUN_RESEARCH', keyword: listing.title }, (res: ResearchResponse) => {
      if (res.ok) setResearch({ status: 'ready', data: res.data });
      else setResearch({ status: 'error', message: res.error });
    });
  };

  const price = formatMoney(listing.price, listing.currency);
  const originalPrice = formatMoney(listing.originalPrice, listing.currency);
  const sales = estimateSales(listing.recentSales, listing.itemReviewCount);
  const views = estimateViews(sales.value);
  const mostRecentReview = formatDate(listing.mostRecentReviewDate);

  return (
    <div className={`wrap ${collapsed ? 'collapsed' : ''}`}>
      <div className="header" onClick={() => setCollapsed((c) => !c)}>
        <span className="dot" />
        <span className="title">EtsyRanker AI</span>
        <span className="chevron">{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <>
          <div className="tabs">
            <button className={`tab-btn ${tab === 'sales' ? 'active' : ''}`} onClick={() => setTab('sales')}>
              Sales Info
            </button>
            <button className={`tab-btn ${tab === 'listing' ? 'active' : ''}`} onClick={() => setTab('listing')}>
              Listing Info
            </button>
          </div>

          <div className="body">
            {tab === 'sales' && (
              <>
                <div className="section">
                  <div className="section-label">Listing</div>
                  <p className="listing-title">{listing.title}</p>
                  <div className="fact-row">
                    <span className="fact-label">Reviews (this item)</span>
                    <span className="fact-value">
                      {listing.itemReviewCount === null
                        ? '—'
                        : `${listing.itemRating ?? ''} (${listing.itemReviewCount.toLocaleString()})`}
                    </span>
                  </div>
                  {listing.itemReviewCount === null && (
                    <p className="caveat">
                      This exact listing has no reviews of its own yet — Etsy only shows the shop's overall rating
                      (see Listing Info tab), which isn't specific enough to use here.
                    </p>
                  )}
                  {mostRecentReview && (
                    <div className="fact-row">
                      <span className="fact-label">Most recent review</span>
                      <span className="fact-value">{mostRecentReview}</span>
                    </div>
                  )}
                  {!mostRecentReview && (
                    <p className="caveat">
                      Etsy doesn't publicly show a listing's creation date, so this uses the most recent review
                      instead — none found here.
                    </p>
                  )}
                </div>

                <div className="section">
                  <div className="section-label">Estimated Performance</div>
                  <div className="fact-row">
                    <span className="fact-label">Est. Sales</span>
                    <span className="fact-value">
                      {sales.value === null
                        ? '—'
                        : `${formatCount(sales.value)}${sales.period ? ` / ${sales.period === 'day' ? '24h' : 'mo'}` : ''}`}
                    </span>
                  </div>
                  <p className="caveat">
                    {sales.source === 'reported' &&
                      `Etsy's own "bought in the last ${sales.period === 'day' ? '24 hours' : 'month'}" badge on this exact listing — a real figure, not modeled.`}
                    {sales.source === 'estimated_from_item_reviews' &&
                      "Modeled from this listing's own review count (~10x, an industry rule of thumb) — specific to this item, not the shop."}
                    {sales.source === 'unavailable' &&
                      "No review count or recent-activity badge specific to this item was found — Etsy's shop-wide rating isn't used here since it isn't about this listing."}
                  </p>

                  <div className="fact-row">
                    <span className="fact-label">Est. Views</span>
                    <span className="fact-value">{views === null ? '—' : `~${formatCount(views)}`}</span>
                  </div>
                  <p className="caveat">
                    Always modeled (assumed ~2.5% conversion) — Etsy never discloses views for any listing.
                  </p>
                </div>

                <div className="section">
                  <div className="section-label">AI Keyword Research</div>
                  {hasApiKey === false && (
                    <p className="caveat">
                      No Gemini API key set.{' '}
                      <button className="link-btn" onClick={() => chrome.runtime.openOptionsPage()}>
                        Add one in Settings
                      </button>
                    </p>
                  )}

                  {research.status === 'idle' && (
                    <button className="primary" onClick={runResearch} disabled={hasApiKey === false}>
                      Research this keyword
                    </button>
                  )}

                  {research.status === 'loading' && (
                    <button className="primary" disabled>
                      <span className="spinner" /> Researching...
                    </button>
                  )}

                  {research.status === 'error' && (
                    <>
                      <div className="error-box">{research.message}</div>
                      <div style={{ marginTop: 8 }}>
                        <button className="primary" onClick={runResearch}>
                          Try again
                        </button>
                      </div>
                    </>
                  )}

                  {research.status === 'ready' && (
                    <div>
                      <div className="score-row">
                        <span className="score-value">{Math.round(research.data.score)}</span>
                        <span className="score-max">/100 opportunity</span>
                      </div>
                      <div className="fact-row">
                        <span className="fact-label">Search Volume</span>
                        <span className="fact-value">{research.data.searchVolumeLabel}</span>
                      </div>
                      <div className="fact-row">
                        <span className="fact-label">Competition</span>
                        <span className="fact-value">{research.data.competitionLabel}</span>
                      </div>
                      <p className="caveat">{research.data.summary}</p>

                      {research.data.relatedKeywords.length > 0 && (
                        <>
                          <div className="section-label" style={{ marginTop: 10 }}>
                            Keywords &amp; Est. Search Volume
                          </div>
                          {research.data.relatedKeywords.map((k, i) => (
                            <div key={i} className="kw-row">
                              <span className="kw-name">{k.keyword}</span>
                              <span className="kw-meta">
                                {k.volume.toLocaleString()} · {k.competition}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {research.data.sources.length > 0 && (
                        <p className="caveat" style={{ marginTop: 8 }}>
                          Grounded in {research.data.sources.length} etsy.com search result
                          {research.data.sources.length === 1 ? '' : 's'}.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <CopyTagsBox
                  tags={research.status === 'ready' ? research.data.tagSuggestions.map((t) => t.keyword) : []}
                />
              </>
            )}

            {tab === 'listing' && (
              <div className="section">
                <div className="section-label">This Listing (real, from the page)</div>
                {price && (
                  <div>
                    <span className="price">{price}</span>
                    {originalPrice && <span className="sale-price">{originalPrice}</span>}
                  </div>
                )}
                <div className="fact-row">
                  <span className="fact-label">Shop</span>
                  <span className="fact-value">{listing.shopName ?? '—'}</span>
                </div>
                <div className="fact-row">
                  <span className="fact-label">Category</span>
                  <span className="fact-value">{listing.category ?? '—'}</span>
                </div>
                {listing.material && (
                  <div className="fact-row">
                    <span className="fact-label">Material</span>
                    <span className="fact-value">{listing.material}</span>
                  </div>
                )}
                {listing.itemReviewCount !== null && (
                  <div className="fact-row">
                    <span className="fact-label">Reviews (this item)</span>
                    <span className="fact-value">
                      {listing.itemRating ?? ''} ({listing.itemReviewCount.toLocaleString()})
                    </span>
                  </div>
                )}
                <div className="fact-row">
                  <span className="fact-label">Shop rating</span>
                  <span className="fact-value">
                    {listing.shopRating ?? '—'}{' '}
                    {listing.shopReviewCount !== null && `(${listing.shopReviewCount.toLocaleString()})`}
                  </span>
                </div>
                <p className="caveat">
                  {listing.itemReviewCount !== null
                    ? "Shop rating covers the seller's whole catalog — separate from this item's own reviews above."
                    : "This exact listing has no reviews of its own yet, so only the shop-wide rating is shown."}
                </p>

                {listing.badges.length > 0 && (
                  <div className="badges">
                    {listing.badges.map((b, i) => (
                      <span key={i} className="badge">
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  {listing.activitySignal ? (
                    <div className="activity">{listing.activitySignal}</div>
                  ) : (
                    <div className="no-activity">Etsy isn't showing a recent-activity badge on this listing.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
