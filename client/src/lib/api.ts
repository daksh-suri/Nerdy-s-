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
// Server-side book providers (Open Library 10s timeout + Google Books 8s timeout)
// may take up to 18s per request. The timeout must be generous enough to let the
// server finish its external API calls before the client gives up.

const FETCH_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1500;

async function fetchWithRetry(url: string): Promise<Response> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return res;
            if (res.status >= 500 && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, BASE_BACKOFF_MS * (attempt + 1)));
                continue;
            }
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, BASE_BACKOFF_MS * (attempt + 1)));
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

