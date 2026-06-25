/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.message || `Erro na API: ${response.status}`;
    throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
