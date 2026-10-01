# EtsyRanker AI — Browser Extension

A Chrome/Brave (Manifest V3) extension that adds a small panel to Etsy listing pages showing **real, page-scraped facts** — price, shop rating, badges (Star Seller / Etsy's Pick / Bestseller / Trending), and any real-time activity signal Etsy itself renders (e.g. "500+ bought in the past month") — plus an optional "Research this keyword" button that runs the same evidence-based Gemini research as the [EtsyRanker AI web app](../README.md).

**Nothing is scraped as a guess.** Price, reviews, and shop name come from Etsy's own `schema.org/Product` structured data embedded in the page. Badges and activity signals are matched by exact visible text, never inferred. If a fact isn't shown by Etsy, the panel says so — it never fills the gap with a number.

This is a separate project from the web app — nothing in `../src` was touched.

## Setup

```bash
npm install
npm run build
```

This produces a `dist/` folder ready to load as an unpacked extension.

### Load it in Chrome or Brave

1. Go to `chrome://extensions` (Chrome) or `brave://extensions` (Brave).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this project's `dist/` folder.
4. Click the extension's icon in the toolbar → **Settings**, and paste in a Gemini API key (get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)). The key is stored only in your browser's local extension storage — it's sent directly to Google's API and nowhere else.

### Try it

Visit any individual Etsy listing page (a URL like `etsy.com/listing/12345/...`). A panel appears in the bottom-right corner showing the real scraped facts. Click "Research this keyword" to run AI-assisted keyword/tag research seeded from that listing's title.

## Rebuilding after changes

```bash
npm run build
```

Then in `chrome://extensions`, click the refresh icon on the EtsyRanker AI card (or toggle it off/on) to pick up the new build. Reload any open Etsy tab afterward.

## Project structure

- `src/lib/etsyScrape.ts` — reads the live page's `Product` JSON-LD and scans for badge/activity text. Zero estimation.
- `src/lib/salesEstimate.ts`-equivalent logic is intentionally **not** included here — see note below.
- `src/content/` — the React panel, mounted into a Shadow DOM host so its styles never leak into or clash with Etsy's own page.
- `src/background/` — the service worker; owns the Gemini API key and all outbound network calls (kept out of the content script, which runs in the context of the Etsy page).
- `src/options/` — the settings page (API key) and toolbar popup (status + link to settings).

### Why no review-count sales estimate here

The web app's Shop Teardown/Market Leaders tables estimate sales from a review count found in *search snippets*, which can genuinely be listing-specific. On a real Etsy listing page, though, the `aggregateRating.reviewCount` field in the page's own structured data is usually the **shop's** total review count, not this one SKU's — confirmed by checking two live listings from the same shop, where both listings reported the same very-large review count belonging to the shop overall. Multiplying that number by a per-sale review-rate assumption would wildly overstate a single listing's sales, so this extension does not compute one. The panel instead labels that number honestly as "shop rating" / shop-wide, and only shows a sales-adjacent figure at all when Etsy itself discloses a real-time activity badge tied to the exact listing.

## Known limitations

- Only activates on individual listing pages (`etsy.com/listing/...`), not search results pages or shop pages — this was the deliberately scoped v1 (see the web app conversation for the fuller "search grid overlay" option that was intentionally deferred).
- Etsy doesn't always render the "X bought in the past month" badge — when it doesn't, the panel says so rather than guessing.
- If Etsy changes its `Product` JSON-LD shape or its badge label text, the affected field will simply stop populating (fails safe to "not shown", not to a wrong number).
