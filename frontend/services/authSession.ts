export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

export function getStoredToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('hrm_token') || '';
}

export function getJwtPayload(): JwtPayload | null {
  const token = getStoredToken();
  const [, payload] = token.split('.');

  if (!payload) return null;

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getSessionEmail() {
  const payload = getJwtPayload();
  const claimName = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
  const value = payload?.email || payload?.sub || payload?.name || payload?.[claimName];
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
