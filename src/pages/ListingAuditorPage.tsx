import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, XCircle } from 'lucide-react';
import { ScoreGauge } from '../components/ScoreGauge';
import { CopyTagsBox } from '../components/CopyTagsBox';
import { DataSourcesSidebar } from '../components/DataSourcesSidebar';
import { auditListing } from '../services/geminiService';
import type { AuditIssue, IssueSeverity, ListingAudit } from '../types';

type ViewState = 'idle' | 'loading' | 'error' | 'ready';

const SEVERITY_STYLES: Record<IssueSeverity, { icon: typeof CheckCircle2; text: string; bg: string }> = {
  good: { icon: CheckCircle2, text: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, text: 'text-orange-600', bg: 'bg-orange-50' },
  critical: { icon: XCircle, text: 'text-red-600', bg: 'bg-red-50' },
};

function IssueList({ issues }: { issues: AuditIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-slate-400">No issues reported.</p>;
  }
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => {
        const style = SEVERITY_STYLES[issue.severity];
        const Icon = style.icon;
        return (
          <li key={i} className={`flex items-start gap-2 rounded-lg p-2.5 text-sm ${style.bg}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`} />
            <span className="text-slate-700">{issue.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ListingAuditorPage() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [audit, setAudit] = useState<ListingAudit | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoading = viewState === 'loading';

  const runAudit = async () => {
    if (!title.trim() || isLoading) return;
    setViewState('loading');
    setErrorMessage('');
    try {
      setAudit(await auditListing(title, tagsInput, url));
      setViewState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setViewState('error');
    }
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <h1 className="text-lg font-bold text-slate-900">Listing Auditor</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Paste your current title and tags to score them against real competing Etsy listings.
        </p>

        <div className="mt-4 flex flex-col gap-3 lg:max-w-2xl">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Listing URL (optional, for your own reference)"
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Current listing title *"
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
          <textarea
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Current tags, comma-separated *"
            disabled={isLoading}
            rows={2}
            className="resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
          <button
            onClick={runAudit}
            disabled={isLoading || !title.trim()}
            className="flex w-fit items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Auditing...
              </>
            ) : (
              'Audit Listing'
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 px-6 py-6 lg:px-8">
        {viewState === 'idle' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <ClipboardList className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Audit an existing listing</h2>
            <p className="text-sm text-slate-500">
              Paste your title and tags above to see how they stack up against real top-ranking competitors.
            </p>
          </div>
        )}

        {viewState === 'loading' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-orange-100">
              <ClipboardList className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Researching your niche and auditing the listing...</h2>
          </div>
        )}

        {viewState === 'error' && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-sm font-bold text-red-800">Audit failed</h2>
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={runAudit}
              className="mt-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {viewState === 'ready' && audit && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-[220px_1fr] md:divide-x md:divide-y-0">
                  <div className="flex items-center gap-4 p-5">
                    <ScoreGauge score={audit.overallScore} />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Score</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">Listing SEO Health</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <div className="flex flex-col justify-center p-5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title Score</span>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(audit.titleScore)}/100</p>
                    </div>
                    <div className="flex flex-col justify-center p-5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags Score</span>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(audit.tagsScore)}/100</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{audit.summary}</div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Title Issues</h2>
                  <div className="mt-3">
                    <IssueList issues={audit.titleIssues} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Tag Issues</h2>
                  <div className="mt-3">
                    <IssueList issues={audit.tagIssues} />
                  </div>
                </div>
              </div>

              {audit.missingKeywords.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Missing Keyword Opportunities</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    High-value phrases competitors use that aren't in your title or tags
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audit.missingKeywords.map((kw, i) => (
                      <span key={i} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Suggested Title</h2>
                <p className="mt-3 rounded-lg bg-orange-50/60 p-3 text-sm leading-relaxed text-slate-800">
                  {audit.suggestedTitle}
                </p>
              </div>

              <CopyTagsBox tags={audit.suggestedTags} />
            </div>

            <DataSourcesSidebar sources={audit.sources} />
          </div>
        )}
      </main>
    </>
  );
}
