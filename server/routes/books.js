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
        // Fiction
        { id: 'V79aAAAAIAAJ', title: 'To Kill a Mockingbird', author: 'Harper Lee', description: 'Racial injustice in the South.', coverUrl: getGoogleCover('V79aAAAAIAAJ'), rating: 4.8, publishedDate: '1960', pages: 281, genre: ['Fiction', 'Classic'] },
        { id: '55A8AAAAIAAJ', title: '1984', author: 'George Orwell', description: 'Dystopian future.', coverUrl: getGoogleCover('55A8AAAAIAAJ'), rating: 4.7, publishedDate: '1949', pages: 328, genre: ['Fiction', 'Classic'] },
        { id: 'i5L_tAEACAAJ', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', description: 'American dream.', coverUrl: getGoogleCover('i5L_tAEACAAJ'), rating: 4.5, publishedDate: '1925', pages: 180, genre: ['Fiction', 'Classic'] },
        { id: 'f44mAwAAQBAJ', title: 'Harry Potter', author: 'J.K. Rowling', description: 'The boy who lived.', coverUrl: getGoogleCover('f44mAwAAQBAJ'), rating: 4.9, publishedDate: '1997', pages: 309, genre: ['Fiction', 'Fantasy'] },
        { id: '_6R-DwAAQBAJ', title: 'The Hobbit', author: 'J.R.R. Tolkien', description: 'Unexpected journey.', coverUrl: getGoogleCover('_6R-DwAAQBAJ'), rating: 4.8, publishedDate: '1937', pages: 310, genre: ['Fiction', 'Fantasy'] },
        // Mystery
        { id: '7q26ngEACAAJ', title: 'Gone Girl', author: 'Gillian Flynn', description: 'Marriage mystery.', coverUrl: getGoogleCover('7q26ngEACAAJ'), rating: 4.5, publishedDate: '2012', pages: 415, genre: ['Mystery', 'Thriller'] },
        { id: 's654DwAAQBAJ', title: 'The Silent Patient', author: 'Alex Michaelides', description: 'A woman\'s violence.', coverUrl: getGoogleCover('s654DwAAQBAJ'), rating: 4.7, publishedDate: '2019', pages: 336, genre: ['Thriller', 'Mystery'] },
        { id: 'lZ15DwAAQBAJ', title: 'And Then There Were None', author: 'Agatha Christie', description: 'Ten strangers on an island.', coverUrl: getGoogleCover('lZ15DwAAQBAJ'), rating: 4.8, publishedDate: '1939', pages: 272, genre: ['Mystery', 'Classic'] },
        // Sci-Fi
        { id: '5_q1DwAAQBAJ', title: 'Dune', author: 'Frank Herbert', description: 'Epic sci-fi saga.', coverUrl: getGoogleCover('5_q1DwAAQBAJ'), rating: 4.7, publishedDate: '1965', pages: 412, genre: ['Sci-Fi', 'Classic'] },
        { id: '8uS2AwAAQBAJ', title: 'Hitchhiker\'s Guide', author: 'Douglas Adams', description: 'Don\'t panic.', coverUrl: getGoogleCover('8uS2AwAAQBAJ'), rating: 4.8, publishedDate: '1979', pages: 215, genre: ['Sci-Fi', 'Comedy'] },
        { id: 'U7_F5o20X5UC', title: 'Ender\'s Game', author: 'Orson Scott Card', description: 'Space war training.', coverUrl: getGoogleCover('U7_F5o20X5UC'), rating: 4.6, publishedDate: '1985', pages: 324, genre: ['Sci-Fi', 'Classic'] },
        // Fantasy
        { id: 'aX4XAgAAQBAJ', title: 'Game of Thrones', author: 'George R.R. Martin', description: 'Winter is coming.', coverUrl: getGoogleCover('aX4XAgAAQBAJ'), rating: 4.7, publishedDate: '1996', pages: 694, genre: ['Fantasy', 'Epic'] },
        { id: '6S42AQAAQBAJ', title: 'The Name of the Wind', author: 'Patrick Rothfuss', description: 'Story of Kvothe.', coverUrl: getGoogleCover('6S42AQAAQBAJ'), rating: 4.6, publishedDate: '2007', pages: 662, genre: ['Fantasy', 'Epic'] },
        // Romance
        { id: 'Qe6zDwAAQBAJ', title: 'It Ends with Us', author: 'Colleen Hoover', description: 'Lily\'s life.', coverUrl: getGoogleCover('Qe6zDwAAQBAJ'), rating: 4.5, publishedDate: '2016', pages: 376, genre: ['Romance', 'Contemporary'] },
        { id: 'EwIxEAAAQBAJ', title: 'The Love Hypothesis', author: 'Ali Hazelwood', description: 'Fake relationship.', coverUrl: getGoogleCover('EwIxEAAAQBAJ'), rating: 4.4, publishedDate: '2021', pages: 384, genre: ['Romance', 'Contemporary'] },
        // History
        { id: '68iICgAAQBAJ', title: 'Sapiens', author: 'Yuval Noah Harari', description: 'History of humankind.', coverUrl: getGoogleCover('68iICgAAQBAJ'), rating: 4.6, publishedDate: '2011', pages: 443, genre: ['History', 'Science'] },
        // Biography
        { id: '9_TCEAAAQBAJ', title: 'Elon Musk', author: 'Walter Isaacson', description: 'Tech mogul life.', coverUrl: getGoogleCover('9_TCEAAAQBAJ'), rating: 4.8, publishedDate: '2023', pages: 688, genre: ['Biography', 'Tech'] },
        // Self-Help
        { id: 'vS68DwAAQBAJ', title: 'Atomic Habits', author: 'James Clear', description: 'Build good habits.', coverUrl: getGoogleCover('vS68DwAAQBAJ'), rating: 4.8, publishedDate: '2018', pages: 320, genre: ['Self-Help', 'Psychology'] },
        { id: 'idYfK-W-oAAC', title: 'Subtle Art', author: 'Mark Manson', description: 'Good life approach.', coverUrl: getGoogleCover('idYfK-W-oAAC'), rating: 4.2, publishedDate: '2016', pages: 224, genre: ['Self-Help', 'Psychology'] },
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
