import { normalizeOpenLibraryBook, normalizeOpenLibraryBookDetail } from '../utils/normalizeBook.js';

const SEARCH_URL = 'https://openlibrary.org/search.json';
const WORKS_URL = 'https://openlibrary.org/works';

const FETCH_TIMEOUT_MS = 10000;

export class OpenLibraryProvider {
    constructor() {
        this.name = 'openlibrary';
    }

    async search(query, maxResults = 20, startIndex = 0) {
        try {
            const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${maxResults}&offset=${startIndex}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

            if (!response.ok) {
                console.warn(`Open Library API error ${response.status} for "${query}"`);
                return [];
            }

            const data = await response.json();
            const docs = data.docs || [];

            return docs.map(normalizeOpenLibraryBook);
        } catch (err) {
            console.error('Open Library search error:', err);
            return [];
        }
    }

    async getById(id) {
        try {
            const response = await fetch(`${WORKS_URL}/${id}.json`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
            if (!response.ok) return null;

            const data = await response.json();
            return await normalizeOpenLibraryBookDetail(data);
        } catch (err) {
            console.error('Open Library detail error:', err);
            return null;
        }
    }
}
