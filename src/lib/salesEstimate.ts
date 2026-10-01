export type SalesSource = 'reported' | 'estimated' | 'unavailable';

/**
 * Etsy never discloses these ratios for a competitor's listing, and no third-party
 * tool (eRank, EverBee, Alura) has real access to them either — they all lean on the
 * same industry rules-of-thumb. Rather than hide a multiplier inside an opaque
 * "estimated sales" number, it lives here as a named, visible constant: roughly 1 in
 * 10 buyers is assumed to leave a review, and roughly 2.5% of viewers are assumed to
 * convert to a sale. Both are rough population-level assumptions, not facts about any
 * specific listing, and the UI must always label numbers derived from them as estimates.
 */
export const REVIEW_TO_SALES_MULTIPLIER = 10;
export const ASSUMED_CONVERSION_RATE = 0.025;

export interface SalesEstimate {
  value: number | null;
  source: SalesSource;
}

/**
 * Prefers Etsy's own disclosed sales figure (e.g. a "2.6k sales" badge) when the AI
 * found one. Only falls back to the review-count multiplier when no such figure was
 * disclosed — never blends the two into a single number.
 */
export function estimateSales(reportedSales: number | null, reviewCount: number | null): SalesEstimate {
  if (reportedSales !== null && reportedSales > 0) {
    return { value: reportedSales, source: 'reported' };
  }
  if (reviewCount !== null && reviewCount > 0) {
    return { value: Math.round(reviewCount * REVIEW_TO_SALES_MULTIPLIER), source: 'estimated' };
  }
  return { value: null, source: 'unavailable' };
}

/** Views are never disclosed by Etsy for a competitor's listing, so this is always a modeled estimate, even when the sales figure it's derived from is a reported (exact) number. */
export function estimateViews(salesValue: number | null): number | null {
  if (salesValue === null) return null;
  return Math.round(salesValue / ASSUMED_CONVERSION_RATE);
}
