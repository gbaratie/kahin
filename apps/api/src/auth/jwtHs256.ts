import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (buf: Buffer) => buf.toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

export function signHs256Jwt(
  secret: string,
  payload: Record<string, unknown>
): string {
  const header = b64url(
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${b64url(sig)}`;
}

export function verifyHs256Jwt(
  secret: string,
  token: string
): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  let sig: Buffer;
  try {
    sig = fromB64url(s);
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(sig, expected)) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(fromB64url(p).toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
  const exp = payload.exp;
  if (exp == null || typeof exp !== 'number') return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
