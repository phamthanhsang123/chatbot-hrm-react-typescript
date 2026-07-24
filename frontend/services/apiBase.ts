const RENDER_API_BASE = 'https://hrm-backend-api-hzgh.onrender.com';

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();

export const API_BASE = configuredApiBase || RENDER_API_BASE;
