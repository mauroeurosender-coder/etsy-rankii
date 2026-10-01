import { useEffect, useRef, useState } from 'react';
import { ImageUp, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  isLoading: boolean;
}

export function ImageUpload({ onImageSelected, isLoading }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    onImageSelected(file);
  };

  const clear = () => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={isLoading}
      />
      {previewUrl ? (
        <div className="relative shrink-0">
          <img src={previewUrl} alt="Uploaded product" className="h-11 w-11 rounded-lg border border-slate-200 object-cover" />
          <button
            type="button"
            onClick={clear}
            disabled={isLoading}
            aria-label="Remove image"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow disabled:opacity-50"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-[13px] text-sm font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageUp className="h-4 w-4" />
          Analyze a photo
        </button>
      )}
    </div>
  );
}
