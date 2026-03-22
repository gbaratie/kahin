import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

const b64url = (buf: Buffer) => buf.toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

export { TOKEN_TTL_SECONDS };

function hashUtf8(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function safeEqualUtf8(a: string, b: string): boolean {
  const ha = hashUtf8(a);
  const hb = hashUtf8(b);
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(ha, hb);
}

export function signAdminToken(secret: string, ttlSeconds: number): string {
  const header = b64url(
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(Buffer.from(JSON.stringify({ sub: 'admin', exp })));
  const sig = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest();
  return `${header}.${payload}.${b64url(sig)}`;
}

export function verifyAdminToken(secret: string, token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [h, p, s] = parts;
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  let sig: Buffer;
  try {
    sig = fromB64url(s);
  } catch {
    return false;
  }
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(sig, expected)) return false;
  let payload: { exp?: number };
  try {
    payload = JSON.parse(fromB64url(p).toString('utf8'));
  } catch {
    return false;
  }
  if (payload.exp == null || typeof payload.exp !== 'number') return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}
