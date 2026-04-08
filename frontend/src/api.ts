/**
 * Cliente HTTP para el plugin.
 * Las cookies de sesión se envían automáticamente (credentials: 'include').
 *
 * Uso:
 *   import { api } from './api';
 *
 *   const user = await api.get<User>('/auth/me');
 *   const items = await api.get<Item[]>('/p/my-plugin/items');
 *   await api.post('/p/my-plugin/items', { name: 'test' });
 */

const BASE = '/api/v1';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token expirado — redirigir al login
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)  => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  put:    <T>(path: string, body?: unknown)  => request<T>('PUT',    path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
};
