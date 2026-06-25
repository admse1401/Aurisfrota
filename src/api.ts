/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function request(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Falha na requisição à API: ${response.statusText}`);
    }

    // Retorna um objeto vazio para respostas 204 No Content
    if (response.status === 204) {
      return {};
    }

    return response.json();
  } catch (error) {
    console.error(`Erro de rede ou API em ${endpoint}:`, error);
    // Lança o erro para que a camada de dados (db.ts) possa tratá-lo (ex: modo offline)
    throw error;
  }
}

export const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
  
  // Endpoint específico de sincronização
  syncEventos: (eventos: any[]) => {
    return api.post('/eventos/sync', { eventos });
  }
};