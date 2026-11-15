'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, RefreshCw, X } from 'lucide-react';

export const IMAGE_URL_ONLY_RE =
  /^(?:https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg)|\/question-images\/\S+|\/qimg\/\S+|\/simg\/\S+)$/i;

export function isImageUrlString(val?: string | null): boolean {
  if (!val) return false;
  return IMAGE_URL_ONLY_RE.test(val.trim());
}

export function ImageLightbox({
  src,
  alt,
  className = 'max-h-72 w-auto rounded-xl border border-line bg-white',
  selectOnImageClick = false,
}: {
  src: string;
  alt: string;
  className?: string;
  selectOnImageClick?: boolean;
}) {
  const [zoom, setZoom] = useState(false);
  const [errored, setErrored] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setErrored(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const trimmed = src.trim();
  const resolvedSrc =
    basePath && trimmed.startsWith('/') && !trimmed.startsWith(`${basePath}/`)
      ? `${basePath}${trimmed}`
      : trimmed;
  const effectiveSrc =
    retryCount > 0 ? `${resolvedSrc}${resolvedSrc.includes('?') ? '&' : '?'}r=${retryCount}` : resolvedSrc;

  if (errored) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setErrored(false);
          setRetryCount((c) => c + 1);
        }}
        className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-bg2/60 px-4 py-3 text-xs font-semibold text-muted hover:text-brand"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>โหลดรูปไม่สำเร็จ แตะเพื่อลองใหม่</span>
      </button>
    );
  }

  return (
    <>
      <div className="relative inline-block">
        <img
          src={effectiveSrc}
          alt={alt}
          onError={() => setErrored(true)}
          onClick={(e) => {
            if (selectOnImageClick) return;
            e.stopPropagation();
            setZoom(true);
          }}
          className={`${className} ${
            selectOnImageClick ? 'cursor-pointer' : 'cursor-zoom-in'
          } transition-opacity hover:opacity-95`}
        />
        <button
          type="button"
          aria-label="ขยายรูปภาพ"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(true);
          }}
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm hover:bg-black/85 transition"
          title="แตะเพื่อขยายรูปภาพ"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(false);
          }}
          className="fixed inset-0 z-[90] flex cursor-zoom-out items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <img
            src={effectiveSrc}
            alt={alt}
            className="max-h-[92vh] max-w-[95vw] rounded-xl bg-white shadow-2xl"
          />
          <button
            type="button"
            aria-label="ปิดรูป"
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
