'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, RefreshCw, X } from 'lucide-react';

export function ImageLightbox({
  src,
  alt,
  className = 'max-h-72 w-auto rounded-xl border border-line bg-white',
}: {
  src: string;
  alt: string;
  className?: string;
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
  const resolvedSrc =
    basePath && src.startsWith('/') && !src.startsWith(`${basePath}/`) ? `${basePath}${src}` : src;
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
            e.stopPropagation();
            setZoom(true);
          }}
          className={`${className} cursor-zoom-in transition-opacity hover:opacity-95`}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
          <Maximize2 className="h-3 w-3" />
        </span>
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

