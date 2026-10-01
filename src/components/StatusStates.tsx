import { AlertTriangle, Search, Sparkles } from 'lucide-react';

export function LoadingState({ imagePreviewUrl }: { imagePreviewUrl?: string | null }) {
  const steps = imagePreviewUrl
    ? [
        'Identifying the product in your photo...',
        'Querying site:etsy.com listings...',
        'Reading buy signals & badges...',
        'Drafting SEO title candidates...',
      ]
    : [
        'Querying site:etsy.com listings...',
        'Reading buy signals & badges...',
        'Deriving demand estimates...',
        'Drafting SEO title candidates...',
      ];

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      {imagePreviewUrl ? (
        <img src={imagePreviewUrl} alt="Uploaded product" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
      ) : (
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-orange-100">
          <Sparkles className="h-6 w-6 text-orange-500" />
        </div>
      )}
      <h2 className="text-base font-bold text-slate-900">Running Deep Scrape Simulation</h2>
      <ul className="w-full space-y-1.5 text-left text-sm text-slate-500">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
      <h2 className="text-sm font-bold text-red-800">Analysis failed</h2>
      <p className="text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Search className="h-6 w-6 text-slate-400" />
      </div>
      <h2 className="text-base font-bold text-slate-800">Search a keyword or upload a photo to begin</h2>
      <p className="text-sm text-slate-500">
        EtsyRanker AI scans live etsy.com search results and derives volume, competition, and title
        suggestions from real listing evidence — no guessed numbers. Upload a product photo and it will
        identify the item and research it automatically.
      </p>
    </div>
  );
}
