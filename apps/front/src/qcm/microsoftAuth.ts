import { getApiUrl } from './apiClient';

const MICROSOFT_TOKEN_KEY = 'kahin_microsoft_token';

export type MicrosoftAuthStatus = {
  enabled: boolean;
  required: boolean;
};

export type MicrosoftIdentity = {
  name: string;
  email: string;
  oid: string;
};

export function getMicrosoftToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(MICROSOFT_TOKEN_KEY);
}

export function setMicrosoftToken(token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MICROSOFT_TOKEN_KEY, token);
}

export function clearMicrosoftToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(MICROSOFT_TOKEN_KEY);
}

/** Décode le payload JWT sans vérifier la signature (vérif côté API). */
export function readMicrosoftIdentity(
  token: string | null = getMicrosoftToken()
): MicrosoftIdentity | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as {
      typ?: string;
      name?: string;
      email?: string;
      sub?: string;
      exp?: number;
    };
    if (payload.typ !== 'participant') return null;
    if (
      payload.exp != null &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      clearMicrosoftToken();
      return null;
    }
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) return null;
    return {
      name,
      email: typeof payload.email === 'string' ? payload.email : '',
      oid: typeof payload.sub === 'string' ? payload.sub : '',
    };
  } catch {
    return null;
  }
}

export async function fetchMicrosoftAuthStatus(): Promise<MicrosoftAuthStatus> {
  const base = getApiUrl();
  if (!base) return { enabled: false, required: false };
  try {
    const res = await fetch(`${base}/api/auth/microsoft/status`);
    if (!res.ok) return { enabled: false, required: false };
    const data = (await res.json()) as {
      enabled?: boolean;
      required?: boolean;
    };
    return {
      enabled: Boolean(data.enabled),
      required: Boolean(data.required),
    };
  } catch {
    return { enabled: false, required: false };
  }
}

/** Redirige vers l’API qui enchaîne sur Microsoft Entra ID. */
export function startMicrosoftLogin(opts: {
  sessionCode?: string;
  returnPath?: string;
}) {
  const base = getApiUrl();
  if (!base || typeof window === 'undefined') return;
  const returnPath = opts.returnPath ?? (window.location.pathname || '/');
  const url = new URL(`${base}/api/auth/microsoft`);
  url.searchParams.set('returnPath', returnPath);
  if (opts.sessionCode) {
    url.searchParams.set('sessionCode', opts.sessionCode.trim().toUpperCase());
  }
  window.location.href = url.toString();
}
