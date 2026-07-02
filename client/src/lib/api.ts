const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Book {
    id: string;
    title: string;
    author: string;
    description: string;
    coverUrl: string;
    rating: number;
    publishedDate: string;
    pages: number;
    genre: string[];
}

// Backend API helper (for auth, logs, favorites etc.)
export const api = {
    get: async (endpoint: string) => {
        const token = localStorage.getItem('nerdys_token');
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
        if (!res.ok) throw new Error(await res.text());
        return { data: await res.json() };
    },
    post: async (endpoint: string, body: unknown) => {
        const token = localStorage.getItem('nerdys_token');
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return { data: await res.json() };
    }
};

// ─── Retry helper for book API calls ──────────────────────────────────────────
// Retries on network / timeout errors so the Trending + Home pages auto-recover
// once Render finishes its cold start.

const FETCH_TIMEOUT_MS = 5000;

async function fetchWithRetry(url: string, retries = 1, backoffMs = 1500): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return res;
            if (res.status >= 500 && i < retries) {
                await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
                continue;
            }
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (i < retries) {
                await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
                continue;
            }
            throw err;
        }
    }
    return fetch(url);
}

// ─── Book API calls — all proxied through our backend ───────────────────────
// This avoids college/corporate networks that block googleapis.com directly.

export async function searchBooks(query: string, startIndex = 0, maxResults = 20): Promise<{ books: Book[]; totalItems: number }> {
    if (!query) return { books: [], totalItems: 0 };
    const url = `${BASE_URL}/api/books/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}`;
    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) {
            console.warn(`[api] searchBooks 404/error for "${query}"`, res.status);
            return { books: [], totalItems: 0 };
        }
        const data = await res.json();
        console.log(`[api] searchBooks "${query}" → ${data.books?.length ?? 0} results`);
        return data;
    } catch (error) {
        console.error(`[api] searchBooks "${query}" failed — server unreachable?`, error);
        return { books: [], totalItems: 0 };
    }
}

export async function fetchTrendingBooks(query = 'bestselling fiction', maxResults = 20, startIndex = 0): Promise<{ books: Book[]; totalItems: number }> {
    const url = `${BASE_URL}/api/books/trending?query=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}`;
    try {
        const res = await fetchWithRetry(url);
        if (!res.ok) {
            console.warn(`[api] fetchTrendingBooks 404/error for "${query}"`, res.status);
            return { books: [], totalItems: 0 };
        }
        const data = await res.json();
        console.log(`[api] fetchTrendingBooks "${query}" → ${data.books?.length ?? 0} results`);
        return data;
    } catch (e) {
        console.error(`[api] fetchTrendingBooks "${query}" failed — server unreachable?`, e);
        return { books: [], totalItems: 0 };
    }
}

export async function getBookDetails(id: string): Promise<Book | null> {
    try {
        const res = await fetchWithRetry(`${BASE_URL}/api/books/${id}`);
        if (!res.ok) {
            console.warn(`[api] getBookDetails 404 for "${id}"`, res.status);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error(`[api] getBookDetails "${id}" failed — server unreachable?`, error);
        return null;
    }
}

// Alias for legacy calls
export const fetchBookDetails = getBookDetails;
