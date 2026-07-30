import {
  getMicrosoftAuthConfig,
  microsoftAuthorizeUrl,
  microsoftTokenUrl,
  type MicrosoftAuthConfig,
} from './microsoftConfig.js';
import {
  signOAuthState,
  signParticipantToken,
  type ParticipantIdentity,
} from './participantToken.js';

type IdTokenClaims = {
  oid?: string;
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
};

function decodeJwtPayload(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as IdTokenClaims;
  } catch {
    return null;
  }
}

function identityFromClaims(claims: IdTokenClaims): ParticipantIdentity | null {
  const oid = (claims.oid || claims.sub || '').trim();
  const email = (claims.email || claims.preferred_username || '').trim();
  let name = (claims.name || '').trim();
  if (!name) {
    const given = (claims.given_name || '').trim();
    const family = (claims.family_name || '').trim();
    name = [given, family].filter(Boolean).join(' ').trim();
  }
  if (!name && email) {
    name = email.split('@')[0] || email;
  }
  if (!oid || !name) return null;
  return { oid, name, email };
}

/** returnPath = chemin absolu sur le front (ex. /kahin/ ou /kahin/join). */
export function buildMicrosoftAuthorizeRedirect(opts: {
  returnPath: string;
  sessionCode: string;
}): string | null {
  const cfg = getMicrosoftAuthConfig();
  if (!cfg) return null;
  if (!process.env.ADMIN_AUTH_SECRET?.trim()) return null;
  const state = signOAuthState({
    returnPath: opts.returnPath,
    sessionCode: opts.sessionCode,
  });
  if (!state) return null;
  const url = new URL(microsoftAuthorizeUrl(cfg.tenantId));
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

async function exchangeCodeForIdToken(
  cfg: MicrosoftAuthConfig,
  code: string
): Promise<string> {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
    scope: 'openid profile email',
  });
  const res = await fetch(microsoftTokenUrl(cfg.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.id_token) {
    const detail = data.error_description || data.error || res.statusText;
    throw new Error(`Microsoft token exchange failed: ${detail}`);
  }
  return data.id_token;
}

export async function completeMicrosoftLogin(code: string): Promise<{
  token: string;
  identity: ParticipantIdentity;
}> {
  const cfg = getMicrosoftAuthConfig();
  if (!cfg) {
    throw new Error('Microsoft authentication not configured on server');
  }
  const idToken = await exchangeCodeForIdToken(cfg, code);
  const claims = decodeJwtPayload(idToken);
  if (!claims) {
    throw new Error('Invalid Microsoft ID token');
  }
  const identity = identityFromClaims(claims);
  if (!identity) {
    throw new Error('Microsoft account has no usable display name');
  }
  const token = signParticipantToken(identity);
  if (!token) {
    throw new Error('Admin authentication not configured on server');
  }
  return { token, identity };
}

/**
 * Construit l’URL de retour front.
 * FRONT_ORIGIN = origine publique du site (ex. https://user.github.io ou http://localhost:3000),
 * returnPath = pathname (+ basePath), ex. /kahin/ ou /.
 */
export function buildFrontReturnUrl(opts: {
  returnPath: string;
  sessionCode: string;
  token?: string;
  error?: string;
}): string {
  const cfg = getMicrosoftAuthConfig();
  const origin = (cfg?.frontOrigin ?? 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
  let path = opts.returnPath.startsWith('/') ? opts.returnPath : '/';
  // Empêcher open-redirect : pas de schéma / host dans returnPath
  if (path.includes('://') || path.includes('\\')) {
    path = '/';
  }
  const url = new URL(path, `${origin}/`);
  if (url.origin !== new URL(origin).origin) {
    return `${origin}/`;
  }
  if (opts.sessionCode) {
    url.searchParams.set('code', opts.sessionCode);
  }
  if (opts.token) {
    url.searchParams.set('microsoft_token', opts.token);
  }
  if (opts.error) {
    url.searchParams.set('microsoft_error', opts.error);
  }
  return url.toString();
}
