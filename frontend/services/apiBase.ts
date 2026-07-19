const LOCAL_API_BASE = 'http://localhost:5297';
const REMOTE_API_BASE = 'https://hrm-backend-api-hzgh.onrender.com';

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const isLocalBrowser =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = configuredApiBase || (isLocalBrowser ? LOCAL_API_BASE : REMOTE_API_BASE);
