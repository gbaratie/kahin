export type MicrosoftAuthConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  /** Origine du front pour le retour après login, ex. https://user.github.io ou http://localhost:3000 */
  frontOrigin: string;
  /** Si true, rejoindre une session exige un jeton Microsoft valide. */
  required: boolean;
};

export function getMicrosoftAuthConfig(): MicrosoftAuthConfig | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI?.trim();
  const frontOrigin = process.env.FRONT_ORIGIN?.trim()?.replace(/\/$/, '');
  if (!clientId || !clientSecret || !tenantId || !redirectUri || !frontOrigin) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    frontOrigin,
    required: process.env.MICROSOFT_AUTH_REQUIRED === 'true',
  };
}

export function isMicrosoftAuthConfigured(): boolean {
  return getMicrosoftAuthConfig() != null;
}

export function isMicrosoftAuthRequired(): boolean {
  const cfg = getMicrosoftAuthConfig();
  return Boolean(cfg?.required);
}

export function microsoftAuthorizeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
}

export function microsoftTokenUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}
