/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Evento } from "./types";

// A URL base da API é obtida das variáveis de ambiente do Vite.
// O fallback é para o ambiente de desenvolvimento local padrão.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

/**
 * Função genérica para realizar chamadas fetch, tratando erros e JSON.
 * @param endpoint O caminho do endpoint (ex: '/motoristas')
 * @param options Opções do fetch (method, headers, body, etc.)
 * @returns A resposta da API em JSON.
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    console.error(`Erro de REDE para ${url}:`, networkError);
    throw new Error('Falha de comunicação com o servidor. Verifique a conexão e se o backend está rodando.');
  }

  if (!response.ok) {
    // Tenta extrair uma mensagem de erro do corpo da resposta
    const errorData = await response.json().catch(() => null); // Evita erro se o corpo não for JSON
    const errorMessage = errorData?.message || `Erro na API: ${response.status} ${response.statusText}`;
    console.error(`Erro de API para ${url}:`, errorMessage);
    throw new Error(errorMessage);
  }

  // Retorna null se a resposta for 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint:string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  syncEventos: (payload: any[]) => api.post<any[]>('/eventos/sync', payload),
};