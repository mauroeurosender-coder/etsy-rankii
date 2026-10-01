export type SalesSource = 'reported' | 'estimated_from_item_reviews' | 'unavailable';

/**
 * Same industry rule-of-thumb documented in the web app's salesEstimate.ts — no
 * third-party tool has real access to this ratio either. Kept as a named constant
 * rather than buried inside a single opaque number.
 */
export const REVIEW_TO_SALES_MULTIPLIER = 10;
export const ASSUMED_CONVERSION_RATE = 0.025;

export interface SalesEstimate {
  value: number | null;
  /** Only set when `source` is 'reported' — the exact window Etsy itself disclosed. */
  period: 'day' | 'month' | null;
  source: SalesSource;
}

/**
 * Deliberately never falls back to the shop's aggregate review count: that number
 * describes the whole shop's catalog, not this one listing, and using it here would
 * misattribute shop-wide activity to a single SKU. Only two inputs are used, both
 * genuinely specific to this exact listing:
 * 1. `recentSales` — a real count Etsy itself disclosed (best case, no math at all).
 * 2. `itemReviewCount` — this listing's own review count (from its "Item average"
 *    section), multiplied by the same rule-of-thumb ratio eRank/EverBee use.
 * If neither is available, the result is 'unavailable' — never a guess.
 */
export function estimateSales(
  recentSales: { count: number; period: 'day' | 'month' } | null,
  itemReviewCount: number | null,
): SalesEstimate {
  if (recentSales) {
    return { value: recentSales.count, period: recentSales.period, source: 'reported' };
  }
  if (itemReviewCount !== null && itemReviewCount > 0) {
    return { value: Math.round(itemReviewCount * REVIEW_TO_SALES_MULTIPLIER), period: null, source: 'estimated_from_item_reviews' };
  }
  return { value: null, period: null, source: 'unavailable' };
}

/** Views are never disclosed by Etsy for any listing, so this is always modeled, regardless of how the sales figure it's derived from was obtained. */
export function estimateViews(salesValue: number | null): number | null {
  if (salesValue === null) return null;
  return Math.round(salesValue / ASSUMED_CONVERSION_RATE);
}
