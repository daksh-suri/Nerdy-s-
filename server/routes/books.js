import express from 'express';

const router = express.Router();

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const CACHE = new Map(); // Simple in-memory cache
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

// GET /api/books/search?q=...&maxResults=20
router.get('/search', async (req, res) => {
    try {
        const { q, maxResults = 20 } = req.query;
        if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

        const cacheKey = `search:${q}:${maxResults}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(q)}&maxResults=${maxResults}&orderBy=relevance&langRestrict=en${API_KEY ? `&key=${API_KEY}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Google Books API error ${response.status} for query "${q}". Using fallback.`);
            const fallback = getFallbackBooks(q, maxResults);
            return res.json(fallback);
        }

        const data = await response.json();
        const books = (data.items || []).map(formatBook);

        if (books.length === 0) {
            return res.json(getFallbackBooks(q, maxResults));
        }

        setCache(cacheKey, books);
        res.json(books);
    } catch (err) {
        console.error('Books search error:', err);
        res.json(getFallbackBooks(req.query.q, req.query.maxResults || 20));
    }
});

// GET /api/books/trending/:genre?query=...
router.get('/trending', async (req, res) => {
    try {
        const { query = 'bestselling fiction', maxResults = 15 } = req.query;

        const cacheKey = `trending:${query}:${maxResults}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&orderBy=relevance&langRestrict=en${API_KEY ? `&key=${API_KEY}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Google Books API trending error ${response.status}. Using fallback.`);
            return res.json(getFallbackBooks(query, maxResults));
        }

        const data = await response.json();
        const books = (data.items || []).map(formatBook);

        if (books.length === 0) {
            return res.json(getFallbackBooks(query, maxResults));
        }

        setCache(cacheKey, books);
        res.json(books);
    } catch (err) {
        console.error('Trending books error:', err);
        res.json(getFallbackBooks(req.query.query, req.query.maxResults || 15));
    }
});

// GET /api/books/:id — fetch a single book's details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `book:${id}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `${GOOGLE_BOOKS_URL}/${id}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google Books API error: ${response.status}`);

        const data = await response.json();
        const book = formatBook(data);
        setCache(cacheKey, book);
        res.json(book);
    } catch (err) {
        console.error('Book detail error:', err);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

function formatBook(item) {
    const v = item.volumeInfo || {};
    return {
        id: item.id,
        title: v.title || 'Unknown Title',
        author: v.authors ? v.authors.join(', ') : 'Unknown Author',
        description: v.description || 'No description available.',
        coverUrl: v.imageLinks?.thumbnail?.replace('http:', 'https:') || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1000&auto=format&fit=crop',
        rating: v.averageRating || 0,
        publishedDate: v.publishedDate || 'Unknown',
        pages: v.pageCount || 0,
        genre: v.categories || [],
    };
}

// Fallback high-quality books in case API is down/rate-limited
function getFallbackBooks(query = '', maxResults = 20) {
    const getGoogleCover = (id) => `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

    const fallbacks = [
        { id: 'hlb_sM1AN0gC', title: 'The Hunger Games', author: 'Suzanne Collins', description: 'A televised fight to the death.', coverUrl: getGoogleCover('hlb_sM1AN0gC'), rating: 4.3, publishedDate: '2008', pages: 374, genre: ['Fiction', 'YA'] },
        { id: 'icKmd-tlvPMC', title: 'Journey to the Center of the Earth', author: 'Jules Verne', description: 'An expedition to the core.', coverUrl: getGoogleCover('icKmd-tlvPMC'), rating: 4.5, publishedDate: '1864', pages: 240, genre: ['Fiction', 'Classic'] },
        { id: 'A-AS46wG0p8C', title: 'The Da Vinci Code', author: 'Dan Brown', description: 'A religious conspiracy.', coverUrl: getGoogleCover('A-AS46wG0p8C'), rating: 4.5, publishedDate: '2003', pages: 454, genre: ['Thriller', 'Mystery'] },
        { id: 'kPmLDQAAQBAJ', title: 'The Martian', author: 'Andy Weir', description: 'Stranded on Mars.', coverUrl: getGoogleCover('kPmLDQAAQBAJ'), rating: 4.7, publishedDate: '2011', pages: 369, genre: ['Sci-Fi', 'Adventure'] },
        { id: 'GZAoAQAAIAAJ', title: 'Harry Potter and the Deathly Hallows', author: 'J.K. Rowling', description: 'The final battle.', coverUrl: getGoogleCover('GZAoAQAAIAAJ'), rating: 4.9, publishedDate: '2007', pages: 759, genre: ['Fantasy', 'YA'] },
        { id: 'SxPUCwAAQBAJ', title: 'Me Before You', author: 'Jojo Moyes', description: 'A love story.', coverUrl: getGoogleCover('SxPUCwAAQBAJ'), rating: 4.5, publishedDate: '2012', pages: 369, genre: ['Romance'] },
        { id: 'd2WZDgAAQBAJ', title: 'Einstein: His Life and Universe', author: 'Walter Isaacson', description: 'Life of the physicist.', coverUrl: getGoogleCover('d2WZDgAAQBAJ'), rating: 4.8, publishedDate: '2007', pages: 715, genre: ['Biography'] },
        { id: 'O1MInVXd_aoC', title: 'The Power of Habit', author: 'Charles Duhigg', description: 'Why we do what we do.', coverUrl: getGoogleCover('O1MInVXd_aoC'), rating: 4.6, publishedDate: '2012', pages: 371, genre: ['Self-Help'] },
        { id: '6WGhDwAAQBAJ', title: 'Think and Grow Rich', author: 'Napoleon Hill', description: 'Success principles.', coverUrl: getGoogleCover('6WGhDwAAQBAJ'), rating: 4.7, publishedDate: '1937', pages: 384, genre: ['Self-Help'] },
        { id: 'EvqJCGeqKhsC', title: 'Pride and Prejudice', author: 'Jane Austen', description: 'Classic romance.', coverUrl: getGoogleCover('EvqJCGeqKhsC'), rating: 4.7, publishedDate: '1813', pages: 432, genre: ['Fiction', 'Classic'] },
        { id: 'P9cHEAAAQBAJ', title: 'The Silent Patient', author: 'Alex Michaelides', description: 'A woman\'s act of violence against her husband.', coverUrl: getGoogleCover('P9cHEAAAQBAJ'), rating: 4.7, publishedDate: '2019', pages: 336, genre: ['Thriller', 'Mystery'] },
        { id: 'S0_XAwAAQBAJ', title: 'Project Hail Mary', author: 'Andy Weir', description: 'Lone astronaut mission.', coverUrl: getGoogleCover('S0_XAwAAQBAJ'), rating: 4.9, publishedDate: '2021', pages: 496, genre: ['Sci-Fi'] },
    ];

    const lowerQ = query.toLowerCase();
    let results = fallbacks.filter(b =>
        b.title.toLowerCase().includes(lowerQ) ||
        b.author.toLowerCase().includes(lowerQ) ||
        b.genre.some(g => g.toLowerCase().includes(lowerQ))
    );

    if (results.length === 0) results = fallbacks;
    return results.slice(0, maxResults);
}

export default router;
