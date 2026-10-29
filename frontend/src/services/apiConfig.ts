/**
 * Centralized API Base URL resolver.
 * Priority:
 * 1. VITE_API_URL environment variable (configured in Vercel for production)
 * 2. Origin if served on port 8000 (same origin)
 * 3. Fallback to http://localhost:8000 for local development
 */
export const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    const envUrl = String(import.meta.env.VITE_API_URL).trim();
    if (envUrl) {
      return envUrl.replace(/\/+$/, '');
    }
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000') return '';
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
};

