import type { ScrapedListing } from './types';

/** Exact labels Etsy uses for its own badges. Matched by exact text on a leaf DOM node
 * rather than by CSS class, since Etsy's utility class names can change at any time —
 * the visible label text is much more stable (it's user-facing copy). */
const KNOWN_BADGES = ["Star Seller", "Etsy's Pick", 'Bestseller', 'Trending now', 'Trending'];

/** Recent-activity phrasing Etsy sometimes (not always) renders on a listing page.
 * These are verbatim, listing-specific, Etsy-disclosed signals — shown as-is. The two
 * "sales" patterns are already real counts Etsy chose to disclose (parsed, not
 * computed) — kept as separate patterns rather than normalized into one unit, since
 * converting a 24-hour count into a monthly one would itself be an invented assumption. */
const DAILY_SALES_PATTERN = /([\d][\d,.]*)\+?\s*people bought this in the last 24 hours/i;
const MONTHLY_SALES_PATTERN = /([\d][\d,.]*)\+?\s*bought in the past month/i;
const ACTIVITY_PATTERNS = [
  DAILY_SALES_PATTERN,
  MONTHLY_SALES_PATTERN,
  /[\d][\d,.]*\+?\s*people have this in their (cart|basket)/i,
  /[\d][\d,.]*\+?\s*people favou?rited this/i,
];

interface EtsyProductJsonLd {
  '@type'?: string;
  name?: string;
  brand?: { name?: string };
  category?: string;
  material?: string;
  sku?: string;
  aggregateRating?: { ratingValue?: string; reviewCount?: number };
  review?: Array<{ datePublished?: string }>;
  offers?: {
    price?: string;
    priceCurrency?: string;
    priceSpecification?: Array<{
      price?: string;
      minPrice?: string;
      maxPrice?: string;
      priceCurrency?: string;
      priceType?: string;
    }>;
  };
}

function readProductJsonLd(doc: Document): EtsyProductJsonLd | null {
  const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? '');
      if (parsed && parsed['@type'] === 'Product') return parsed as EtsyProductJsonLd;
    } catch {
      // Malformed JSON-LD block — skip it, don't let it break the rest of the scrape.
    }
  }
  return null;
}

function findBadges(doc: Document): string[] {
  const found = new Set<string>();
  const candidates = doc.querySelectorAll('p, span, div, a, li');
  for (const el of candidates) {
    if (el.children.length > 0) continue; // only leaf nodes — avoids matching a huge ancestor wrapper
    const text = el.textContent?.trim();
    if (text && KNOWN_BADGES.includes(text)) found.add(text === 'Trending now' ? 'Trending' : text);
  }
  return [...found];
}

function findActivitySignal(doc: Document): string | null {
  const bodyText = doc.body.innerText;
  for (const pattern of ACTIVITY_PATTERNS) {
    const match = bodyText.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function parseRecentSales(activitySignal: string | null): { count: number; period: 'day' | 'month' } | null {
  if (!activitySignal) return null;
  const asCount = (raw: string): number | null => {
    const num = Number.parseInt(raw.replace(/[,.]/g, ''), 10);
    return Number.isFinite(num) ? num : null;
  };

  const daily = activitySignal.match(DAILY_SALES_PATTERN);
  if (daily) {
    const count = asCount(daily[1]);
    return count === null ? null : { count, period: 'day' };
  }
  const monthly = activitySignal.match(MONTHLY_SALES_PATTERN);
  if (monthly) {
    const count = asCount(monthly[1]);
    return count === null ? null : { count, period: 'month' };
  }
  return null;
}

/** The DOM section Etsy renders when a listing has reviews of its own — the one place
 * a genuinely per-listing (not shop-wide) rating/review count is disclosed. Matched by
 * visible text ("Item average (N reviews)"), not CSS classes, for the same stability
 * reason as findBadges. Absent entirely when this exact listing has zero reviews. */
function findItemReviewStats(doc: Document): { itemRating: string | null; itemReviewCount: number | null } {
  const normalized = doc.body.innerText.replace(/\s+/g, ' ');
  const match = normalized.match(/([\d.]+)\s*Item average\s*\(([\d,]+)\s*reviews?\)/i);
  if (!match) return { itemRating: null, itemReviewCount: null };
  const count = Number.parseInt(match[2].replace(/,/g, ''), 10);
  return { itemRating: match[1], itemReviewCount: Number.isFinite(count) ? count : null };
}

function findMostRecentReviewDate(product: EtsyProductJsonLd | null): string | null {
  const dates = (product?.review ?? [])
    .map((r) => r.datePublished)
    .filter((d): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d)));
  if (dates.length === 0) return null;
  return dates.reduce((latest, d) => (Date.parse(d) > Date.parse(latest) ? d : latest));
}

/** Reads only what Etsy itself renders on the current listing page — schema.org
 * structured data for the exact facts (name, price, reviews, shop), plus a small,
 * text-based scan for badges and any real-time activity signal. Nothing here is
 * computed, guessed, or estimated. */
export function scrapeListingPage(doc: Document = document): ScrapedListing {
  const product = readProductJsonLd(doc);
  const offer = product?.offers;
  const saleSpec = offer?.priceSpecification?.find((s) => s.priceType === 'https://schema.org/StrikethroughPrice');
  const activitySignal = findActivitySignal(doc);

  return {
    title: product?.name ?? doc.title,
    price: parsePrice(offer?.price),
    currency: offer?.priceCurrency ?? null,
    originalPrice: saleSpec ? parsePrice(saleSpec.price ?? saleSpec.minPrice) : null,
    shopName: product?.brand?.name ?? null,
    category: product?.category ?? null,
    material: product?.material ?? null,
    sku: product?.sku ?? null,
    url: doc.location.href,
    shopReviewCount: product?.aggregateRating?.reviewCount ?? null,
    shopRating: product?.aggregateRating?.ratingValue ?? null,
    ...findItemReviewStats(doc),
    badges: findBadges(doc),
    activitySignal,
    recentSales: parseRecentSales(activitySignal),
    mostRecentReviewDate: findMostRecentReviewDate(product),
  };
}
