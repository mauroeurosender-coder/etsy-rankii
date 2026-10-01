import { useState } from 'react';
import { Check, Copy, Tags } from 'lucide-react';

export function CopyTagsBox({ tags }: { tags: string[] }) {
  const [copied, setCopied] = useState(false);
  const joined = tags.join(', ');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing to fall back to.
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Tags className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Copy All Tags</h2>
            <p className="text-xs text-slate-500">Comma-separated, ready to paste into Etsy's tag field</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          disabled={tags.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
        {joined || 'No tags available.'}
      </p>
    </div>
  );
}
