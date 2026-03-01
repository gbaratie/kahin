import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { getApiUrl, isApiMode } from '@/qcm/apiClient';

type Status = 'idle' | 'ok' | 'error';

export default function ApiStatus() {
  const [health, setHealth] = useState<Status>('idle');

  useEffect(() => {
    const base = getApiUrl();
    if (!base) return;
    let cancelled = false;
    fetch(`${base}/health`)
      .then((res) => (res.ok ? 'ok' : 'error'))
      .catch(() => 'error')
      .then((s) => {
        if (!cancelled) setHealth(s as Status);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isApiMode()) {
    return (
      <Typography variant="caption" color="text.secondary">
        Mode local (définir NEXT_PUBLIC_API_URL pour rejoindre une session)
      </Typography>
    );
  }

  return (
    <Typography variant="caption" color="text.secondary">
      API {getApiUrl()}
      {health === 'ok' && ' — OK'}
      {health === 'error' && ' — Injoignable (lancez l’API sur le port 4000)'}
    </Typography>
  );
}
