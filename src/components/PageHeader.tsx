import { SearchBar } from './SearchBar';
import { ImageUpload } from './ImageUpload';

interface PageHeaderProps {
  onSearch: (keyword: string) => void;
  onImageSelected: (file: File) => void;
  isLoading: boolean;
  value: string;
  recent: string[];
  onSelectRecent: (keyword: string) => void;
}

export function PageHeader({ onSearch, onImageSelected, isLoading, value, recent, onSelectRecent }: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
      <h1 className="text-lg font-bold text-slate-900">Keyword Explorer</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Evidence-based keyword intelligence, grounded in live Etsy search results.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchBar onSearch={onSearch} isLoading={isLoading} initialValue={value} />
        <span className="text-xs font-medium text-slate-400">or</span>
        <ImageUpload onImageSelected={onImageSelected} isLoading={isLoading} />
      </div>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Recent:</span>
          {recent.map((keyword) => (
            <button
              key={keyword}
              onClick={() => onSelectRecent(keyword)}
              disabled={isLoading}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {keyword}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
