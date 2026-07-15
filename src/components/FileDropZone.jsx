import React, { useRef, useState } from 'react';
import { formatFileSize, isImageMime, processFilesForUpload } from '../services/fileUploadService';

export default function FileDropZone({
  label,
  hint,
  accept,
  multiple = false,
  maxFiles = multiple ? 10 : 1,
  maxSizeMB = 8,
  uploadFolder = 'uploads',
  projectId,
  files = [],
  onChange,
  disabled = false,
  variant = 'default',
  emptyText = 'Drag & drop files here',
  browseText = 'or click to browse',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canAddMore = multiple ? files.length < maxFiles : files.length === 0;

  const addFiles = async (fileList) => {
    if (disabled || !fileList?.length) return;
    setError('');
    setBusy(true);
    try {
      const incoming = Array.from(fileList);
      const slotsLeft = multiple ? maxFiles - files.length : 1;
      const toProcess = incoming.slice(0, Math.max(slotsLeft, 0));
      if (!toProcess.length) {
        setError(`You can upload up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}.`);
        return;
      }
      const uploaded = await processFilesForUpload(toProcess, { maxSizeMB, folder: uploadFolder, projectId });
      const next = multiple ? [...files, ...uploaded] : uploaded.slice(0, 1);
      onChange?.(next);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (index) => {
    onChange?.(files.filter((_, i) => i !== index));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!canAddMore) return;
    addFiles(e.dataTransfer.files);
  };

  const compact = variant === 'compact';

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}

      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => !disabled && !busy && inputRef.current?.click()}
          onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          } ${
            compact ? 'p-3' : 'p-5'
          } ${
            dragging
              ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            disabled={disabled || busy}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-center text-center gap-2'}`}>
            <div className={`${compact ? 'w-9 h-9 text-lg' : 'w-12 h-12 text-2xl'} rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm`}>
              {busy ? '⏳' : '📎'}
            </div>
            <div className={compact ? 'min-w-0 flex-1' : ''}>
              <p className={`font-bold text-slate-700 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {busy ? 'Uploading...' : emptyText}
              </p>
              <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-[11px]'} mt-0.5`}>
                {browseText}
              </p>
            </div>
          </div>
        </div>
      )}

      {hint && <p className="text-[9px] text-slate-400 font-medium">{hint}</p>}
      {error && <p className="text-[10px] font-bold text-rose-600">{error}</p>}

      {files.length > 0 && (
        <div className={`grid gap-2 ${multiple && !compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl"
            >
              {isImageMime(file.type) ? (
                <img src={file.url} alt={file.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                  📄
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-800 truncate">{file.name}</p>
                <p className="text-[9px] text-slate-400">{formatFileSize(file.size)}</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="text-slate-400 hover:text-rose-600 w-7 h-7 rounded-full hover:bg-rose-50 flex items-center justify-center text-sm font-bold"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
