import type { ApiKeyStatusResponse, CompetitionLevel, QuickResearch, ResearchMessage, ResearchResponse } from '../lib/types';

const MODEL = 'gemini-2.5-flash';
const API_KEY_STORAGE_KEY = 'geminiApiKey';

async function getApiKey(): Promise<string | null> {
  const stored = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  const key = stored[API_KEY_STORAGE_KEY];
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

function isTransientServerError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /"code":\s*(503|429)/.test(message) || /UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Same evidence-discipline and site:etsy.com scoping used by the EtsyRanker AI web app's
 * Keyword Explorer, trimmed to the fields this compact panel actually displays. */
function buildPrompt(keyword: string): string {
  return `You are an Etsy SEO research analyst researching the seller keyword: "${keyword}".

SEARCH CONSTRAINT (MANDATORY):
- Every search query you issue must be scoped to etsy.com, e.g. \`site:etsy.com ${keyword}\`, \`etsy.com "${keyword}"\`, or \`${keyword} etsy listing\`.
- If a query returns results outside etsy.com, immediately rephrase and search again before concluding no data is available.
- Only cite or draw evidence from search results whose source domain is etsy.com.

EVIDENCE-BASED ESTIMATION (NO HALLUCINATION):
- You do NOT have access to Etsy's real search volume API. NEVER invent a raw number.
- Every quantitative estimate must be derived from a specific evidence signal in a search snippet (e.g. "1k+ bought", review counts, badges like "Bestseller"/"Star Seller").
- Estimation rule: a "bought"/"sold" count implies roughly 15x that number in estimated monthly search volume for the niche.
- If evidence is thin, say so honestly in "summary" and choose conservative labels rather than fabricating precision.

WHAT TO PRODUCE (strict JSON, no markdown fences, no commentary):
{
  "score": number (0-100, opportunity score),
  "searchVolumeLabel": string,
  "competitionLabel": string,
  "summary": string (2-3 sentences citing the evidence found),
  "relatedKeywords": [{ "keyword": string, "volume": number, "competition": "Low"|"Medium"|"High" }] (5 long-tail variants seen in real Etsy listings),
  "tagSuggestions": [{ "keyword": string, "competition": "Low"|"Medium"|"High" }] (5 long-tail tag ideas, each <=20 characters, no commas)
}`;
}

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

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
}

function extractText(response: GeminiResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

function extractEtsySources(response: GeminiResponse): QuickResearch['sources'] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: QuickResearch['sources'] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title ?? uri ?? '';
    if (!uri || seen.has(uri)) continue;
    // Gemini's googleSearch grounding wraps every result behind a redirect; the real
    // source domain is reported in `title`, not the (always-redirect) `uri` hostname.
    if (title.trim().toLowerCase() !== 'etsy.com') continue;
    seen.add(uri);
    sources.push({ title, uri });
  }
  return sources;
}

function parseResearch(rawText: string, keyword: string): Omit<QuickResearch, 'sources'> {
  const payload = extractJsonPayload(rawText);
  const parsed = JSON.parse(payload) as Record<string, unknown>;

  const asNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const asCompetition = (value: unknown): CompetitionLevel =>
    value === 'Low' || value === 'Medium' || value === 'High' ? value : 'Medium';

  return {
    keyword,
    score: Math.max(0, Math.min(100, asNumber(parsed.score))),
    searchVolumeLabel: typeof parsed.searchVolumeLabel === 'string' ? parsed.searchVolumeLabel : 'Unknown',
    competitionLabel: typeof parsed.competitionLabel === 'string' ? parsed.competitionLabel : 'Unknown',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    relatedKeywords: Array.isArray(parsed.relatedKeywords)
      ? (parsed.relatedKeywords as Array<Record<string, unknown>>).map((k) => ({
          keyword: typeof k.keyword === 'string' ? k.keyword : '',
          volume: asNumber(k.volume),
          competition: asCompetition(k.competition),
        }))
      : [],
    tagSuggestions: Array.isArray(parsed.tagSuggestions)
      ? (parsed.tagSuggestions as Array<Record<string, unknown>>).map((t) => ({
          keyword: typeof t.keyword === 'string' ? t.keyword : '',
          competition: asCompetition(t.competition),
        }))
      : [],
  };
}

async function runResearch(keyword: string): Promise<QuickResearch> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key set. Click the extension icon and open Settings to add one.');
  }

  const response = await withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(keyword) }] }],
          generationConfig: { temperature: 0.1 },
          tools: [{ googleSearch: {} }],
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Request failed with status ${res.status}`);
    }
    return (await res.json()) as GeminiResponse;
  });

  const rawText = extractText(response);
  if (!rawText) {
    throw new Error('The AI returned an empty response. Try again.');
  }

  const research = parseResearch(rawText, keyword);
  const sources = extractEtsySources(response);
  return { ...research, sources };
}

chrome.runtime.onMessage.addListener((message: ResearchMessage, _sender, sendResponse) => {
  if (message.type === 'GET_API_KEY_STATUS') {
    getApiKey().then((key) => sendResponse({ hasKey: key !== null } satisfies ApiKeyStatusResponse));
    return true;
  }

  if (message.type === 'RUN_RESEARCH') {
    runResearch(message.keyword)
      .then((data) => sendResponse({ ok: true, data } satisfies ResearchResponse))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        } satisfies ResearchResponse),
      );
    return true;
  }

  return false;
});
