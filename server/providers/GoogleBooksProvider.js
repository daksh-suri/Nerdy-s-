import { normalizeGoogleBook } from '../utils/normalizeBook.js';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

const FETCH_TIMEOUT_MS = 8000;

export class GoogleBooksProvider {
    constructor() {
        this.name = 'googlebooks';
    }

    async search(query, maxResults = 20, startIndex = 0) {
        try {
            const keyParam = API_KEY ? `&key=${API_KEY}` : '';
            const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}&orderBy=relevance&langRestrict=en${keyParam}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

            if (!response.ok) {
                console.warn(`Google Books API error ${response.status} for "${query}"`);
                return [];
            }

            const data = await response.json();
            const items = data.items || [];

            return items.map(normalizeGoogleBook);
        } catch (err) {
            console.error('Google Books search error:', err);
            return [];
        }
    }

    async getById(id) {
        try {
            const keyParam = API_KEY ? `&key=${API_KEY}` : '';
            const url = `${GOOGLE_BOOKS_URL}/${id}${keyParam}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

            if (!response.ok) {
                console.warn(`Google Books detail error ${response.status} for "${id}"`);
                return null;
            }

            const data = await response.json();
            return normalizeGoogleBook(data);
        } catch (err) {
            console.error('Google Books detail error:', err);
            return null;
        }
    }
}
