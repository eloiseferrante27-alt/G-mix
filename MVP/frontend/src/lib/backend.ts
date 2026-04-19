export function isDjango(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_TYPE === 'django';
}

export async function djangoFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}/api/${path}`;

  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}