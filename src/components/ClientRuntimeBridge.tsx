'use client';

import { useEffect } from 'react';
import { installClientApiBridge } from '@/lib/client-api-bridge';

if (typeof window !== 'undefined') {
  installClientApiBridge();
}

export function ClientRuntimeBridge() {
  useEffect(() => {
    installClientApiBridge();
  }, []);

  return null;
}
