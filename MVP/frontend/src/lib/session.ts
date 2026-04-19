import { cookies } from 'next/headers';
import { SessionPayload } from '@/types';

const SESSION_COOKIE = 'gmix_session';

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie) {
    return null;
  }

  try {
    // In production, this would verify the session signature
    // For now, we parse the cookie value directly
    const payload = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (new Date(payload.expiresAt) < new Date()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, 'expiresAt'>) {
  const cookieStore = await cookies();
  
  const sessionPayload: SessionPayload = {
    ...payload,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionPayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return sessionPayload;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const deleteSession = clearSession;