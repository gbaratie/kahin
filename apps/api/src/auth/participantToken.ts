import { signHs256Jwt, verifyHs256Jwt } from './jwtHs256.js';

const PARTICIPANT_TOKEN_TTL_SECONDS = 30 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export { PARTICIPANT_TOKEN_TTL_SECONDS };

export type ParticipantIdentity = {
  oid: string;
  name: string;
  email: string;
};

function authSecret(): string | null {
  return process.env.ADMIN_AUTH_SECRET?.trim() || null;
}

export function signParticipantToken(
  identity: ParticipantIdentity,
  ttlSeconds = PARTICIPANT_TOKEN_TTL_SECONDS
): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signHs256Jwt(secret, {
    typ: 'participant',
    sub: identity.oid,
    name: identity.name,
    email: identity.email,
    exp,
  });
}

export function verifyParticipantToken(
  token: string
): ParticipantIdentity | null {
  const secret = authSecret();
  if (!secret) return null;
  const payload = verifyHs256Jwt(secret, token);
  if (!payload) return null;
  if (payload.typ !== 'participant') return null;
  const oid = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!oid || !name) return null;
  return { oid, name, email };
}

export type OAuthStatePayload = {
  returnPath: string;
  sessionCode: string;
};

export function signOAuthState(payload: OAuthStatePayload): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS;
  return signHs256Jwt(secret, {
    typ: 'ms_oauth_state',
    returnPath: payload.returnPath,
    sessionCode: payload.sessionCode,
    exp,
  });
}

export function verifyOAuthState(token: string): OAuthStatePayload | null {
  const secret = authSecret();
  if (!secret) return null;
  const payload = verifyHs256Jwt(secret, token);
  if (!payload || payload.typ !== 'ms_oauth_state') return null;
  const returnPath =
    typeof payload.returnPath === 'string' ? payload.returnPath : '';
  const sessionCode =
    typeof payload.sessionCode === 'string' ? payload.sessionCode : '';
  if (!returnPath.startsWith('/')) return null;
  return { returnPath, sessionCode };
}
