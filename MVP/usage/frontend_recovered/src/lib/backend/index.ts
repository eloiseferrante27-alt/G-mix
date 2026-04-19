/**
 * Backend selector — set BACKEND_TYPE=django in .env.local to switch away from Supabase.
 *
 * Supabase (default): Next.js API routes use supabase-js directly.
 * Django:             Next.js API routes proxy calls to http://DJANGO_API_URL (default :8000).
 */

export type BackendType = 'supabase' | 'django'

export const BACKEND_TYPE: BackendType =
  (process.env.BACKEND_TYPE as BackendType) ?? 'supabase'

export const DJANGO_API_URL =
  process.env.DJANGO_API_URL ?? 'http://localhost:8000'

export function isDjango(): boolean {
  return BACKEND_TYPE === 'django'
}

/** Build a full Django API URL */
export function djangoUrl(path: string): string {
  return `${DJANGO_API_URL}/api/${path.replace(/^\//, '')}`
}

/**
 * Authenticated fetch towards the Django backend.
 * The Django access token is stored in the request cookie "django_token".
 */
export async function djangoFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const { token, ...rest } = options
  return fetch(djangoUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  })
}
