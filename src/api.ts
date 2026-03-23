/**
 * API base URL — configurable via VITE_API_URL env var.
 *
 * Defaults to '' (same origin), which works when:
 *   - Running locally (Express serves both frontend + API)
 *   - Running dev server (Vite proxies /api to Express)
 *
 * Set VITE_API_URL=http://192.168.1.x:3737 in .env to point
 * a Vercel-hosted frontend at the local MonsterLinux backend.
 */
export const API_BASE: string = import.meta.env.VITE_API_URL || '';
