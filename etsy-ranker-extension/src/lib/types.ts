/** Facts read directly from the live Etsy page — never estimated, never AI-generated. */
export interface ScrapedListing {
  title: string;
  price: number | null;
  currency: string | null;
  /** The pre-discount price Etsy shows struck through, when this listing is on sale. */
  originalPrice: number | null;
  shopName: string | null;
  category: string | null;
  material: string | null;
  sku: string | null;
  url: string;
  /** Etsy's Product schema field is meant to be per-listing, but when a listing has no
   * reviews of its own, Etsy silently fills it with the SHOP's aggregate instead — this
   * value must always be treated as shop-wide and never used for a per-listing estimate. */
  shopReviewCount: number | null;
  shopRating: string | null;
  /** Genuinely listing-specific, read from the page's "Reviews for this item" /
   * "Item average" section — null when this exact listing has no reviews of its own
   * (in which case `shopReviewCount` above is the only number Etsy shows). */
  itemReviewCount: number | null;
  itemRating: string | null;
  /** Only populated when Etsy itself renders one of these badges on the page. */
  badges: string[];
  /** Verbatim text of a real-time activity signal Etsy chose to show (e.g. "500+ bought in the past month", "5 people bought this in the last 24 hours") — null if Etsy didn't show one on this page. */
  activitySignal: string | null;
  /** Parsed out of activitySignal — a real, listing-specific, Etsy-disclosed sales count
   * over the exact period Etsy itself reported (never normalized to a different unit,
   * since that would require yet another unstated assumption). Null when Etsy didn't
   * show one of these badges. */
  recentSales: { count: number; period: 'day' | 'month' } | null;
  /** Most recent review date found in the page's structured data (ISO string) — the
   * closest real signal to "how recently active this listing is". Etsy does not
   * publicly expose a listing's original creation/publish date anywhere on the page. */
  mostRecentReviewDate: string | null;
}

export type CompetitionLevel = 'Low' | 'Medium' | 'High';

export interface RelatedKeyword {
  keyword: string;
  volume: number;
  competition: CompetitionLevel;
}

export interface TagSuggestion {
  keyword: string;
  competition: CompetitionLevel;
}

/** Compact keyword research result for the extension panel — a trimmed version of the
 * web app's KeywordAnalysis, sized for a small in-page panel rather than a full dashboard. */
export interface QuickResearch {
  keyword: string;
  score: number;
  searchVolumeLabel: string;
  competitionLabel: string;
  summary: string;
  relatedKeywords: RelatedKeyword[];
  tagSuggestions: TagSuggestion[];
  sources: { title: string; uri: string }[];
}

export type ResearchMessage =
  | { type: 'RUN_RESEARCH'; keyword: string }
  | { type: 'GET_API_KEY_STATUS' };

export type ResearchResponse =
  | { ok: true; data: QuickResearch }
  | { ok: false; error: string };

export type ApiKeyStatusResponse = { hasKey: boolean };
