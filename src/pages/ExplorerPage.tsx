import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricCards } from '../components/MetricCards';
import { TrendChart } from '../components/TrendChart';
import { TitleAnalysis } from '../components/TitleAnalysis';
import { KeywordTable } from '../components/KeywordTable';
import { TagTable } from '../components/TagTable';
import { CopyTagsBox } from '../components/CopyTagsBox';
import { DataSourcesSidebar } from '../components/DataSourcesSidebar';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { analyzeKeyword, analyzeKeywordFromImage } from '../services/geminiService';
import { recordSnapshot } from '../lib/history';
import type { KeywordAnalysis } from '../types';

type ViewState = 'idle' | 'loading' | 'error' | 'ready';

const MAX_RECENT_SEARCHES = 5;

export interface ExplorerSeed {
  keyword: string;
  nonce: number;
}

export function ExplorerPage({ seed }: { seed?: ExplorerSeed | null }) {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastKeyword, setLastKeyword] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const recordSuccess = (result: KeywordAnalysis) => {
    setAnalysis(result);
    setViewState('ready');
    setRecentSearches((prev) =>
      [result.keyword, ...prev.filter((k) => k.toLowerCase() !== result.keyword.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES,
      ),
    );
    recordSnapshot({
      keyword: result.keyword,
      timestamp: Date.now(),
      score: result.score,
      searchVolumeLabel: result.searchVolumeLabel,
      competitionLabel: result.competitionLabel,
    });
  };

  const recordFailure = (err: unknown) => {
    setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    setViewState('error');
  };

  const runAnalysis = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    retryRef.current = () => runAnalysis(trimmed);
    setLastKeyword(trimmed);
    setImagePreviewUrl(null);
    setViewState('loading');
    setErrorMessage('');

    try {
      recordSuccess(await analyzeKeyword(trimmed));
    } catch (err) {
      recordFailure(err);
    }
  };

  const runAnalysisFromImage = async (file: File) => {
    retryRef.current = () => runAnalysisFromImage(file);
    setLastKeyword('');
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setViewState('loading');
    setErrorMessage('');

    try {
      recordSuccess(await analyzeKeywordFromImage(file));
    } catch (err) {
      recordFailure(err);
    }
  };

  // A seed arriving from another page (Compare Keywords, Rank Tracker) re-runs the
  // same analysis here. Keying off `nonce` (not `keyword`) lets the same keyword be
  // re-seeded twice in a row and still trigger.
  useEffect(() => {
    if (seed) runAnalysis(seed.keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce]);

  const isLoading = viewState === 'loading';

  return (
    <>
      <PageHeader
        onSearch={runAnalysis}
        onImageSelected={runAnalysisFromImage}
        isLoading={isLoading}
        value={lastKeyword}
        recent={recentSearches}
        onSelectRecent={runAnalysis}
      />

      <main className="flex-1 px-6 py-6 lg:px-8">
        {viewState === 'idle' && <EmptyState />}
        {viewState === 'loading' && <LoadingState imagePreviewUrl={imagePreviewUrl} />}
        {viewState === 'error' && <ErrorState message={errorMessage} onRetry={() => retryRef.current()} />}

        {viewState === 'ready' && analysis && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-6">
              {imagePreviewUrl && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img src={imagePreviewUrl} alt="Uploaded product" className="h-12 w-12 rounded-lg object-cover" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Identified from photo</p>
                    <p className="text-sm font-bold text-slate-800">{analysis.keyword}</p>
                  </div>
                </div>
              )}
              <MetricCards analysis={analysis} />
              <TrendChart trendData={analysis.trendData} />
              <TitleAnalysis analysis={analysis} />
              <KeywordTable keywords={analysis.relatedKeywords} />
              <TagTable tags={analysis.tagSuggestions} />
              <CopyTagsBox tags={analysis.tagSuggestions.map((t) => t.keyword)} />
            </div>
            <DataSourcesSidebar sources={analysis.sources} />
          </div>
        )}
      </main>
    </>
  );
}
