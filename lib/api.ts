import { getAuthToken, clearAuth } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/ecommerce-api';

export async function apiRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  requiresAuth: boolean = false
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth || token) {
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
  }

  const res = await fetch(BASE_URL + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage = data.error || ('HTTP ' + res.status + ': Request failed');
    if (requiresAuth && (res.status === 401 || /invalid or expired token|unauthorized/i.test(errorMessage))) {
      clearAuth();
    }
    throw new Error(errorMessage);
  }

  return data as T;
}
