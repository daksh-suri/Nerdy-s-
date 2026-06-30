const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const TIMEOUT_MS = 8000;

function normalizeGoogleBook(item) {
    const v = item.volumeInfo || {};
    const identifiers = v.industryIdentifiers || [];
    const isbn = identifiers.find(i => i.type === 'ISBN_13')?.identifier
        || identifiers.find(i => i.type === 'ISBN_10')?.identifier
        || null;

    return {
        id: item.id,
        title: v.title || 'Unknown Title',
        authors: v.authors || ['Unknown Author'],
        description: typeof v.description === 'string'
            ? v.description
            : v.description?.value || 'No description available.',
        thumbnail: v.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
        categories: v.categories || [],
        publishedDate: v.publishedDate || 'Unknown',
        pageCount: v.pageCount || 0,
        averageRating: v.averageRating || 0,
        isbn,
        source: 'google',
    };
}

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

export async function searchGoogleBooks(query, maxResults = 40, startIndex = 0) {
    const url = `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&startIndex=${startIndex}&orderBy=relevance&langRestrict=en${API_KEY ? `&key=${API_KEY}` : ''}`;

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
        const err = new Error(`Google Books API error: ${response.status}`);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    const books = (data.items || []).map(normalizeGoogleBook);

    return { books, totalItems: data.totalItems || books.length };
}

export async function getGoogleBookById(id) {
    const url = `${GOOGLE_BOOKS_URL}/${id}${API_KEY ? `?key=${API_KEY}` : ''}`;

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
        const err = new Error(`Google Books API error: ${response.status}`);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    return normalizeGoogleBook(data);
}
