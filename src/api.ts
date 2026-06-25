const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'Erro de comunicação com a API');
  }
  return response.json() as Promise<T>;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${baseURL}${path}`);
    return handleResponse<T>(response);
  },

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },
};
