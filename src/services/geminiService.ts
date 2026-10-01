import type {
  AuditIssue,
  CompetitionLevel,
  DataSource,
  IssueSeverity,
  KeywordAnalysis,
  ListingAudit,
  ShopTeardown,
} from '../types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

interface GeminiRestResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
}

/**
 * Calls this app's own `/api/gemini` Cloudflare Pages Function instead of the Gemini
 * API directly. The real API key lives only server-side (as the Function's
 * GEMINI_API_KEY binding) — the browser never sees it, unlike the old approach of
 * reading a VITE_-prefixed env var, which Vite would have baked straight into the
 * shipped JS bundle for anyone to read.
 */
async function callGemini(parts: GeminiPart[]): Promise<GeminiRestResponse> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as GeminiRestResponse;
}

function extractText(response: GeminiRestResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

/** Gemini surfaces a busy model as an error whose message is the raw API error JSON. */
function isTransientServerError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /"code":\s*(503|429)/.test(message) || /UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The model frequently returns a transient 503 ("currently experiencing high
 * demand") that clears up within a couple of seconds, so it isn't worth
 * surfacing to the user as a hard failure on the first try. Non-transient
 * errors (bad API key, malformed JSON, etc.) are rethrown immediately.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && isTransientServerError(err)) {
      await sleep(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

/**
 * The model cannot access Etsy's real analytics, so it must never invent a search
 * volume out of thin air. It is only allowed to reason from evidence phrases that
 * actually surface in `site:etsy.com` search snippets (e.g. "1k+ bought", "500+
 * sold", review counts, number of competing listings) and derive a number from
 * them. This block is shared by the text and image prompts, so keep the
 * derivation rule and the JSON contract in sync with `KeywordAnalysis`.
 */
function evidenceAndOutputRules(scoreItemIndex: number): string {
  return `EVIDENCE-BASED ESTIMATION (NO HALLUCINATION):
- You do NOT have access to Etsy's real search volume API. NEVER invent or guess a raw search volume number.
- Every quantitative estimate must be derived from a specific evidence signal found in a search snippet or listing page, such as "1k+ bought", "500+ sold", review counts, number of competing listings, or badges like "Bestseller"/"Star Seller".
- Estimation rule: when a listing snippet shows a "bought" or "sold" count, estimate the monthly search volume behind that listing as approximately 15x that count (e.g. "1k+ bought" implies roughly 15,000 estimated monthly searches for that niche). Combine multiple listing signals to judge overall demand for the keyword.
- If the evidence is thin, say so honestly in "summary" and choose conservative labels rather than fabricating precision.

TEMPERATURE / STYLE:
- Be analytical, literal, and deterministic. Do not add marketing language or hedge with phrases like "I think" or "probably". State conclusions plainly and tie each one to the evidence you found.

WHAT TO PRODUCE:
${scoreItemIndex}. score (0-100): overall opportunity score for a new seller targeting this keyword, weighing demand evidence against competition evidence.
${scoreItemIndex + 1}. searchVolumeLabel: a short human label (e.g. "High", "Medium", "Low (est. 200-500/mo)") summarizing estimated demand, grounded in the evidence above.
${scoreItemIndex + 2}. competitionLabel: a short human label (e.g. "Low", "Medium", "High (dominated by top-rated sellers)") summarizing how saturated the listings are.
${scoreItemIndex + 3}. summary: 2-3 sentences explaining the score, citing the specific evidence signals you found (counts, badges, listing density).
${scoreItemIndex + 4}. trendData: an array of 12 objects ({ "month": "Jan".."Dec", "volume": number }) representing a relative seasonality curve (0-100 scale) inferred from any seasonal cues in the listings (holiday tags, seasonal titles, "back in stock" dates) or, if no seasonal cues exist, a flat/plausible estimate labeled honestly in "summary".
${scoreItemIndex + 5}. relatedKeywords: 6-10 long-tail keyword variants actually seen in Etsy listing titles/tags for this niche, each with { "keyword", "volume" (estimated monthly, integer), "competition" ("Low"|"Medium"|"High"), "cpc" (estimated USD, derived from category competitiveness), "ctr" (estimated percentage as a number) }.
${scoreItemIndex + 6}. tagSuggestions: exactly 12 keyword phrases suited for Etsy's tag field specifically (distinct from relatedKeywords/titles). Etsy tags perform best as long-tail, multi-word phrases that use as much of the 20-character limit as possible — prefer a specific phrase like "boho wall hanging" (18 chars) over a short generic word like "boho" or "decor" (Etsy's search algorithm rewards exact multi-word tag matches over broad single words). Every tag MUST be 20 characters or fewer (Etsy's hard limit, count every character including spaces) and contain no commas, but should be as close to that 20-character ceiling as a natural, real phrase allows — avoid single-word tags entirely. Draw each tag from real tags/terms you observed on competing listings or their natural long-tail variants, and avoid near-duplicates of relatedKeywords. Each with { "keyword" (a long-tail phrase, <=20 chars), "volume" (estimated monthly, integer), "competition" ("Low"|"Medium"|"High") }.
${scoreItemIndex + 7}. marketLeaders: 3-6 of the top-ranking real listings you found, each with { "title" (the real Etsy listing title), "shopName" (the real Etsy shop name), "price" (USD number), "signal" (the exact evidence phrase you based this on, e.g. "2k+ bought, Star Seller"), "badges" (array of ONLY the exact badge labels you actually saw for this listing, from: "Star Seller", "Etsy's Pick", "Bestseller", "Trending" — empty array if none seen, never guess one), "reviewCount" (integer number of reviews if the snippet discloses one, else null — do not estimate this), "reportedSales" (integer if Etsy itself explicitly discloses a sales/bought count for this listing, e.g. "2.6k sales" -> 2600, else null — do not compute this from reviewCount, that is a separate raw fact).
${scoreItemIndex + 8}. generatedTitles: 5 new SEO-optimized Etsy listing title suggestions (under 140 characters each) that a seller could use to compete for this keyword, following Etsy title best practices (front-load primary keyword, include long-tail modifiers, avoid keyword stuffing).`;
}

function buildPrompt(keyword: string): string {
  return `You are an Etsy SEO research analyst performing a "Deep Scrape Simulation" for the seller keyword: "${keyword}".

SEARCH CONSTRAINT (MANDATORY):
- Every search query you issue must be scoped to etsy.com, e.g. \`site:etsy.com ${keyword}\`, \`etsy.com "${keyword}"\`, or \`${keyword} etsy listing\`.
- If a query returns results outside etsy.com, immediately rephrase and search again (try at least 2-3 phrasings) before concluding no data is available.
- Only cite or draw evidence from search results whose source domain is etsy.com. Never draw evidence from any other domain.

${evidenceAndOutputRules(1)}

OUTPUT FORMAT (STRICT):
Return ONLY a single valid JSON object, with no markdown code fences and no commentary before or after it, matching exactly this shape:

{
  "score": number,
  "searchVolumeLabel": string,
  "competitionLabel": string,
  "summary": string,
  "trendData": [{ "month": string, "volume": number }],
  "relatedKeywords": [{ "keyword": string, "volume": number, "competition": "Low"|"Medium"|"High", "cpc": number, "ctr": number }],
  "tagSuggestions": [{ "keyword": string, "volume": number, "competition": "Low"|"Medium"|"High" }],
  "marketLeaders": [{ "title": string, "shopName": string, "price": number, "signal": string, "badges": [string], "reviewCount": number|null, "reportedSales": number|null }],
  "generatedTitles": [string]
}`;
}

/**
 * Photo-driven variant of `buildPrompt`: the model must first name the product
 * it sees (as "identifiedKeyword") before running the identical Etsy research
 * process. Keeping this separate from `buildPrompt` (rather than passing a
 * placeholder string into it) avoids search-constraint bullets that read like
 * literal template syntax ("site:etsy.com the identifiedKeyword").
 */
function buildImagePrompt(): string {
  return `You are an Etsy SEO research analyst performing a "Deep Scrape Simulation" based on an attached product photo.

STEP 1 — IDENTIFY THE PRODUCT:
Look at the attached photo and determine the single most accurate Etsy-style keyword phrase a seller would use to list this item (e.g. "macrame plant hanger", "birth flower necklace", "boho ceramic mug"). Base this only on what is visibly in the photo — material, style, color, construction, and apparent use case. Do not invent details you cannot see or assume information not visible in the image. Call this the "identifiedKeyword".

STEP 2 — RESEARCH THAT KEYWORD ON ETSY:
Using the identifiedKeyword as the seed term, perform the same research process used for text-based keyword requests.

SEARCH CONSTRAINT (MANDATORY):
- Every search query you issue must be scoped to etsy.com, e.g. \`site:etsy.com <identifiedKeyword>\`, \`etsy.com "<identifiedKeyword>"\`, or \`<identifiedKeyword> etsy listing\`.
- If a query returns results outside etsy.com, immediately rephrase and search again (try at least 2-3 phrasings) before concluding no data is available.
- Only cite or draw evidence from search results whose source domain is etsy.com. Never draw evidence from any other domain.

${evidenceAndOutputRules(2)}

OUTPUT FORMAT (STRICT):
Return ONLY a single valid JSON object, with no markdown code fences and no commentary before or after it, matching exactly this shape:

{
  "identifiedKeyword": string,
  "score": number,
  "searchVolumeLabel": string,
  "competitionLabel": string,
  "summary": string,
  "trendData": [{ "month": string, "volume": number }],
  "relatedKeywords": [{ "keyword": string, "volume": number, "competition": "Low"|"Medium"|"High", "cpc": number, "ctr": number }],
  "tagSuggestions": [{ "keyword": string, "volume": number, "competition": "Low"|"Medium"|"High" }],
  "marketLeaders": [{ "title": string, "shopName": string, "price": number, "signal": string, "badges": [string], "reviewCount": number|null, "reportedSales": number|null }],
  "generatedTitles": [string]
}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.slice(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * The Gemini grounding tool can return chunks from redirect/aggregator domains
 * (e.g. google's vertexaisearch redirect wrapper) even when instructed to
 * scope to site:etsy.com. This filter is the enforcement point for rule #4:
 * any source not actually hosted on etsy.com is dropped before it reaches the UI.
 */
function extractEtsySources(response: GeminiRestResponse): DataSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: DataSource[] = [];

  const isEtsyHostname = (hostname: string) => hostname === 'etsy.com' || hostname.endsWith('.etsy.com');

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title ?? uri ?? '';
    if (!uri) continue;

    // Gemini's googleSearch grounding wraps every result behind a
    // vertexaisearch.cloud.google.com redirect, so `uri`'s hostname is never
    // the real source domain. The actual source domain is reported in `title`
    // (e.g. "etsy.com"), so that is what must be checked against the allowlist.
    const isEtsy = isEtsyHostname(title.trim().toLowerCase());
    if (!isEtsy) continue;
    if (seen.has(uri)) continue;

    seen.add(uri);
    sources.push({ title, uri });
  }

  return sources;
}

/** Strips ```json fences and surrounding prose the model may add despite instructions. */
function extractJsonPayload(rawText: string): string {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText.trim();
}

/**
 * `keywordOverride` is used for text search, where the user's own typed phrase
 * should be kept verbatim. When omitted (the image-analysis path), the keyword
 * is instead read from the model's own "identifiedKeyword" field, since only
 * the model knows what it saw in the photo.
 */
function parseAnalysis(rawText: string, keywordOverride?: string): Omit<KeywordAnalysis, 'sources'> {
  const payload = extractJsonPayload(rawText);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payload);
  } catch (err) {
    throw new Error(
      `The AI response could not be parsed as JSON. Raw response started with: "${rawText.slice(0, 200)}"`,
    );
  }

  const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  const asCompetition = (value: unknown): CompetitionLevel =>
    value === 'Low' || value === 'Medium' || value === 'High' ? value : 'Medium';

  const keyword =
    keywordOverride ?? (typeof parsed.identifiedKeyword === 'string' ? parsed.identifiedKeyword : 'Unknown product');

  return {
    keyword,
    score: Math.max(0, Math.min(100, asNumber(parsed.score))),
    searchVolumeLabel: typeof parsed.searchVolumeLabel === 'string' ? parsed.searchVolumeLabel : 'Unknown',
    competitionLabel: typeof parsed.competitionLabel === 'string' ? parsed.competitionLabel : 'Unknown',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    trendData: Array.isArray(parsed.trendData)
      ? (parsed.trendData as Array<Record<string, unknown>>).map((p) => ({
          month: typeof p.month === 'string' ? p.month : '',
          volume: asNumber(p.volume),
        }))
      : [],
    relatedKeywords: Array.isArray(parsed.relatedKeywords)
      ? (parsed.relatedKeywords as Array<Record<string, unknown>>).map((k) => ({
          keyword: typeof k.keyword === 'string' ? k.keyword : '',
          volume: asNumber(k.volume),
          competition: asCompetition(k.competition),
          cpc: asNumber(k.cpc),
          ctr: asNumber(k.ctr),
        }))
      : [],
    tagSuggestions: Array.isArray(parsed.tagSuggestions)
      ? (parsed.tagSuggestions as Array<Record<string, unknown>>).map((t) => ({
          keyword: typeof t.keyword === 'string' ? t.keyword : '',
          volume: asNumber(t.volume),
          competition: asCompetition(t.competition),
        }))
      : [],
    marketLeaders: Array.isArray(parsed.marketLeaders)
      ? (parsed.marketLeaders as Array<Record<string, unknown>>).map((m) => ({
          title: typeof m.title === 'string' ? m.title : '',
          shopName: typeof m.shopName === 'string' ? m.shopName : '',
          price: asNumber(m.price),
          signal: typeof m.signal === 'string' ? m.signal : '',
          badges: asStringArray(m.badges),
          reviewCount: asNullableNumber(m.reviewCount),
          reportedSales: asNullableNumber(m.reportedSales),
        }))
      : [],
    generatedTitles: Array.isArray(parsed.generatedTitles)
      ? (parsed.generatedTitles as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
  };
}

export async function analyzeKeyword(keyword: string): Promise<KeywordAnalysis> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    throw new Error('Please enter a keyword to analyze.');
  }

  const response = await withRetry(() => callGemini([{ text: buildPrompt(trimmed) }]));

  const rawText = extractText(response);
  if (!rawText) {
    throw new Error('The AI returned an empty response. Try again or refine your keyword.');
  }

  const analysis = parseAnalysis(rawText, trimmed);
  const sources = extractEtsySources(response);

  return { ...analysis, sources };
}

export async function analyzeKeywordFromImage(file: File): Promise<KeywordAnalysis> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('That image is too large. Please upload a file under 8MB.');
  }

  const base64Data = await fileToBase64(file);

  const response = await withRetry(() =>
    callGemini([{ inlineData: { mimeType: file.type, data: base64Data } }, { text: buildImagePrompt() }]),
  );

  const rawText = extractText(response);
  if (!rawText) {
    throw new Error('The AI returned an empty response. Try a different photo.');
  }

  const analysis = parseAnalysis(rawText);
  const sources = extractEtsySources(response);

  return { ...analysis, sources };
}

/** Shared by the Listing Auditor and Shop Teardown prompts below; kept separate from
 * `evidenceAndOutputRules` (used by the keyword/image prompts) so changes to one
 * feature's JSON contract can't silently break the other's parsing.
 */
const EVIDENCE_DISCIPLINE = `EVIDENCE DISCIPLINE:
- You do NOT have access to Etsy's real analytics or a way to load arbitrary pages. NEVER invent a number, listing, or shop you did not actually find via search.
- Every quantitative claim must be traceable to a specific evidence signal in a search snippet (e.g. "1k+ bought", "500+ sold", review counts, badges like "Bestseller"/"Star Seller").
- If a listing or shop can't be found via search, or evidence is thin, say so plainly in "summary" rather than guessing.

STYLE:
- Be analytical, literal, and deterministic. State conclusions plainly and tie each one to evidence you found.`;

function asIssueList(value: unknown): AuditIssue[] {
  if (!Array.isArray(value)) return [];
  const asSeverity = (v: unknown): IssueSeverity => (v === 'good' || v === 'warning' || v === 'critical' ? v : 'warning');
  return (value as Array<Record<string, unknown>>).map((item) => ({
    severity: asSeverity(item.severity),
    message: typeof item.message === 'string' ? item.message : '',
  }));
}

/** Distinguishes "no evidence found" (null) from a genuine 0, unlike `asNumber`'s fallback-to-0 behavior. */
function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === 'string') : [];
}

function buildListingAuditPrompt(title: string, tags: string[], url: string): string {
  const tagsList = tags.length ? tags.join(', ') : '(no tags provided)';
  return `You are an Etsy listing SEO auditor performing a "Deep Scrape Simulation" for a seller's own listing.

CURRENT LISTING UNDER REVIEW:
- Title: "${title}"
- Tags: ${tagsList}
${url ? `- Listing URL (context only, may not be reachable via search): ${url}` : ''}

SEARCH CONSTRAINT (MANDATORY):
- Identify the primary product/niche from the title above, then research real competing listings for it the same way as normal keyword research: every search query scoped to etsy.com, e.g. \`site:etsy.com <primary keyword>\`. Only cite evidence from etsy.com sources.

${EVIDENCE_DISCIPLINE}

WHAT TO AUDIT:
Compare the CURRENT title and tags above against what real top-ranking competing listings in this niche are doing: keyword placement/front-loading, title length usage (Etsy allows up to 140 characters), tag specificity and character-limit usage (Etsy tags max 20 characters each), and keyword duplication or gaps.

OUTPUT FORMAT (STRICT):
Return ONLY a single valid JSON object, with no markdown code fences and no commentary before or after it, matching exactly this shape:

{
  "overallScore": number (0-100),
  "titleScore": number (0-100),
  "tagsScore": number (0-100),
  "titleIssues": [{ "severity": "good"|"warning"|"critical", "message": string }],
  "tagIssues": [{ "severity": "good"|"warning"|"critical", "message": string }],
  "missingKeywords": [string],
  "suggestedTitle": string,
  "suggestedTags": [string],
  "summary": string
}

Include at least 2 titleIssues and 2 tagIssues each — a mix of "good" call-outs for what's already working and "warning"/"critical" for real problems, each citing what evidence (or its absence) led to that verdict. suggestedTitle must stay under 140 characters and front-load the primary keyword. suggestedTags must contain exactly 12 long-tail tags, each 20 characters or fewer.`;
}

function parseListingAudit(rawText: string, title: string, tags: string[], url: string): Omit<ListingAudit, 'sources'> {
  const payload = extractJsonPayload(rawText);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error(`The AI response could not be parsed as JSON. Raw response started with: "${rawText.slice(0, 200)}"`);
  }

  const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  return {
    url,
    currentTitle: title,
    currentTags: tags,
    overallScore: Math.max(0, Math.min(100, asNumber(parsed.overallScore))),
    titleScore: Math.max(0, Math.min(100, asNumber(parsed.titleScore))),
    tagsScore: Math.max(0, Math.min(100, asNumber(parsed.tagsScore))),
    titleIssues: asIssueList(parsed.titleIssues),
    tagIssues: asIssueList(parsed.tagIssues),
    missingKeywords: asStringArray(parsed.missingKeywords),
    suggestedTitle: typeof parsed.suggestedTitle === 'string' ? parsed.suggestedTitle : '',
    suggestedTags: asStringArray(parsed.suggestedTags),
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

export async function auditListing(title: string, tagsInput: string, url = ''): Promise<ListingAudit> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Please enter the listing\'s current title.');
  }

  const tags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const response = await withRetry(() => callGemini([{ text: buildListingAuditPrompt(trimmedTitle, tags, url.trim()) }]));

  const rawText = extractText(response);
  if (!rawText) {
    throw new Error('The AI returned an empty response. Try again.');
  }

  const audit = parseListingAudit(rawText, trimmedTitle, tags, url.trim());
  const sources = extractEtsySources(response);

  return { ...audit, sources };
}

function buildShopTeardownPrompt(shopInput: string): string {
  return `You are an Etsy competitor-research analyst performing a "Shop Teardown" for the Etsy shop: "${shopInput}".

SEARCH CONSTRAINT (MANDATORY):
- Every search query must be scoped to etsy.com, e.g. \`site:etsy.com/shop/${shopInput}\`, \`etsy.com "${shopInput}" shop\`, or \`"${shopInput}" etsy\`.
- Only cite or draw evidence from search results whose source domain is etsy.com. If you cannot find this shop or any of its listings via search, say so honestly in "summary" and return empty arrays rather than inventing listings.

${EVIDENCE_DISCIPLINE}

OUTPUT FORMAT (STRICT):
Return ONLY a single valid JSON object, with no markdown code fences and no commentary before or after it, matching exactly this shape:

{
  "shopName": string,
  "estimatedNiche": string,
  "commonKeywordThemes": [string],
  "titlePatternInsights": [string],
  "listings": [{ "title": string, "price": number, "signal": string, "badges": [string], "reviewCount": number|null, "reportedSales": number|null }],
  "summary": string
}

commonKeywordThemes: 3-8 recurring keyword themes across this shop's listing titles. titlePatternInsights: 2-5 concrete observations about how this shop structures its titles (e.g. "front-loads material + product type", "uses pipe-separated modifiers"). listings: up to 8 real listings you actually found for this shop, each with the exact evidence phrase behind "signal" (e.g. "3k+ sales, Star Seller"), "badges" (ONLY exact badges you actually saw, from: "Star Seller", "Etsy's Pick", "Bestseller", "Trending" — empty array if none), "reviewCount" (integer if disclosed, else null), and "reportedSales" (integer if Etsy explicitly discloses a sales/bought count, else null — never computed from reviewCount).`;
}

function parseShopTeardown(rawText: string, shopInput: string): Omit<ShopTeardown, 'sources'> {
  const payload = extractJsonPayload(rawText);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error(`The AI response could not be parsed as JSON. Raw response started with: "${rawText.slice(0, 200)}"`);
  }

  const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  return {
    shopInput,
    shopName: typeof parsed.shopName === 'string' && parsed.shopName ? parsed.shopName : shopInput,
    estimatedNiche: typeof parsed.estimatedNiche === 'string' ? parsed.estimatedNiche : '',
    commonKeywordThemes: asStringArray(parsed.commonKeywordThemes),
    titlePatternInsights: asStringArray(parsed.titlePatternInsights),
    listings: Array.isArray(parsed.listings)
      ? (parsed.listings as Array<Record<string, unknown>>).map((l) => ({
          title: typeof l.title === 'string' ? l.title : '',
          price: asNumber(l.price),
          signal: typeof l.signal === 'string' ? l.signal : '',
          badges: asStringArray(l.badges),
          reviewCount: asNullableNumber(l.reviewCount),
          reportedSales: asNullableNumber(l.reportedSales),
        }))
      : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
}

/** Accepts either a bare shop name or a full "etsy.com/shop/<name>" URL. */
function extractShopSlug(input: string): string {
  const match = input.match(/etsy\.com\/shop\/([^/?#]+)/i);
  return match ? match[1] : input.trim();
}

export async function analyzeShopTeardown(shopInput: string): Promise<ShopTeardown> {
  const trimmed = extractShopSlug(shopInput);
  if (!trimmed) {
    throw new Error('Please enter a shop name or shop URL.');
  }

  const response = await withRetry(() => callGemini([{ text: buildShopTeardownPrompt(trimmed) }]));

  const rawText = extractText(response);
  if (!rawText) {
    throw new Error('The AI returned an empty response. Try again.');
  }

  const teardown = parseShopTeardown(rawText, trimmed);
  const sources = extractEtsySources(response);

  return { ...teardown, sources };
}
