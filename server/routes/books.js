import express from 'express';
import { BookService } from '../services/BookService.js';
import { toApiFormat } from '../utils/normalizeBook.js';

const router = express.Router();
const bookService = new BookService();

// GET /api/books/search?q=...&maxResults=20&startIndex=0
router.get('/search', async (req, res) => {
    try {
        const { q, maxResults = 20, startIndex = 0 } = req.query;
        if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

        const result = await bookService.search(q, Number(maxResults), Number(startIndex));
        res.json({
            books: result.books.map(toApiFormat),
            totalItems: result.totalItems,
        });
    } catch (err) {
        console.error('Books search error:', err);
        res.json({ books: [], totalItems: 0 });
    }
});

// GET /api/books/trending?query=...&maxResults=15&startIndex=0
router.get('/trending', async (req, res) => {
    try {
        const { query = 'bestselling fiction', maxResults = 15, startIndex = 0 } = req.query;

        const result = await bookService.searchTrending(query, Number(maxResults), Number(startIndex));
        res.json({
            books: result.books.map(toApiFormat),
            totalItems: result.totalItems,
        });
    } catch (err) {
        console.error('Trending books error:', err);
        res.json({ books: [], totalItems: 0 });
    }
});

// GET /api/books/:id — fetch a single book's details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const book = await bookService.getById(id);

        if (!book) {
            return res.status(500).json({ error: 'Failed to fetch book' });
        }

        res.json(toApiFormat(book));
    } catch (err) {
        console.error('Book detail error:', err);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

export default router;
