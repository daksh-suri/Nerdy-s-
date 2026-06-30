import { searchGoogleBooks, getGoogleBookById } from './googleBooks.js';
import { searchOpenLibrary, getOpenLibraryBook } from './openLibrary.js';

// ─── Error classification ────────────────────────────────────────────────────

function classifyError(err) {
    if (err.name === 'AbortError') return 'timeout';
    if (err.status === 429) return 'quota_exceeded';
    if (err.status === 403) return 'forbidden';
    if (err.message === 'empty_response') return 'empty_response';
    return 'api_error';
}

// ─── Structured logging ──────────────────────────────────────────────────────

function log(provider, query, booksReturned, totalItems, responseTimeMs, fallbackReason, triggeredBy) {
    const entry = {
        provider,
        query,
        booksReturned,
        totalItems,
        responseTimeMs,
        fallbackReason: fallbackReason || null,
    };
    if (triggeredBy) entry.triggeredBy = triggeredBy;
    console.log('[BookProvider]', JSON.stringify(entry));
}

// ─── Search (Google → Open Library fallback) ────────────────────────────────

export async function search(query, startIndex = 0, maxResults = 40) {
    const startTime = Date.now();

    // 1. Try Google Books
    try {
        const result = await searchGoogleBooks(query, maxResults, startIndex);
        const elapsed = Date.now() - startTime;

        log('google', query, result.books.length, result.totalItems, elapsed, null);

        if (result.books.length === 0) {
            throw Object.assign(new Error('empty_response'), { status: 0 });
        }

        return { ...result, source: 'google' };
    } catch (googleErr) {
        const googleElapsed = Date.now() - startTime;
        const reason = classifyError(googleErr);

        log('google', query, 0, 0, googleElapsed, reason);

        // 2. Fall back to Open Library
        const olStart = Date.now();
        try {
            const olResult = await searchOpenLibrary(query, maxResults, startIndex);
            const olElapsed = Date.now() - olStart;

            log('openlibrary', query, olResult.books.length, olResult.totalItems, olElapsed, null, reason);

            return { ...olResult, source: 'openlibrary' };
        } catch (olErr) {
            const olElapsed = Date.now() - olStart;
            log('openlibrary', query, 0, 0, olElapsed, classifyError(olErr), reason);

            console.error(`[BookProvider] Both providers failed for query "${query}":`, olErr);
            return { books: [], totalItems: 0, source: 'openlibrary' };
        }
    }
}

// ─── Get by ID (Google → Open Library fallback) ────────────────────────────

export async function getById(id) {
    const startTime = Date.now();

    // 1. Try Google Books
    try {
        const book = await getGoogleBookById(id);
        const elapsed = Date.now() - startTime;

        log('google', `id:${id}`, 1, 1, elapsed, null);
        return { ...book, source: 'google' };
    } catch (googleErr) {
        const googleElapsed = Date.now() - startTime;
        const reason = classifyError(googleErr);

        log('google', `id:${id}`, 0, 0, googleElapsed, reason);

        // 2. Fall back to Open Library
        const olStart = Date.now();
        try {
            const book = await getOpenLibraryBook(id);
            const olElapsed = Date.now() - olStart;

            log('openlibrary', `id:${id}`, 1, 1, olElapsed, null, reason);
            return { ...book, source: 'openlibrary' };
        } catch (olErr) {
            const olElapsed = Date.now() - olStart;
            log('openlibrary', `id:${id}`, 0, 0, olElapsed, classifyError(olErr), reason);

            console.error(`[BookProvider] Both providers failed for id "${id}":`, olErr);
            return null;
        }
    }
}
