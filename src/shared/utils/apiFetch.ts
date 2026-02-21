/**
 * apiFetch — wrapper de fetch que inyecta automáticamente el JWT
 * en el header Authorization de cada request a /api/*.
 *
 * Uso: igual que fetch nativo, pero autenticado automáticamente.
 *   const data = await apiFetch('/api/transactions?userId=soberano').then(r => r.json())
 *   await apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify({...}) })
 */

const TOKEN_KEY = 'sistemam_token';

export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem(TOKEN_KEY);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
};

export default apiFetch;
