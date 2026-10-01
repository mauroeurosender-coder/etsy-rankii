import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export function SearchBar({ onSearch, isLoading, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
        <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Try: personalized dog collar, boho wall art, birth flower necklace..."
          className="w-full min-w-0 bg-transparent px-1 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scraping Etsy...
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </div>
    </form>
  );
}
