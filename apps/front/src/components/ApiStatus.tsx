import React, { useEffect } from 'react';
import { getApiUrl } from '@/qcm/apiClient';

const PING_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Effectue un health check vers l'API (visible dans l'onglet Network du navigateur).
 * Premier ping au chargement, puis toutes les 10 minutes. N'affiche rien à l'écran.
 */
export default function ApiStatus() {
  useEffect(() => {
    const base = getApiUrl();
    if (!base) return;
    const ping = () => fetch(`${base}/health`).catch(() => {});
    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
