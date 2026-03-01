import React, { useEffect } from 'react';
import { getApiUrl } from '@/qcm/apiClient';

/**
 * Effectue un health check vers l'API (visible dans l'onglet Network du navigateur).
 * N'affiche rien à l'écran.
 */
export default function ApiStatus() {
  useEffect(() => {
    const base = getApiUrl();
    if (!base) return;
    fetch(`${base}/health`).catch(() => {});
  }, []);

  return null;
}
