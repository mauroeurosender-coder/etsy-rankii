# EtsyRanker AI

Evidence-based Etsy keyword research tool. Grounds every metric in live `site:etsy.com` Google Search results via the Gemini API — no invented search volumes.

## Architecture

The frontend never talks to Gemini directly. It calls this app's own `/api/gemini` endpoint (a Cloudflare Pages Function, in `functions/api/gemini.ts`), which holds the real Gemini API key server-side and forwards the request. This keeps the key out of the browser entirely — a plain static SPA calling Gemini directly would otherwise ship the key inside its JS bundle for anyone to read.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # then paste your Gemini key into .dev.vars
```

Get a key at https://aistudio.google.com/apikey.

**Frontend only** (fast iteration on UI; `/api/gemini` calls will fail since there's no Function running):
```bash
npm run dev
```

**Full stack** (frontend + the Cloudflare Function, so AI calls actually work locally):
```bash
npm run pages:dev
```
This runs Vite and Wrangler's local Pages Functions emulator together, serving everything from `http://localhost:8788`. The first request can be noticeably slower than production (Wrangler's local Workers runtime overhead) — that's expected and not a sign of anything wrong.

## Deploying to Cloudflare Pages

**Option A — Git integration (recommended for ongoing deploys):**
1. Push this repo to GitHub.
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages → connect the repo.
3. Build command: `npm run build`. Build output directory: `dist`. (Cloudflare auto-detects the `functions/` folder — no extra config needed.)
4. Under Settings → Environment variables, add a **Secret** named `GEMINI_API_KEY` with your key. Do this for both the Production and Preview environments.
5. Deploy. Every push to the connected branch redeploys automatically.

**Option B — CLI (one-off or manual deploys):**
```bash
npx wrangler login
npm run pages:deploy
npx wrangler pages secret put GEMINI_API_KEY --project-name=etsyranker-ai
```
(`pages:deploy` builds then runs `wrangler pages deploy dist`; the project name must match what Wrangler creates/prompts for on first deploy.)

## How it works

`src/services/geminiService.ts` builds the prompts and calls `gemini-2.5-flash` (via `/api/gemini`) with the `googleSearch` grounding tool, a `site:etsy.com`-scoped prompt, and `temperature: 0.1`. The model is instructed to derive every quantitative estimate (search volume, CPC, CTR) from concrete evidence in the search snippets (e.g. "1k+ bought" → ~15,000 estimated monthly searches) rather than guessing. Grounding citations are filtered so only `etsy.com` URLs are shown as data sources.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Recharts (seasonality trend chart)
- lucide-react (icons)
- Cloudflare Pages Functions (Gemini API proxy — see `functions/api/gemini.ts`)
