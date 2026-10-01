/**
 * Cloudflare Pages Function — proxies the frontend's Gemini requests server-side so
 * GEMINI_API_KEY never ships in the client bundle. Deployed automatically alongside
 * the static site; Cloudflare routes any request to /api/gemini here instead of
 * serving it as a static file.
 *
 * The frontend only ever sends `parts` (the prompt text, or an image + text pair for
 * photo analysis). Everything else — model, temperature, the googleSearch tool — is
 * fixed here rather than accepted from the client, so a request can't be crafted to
 * change the model's behavior or cost profile.
 */

interface Env {
  GEMINI_API_KEY: string;
}

const MODEL = 'gemini-2.5-flash';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.GEMINI_API_KEY) {
    return jsonResponse({ error: { message: 'Server is missing GEMINI_API_KEY.' } }, 500);
  }

  let body: { parts?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { message: 'Invalid JSON body.' } }, 400);
  }

  if (!Array.isArray(body.parts) || body.parts.length === 0) {
    return jsonResponse({ error: { message: 'Request body must include a non-empty "parts" array.' } }, 400);
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: body.parts }],
        generationConfig: { temperature: 0.1 },
        tools: [{ googleSearch: {} }],
      }),
    },
  );

  // Forwarded as-is (success or error) so the frontend's existing error parsing
  // (which reads Gemini's own {"error":{"code":503,...}} shape) keeps working unchanged.
  const text = await geminiRes.text();
  return new Response(text, {
    status: geminiRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestGet: PagesFunction = async () =>
  jsonResponse({ error: { message: 'This endpoint only accepts POST requests.' } }, 405);

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
