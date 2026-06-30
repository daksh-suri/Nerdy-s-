import express from 'express';
import * as bookProvider from '../services/bookProvider.js';

const router = express.Router();

// ─── In-memory cache ────────────────────────────────────────────────────────
const CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

// ─── Normalized → frontend Book mapper ──────────────────────────────────────

function toFrontendBook(nb) {
    return {
        id: nb.id,
        title: nb.title,
        author: nb.authors.join(', '),
        description: nb.description || 'No description available.',
        coverUrl: nb.thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1000&auto=format&fit=crop',
        rating: nb.averageRating || 0,
        publishedDate: nb.publishedDate,
        pages: nb.pageCount || 0,
        genre: nb.categories,
    };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/books/search?q=...&maxResults=40&startIndex=0
router.get('/search', async (req, res) => {
    try {
        const { q, maxResults = 40, startIndex = 0 } = req.query;
        if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

        const cacheKey = `search:${q}:${startIndex}:${maxResults}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const result = await bookProvider.search(q, Number(startIndex), Number(maxResults));
        const books = result.books.map(toFrontendBook);
        const response = { books, totalItems: result.totalItems };

        setCache(cacheKey, response);
        res.json(response);
    } catch (err) {
        console.error('Books search error:', err);
        res.json({ books: [], totalItems: 0 });
    }
});

// GET /api/books/trending?query=...&maxResults=40&startIndex=0
router.get('/trending', async (req, res) => {
    try {
        const { query = 'bestselling fiction', maxResults = 40, startIndex = 0 } = req.query;

        const cacheKey = `trending:${query}:${startIndex}:${maxResults}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const result = await bookProvider.search(query, Number(startIndex), Number(maxResults));
        const books = result.books.map(toFrontendBook);
        const response = { books, totalItems: result.totalItems };

        setCache(cacheKey, response);
        res.json(response);
    } catch (err) {
        console.error('Trending books error:', err);
        res.json({ books: [], totalItems: 0 });
    }
});

// GET /api/books/:id — fetch a single book's details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `book:${id}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const nb = await bookProvider.getById(id);
        if (!nb) return res.status(404).json({ error: 'Book not found' });

        const book = toFrontendBook(nb);
        setCache(cacheKey, book);
        res.json(book);
    } catch (err) {
        console.error('Book detail error:', err);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

export default router;
