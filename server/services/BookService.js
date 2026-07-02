import { OpenLibraryProvider } from '../providers/OpenLibraryProvider.js';
import { GoogleBooksProvider } from '../providers/GoogleBooksProvider.js';
import { deduplicateBooks } from '../utils/deduplicateBooks.js';

const SUFFICIENT_RESULTS = 10;
const CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
    const entry = CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        CACHE.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    CACHE.set(key, { data, timestamp: Date.now() });
}

export class BookService {
    constructor() {
        this.openLibrary = new OpenLibraryProvider();
        this.googleBooks = new GoogleBooksProvider();
    }

    async search(query, maxResults = 20, startIndex = 0) {
        const cacheKey = `search:${query}:${maxResults}:${startIndex}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        // Open Library is the primary source - try it first
        const olBooks = await this.openLibrary.search(query, maxResults, startIndex);
        let merged = [...olBooks];

        // Only fall back to Google Books if Open Library returned insufficient results
        // Google Books is unreliable due to rate limiting
        if (olBooks.length < SUFFICIENT_RESULTS) {
            const gbBooks = await this.googleBooks.search(query, maxResults, startIndex);
            if (gbBooks.length > 0) {
                merged = deduplicateBooks([...olBooks, ...gbBooks]);
            }
        }

        const totalItems = Math.max(olBooks.length, merged.length);
        const result = { books: merged, totalItems };
        setCache(cacheKey, result);
        return result;
    }

    async searchTrending(query, maxResults = 15, startIndex = 0) {
        return this.search(query, maxResults, startIndex);
    }

    async getById(id) {
        const cacheKey = `book:${id}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        // Open Library is the primary source - try it first
        const olBook = await this.openLibrary.getById(id);
        if (olBook) {
            setCache(cacheKey, olBook);
            return olBook;
        }

        // Fall back to Google Books
        const gbBook = await this.googleBooks.getById(id);
        if (gbBook) {
            setCache(cacheKey, gbBook);
            return gbBook;
        }

        return null;
    }
}
