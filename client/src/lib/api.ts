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

async function fetchWithRetry(url: string, retries = 2, backoffMs = 3000): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return res;
            // On server error (5xx), retry
            if (res.status >= 500 && i < retries) {
                await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
                continue;
            }
            return res; // 4xx → don't retry
        } catch (err) {
            if (i < retries) {
                await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
                continue;
            }
            throw err;
        }
    }
    return fetch(url); // fallback (should not reach here)
}

// ─── Book API calls — all proxied through our backend ───────────────────────
// This avoids college/corporate networks that block googleapis.com directly.

export async function searchBooks(query: string, startIndex = 0): Promise<{ books: Book[]; totalItems: number }> {
    if (!query) return { books: [], totalItems: 0 };
    try {
        const res = await fetchWithRetry(`${BASE_URL}/api/books/search?q=${encodeURIComponent(query)}&maxResults=40&startIndex=${startIndex}`);
        if (!res.ok) return { books: [], totalItems: 0 };
        return await res.json();
    } catch (error) {
        console.error('Error searching books:', error);
        return { books: [], totalItems: 0 };
    }
}

export async function fetchTrendingBooks(query = 'bestselling fiction', maxResults = 40, startIndex = 0): Promise<{ books: Book[]; totalItems: number }> {
    try {
        const res = await fetchWithRetry(`${BASE_URL}/api/books/trending?query=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}`);
        if (!res.ok) return { books: [], totalItems: 0 };
        return await res.json();
    } catch (e) {
        console.error(e);
        return { books: [], totalItems: 0 };
    }
}

export async function getBookDetails(id: string): Promise<Book | null> {
    try {
        const res = await fetchWithRetry(`${BASE_URL}/api/books/${id}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error('Error fetching book details:', error);
        return null;
    }
}

// Alias for legacy calls
export const fetchBookDetails = getBookDetails;
