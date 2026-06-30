import https from 'node:https';

const OPEN_LIBRARY_URL = 'https://openlibrary.org';
const TIMEOUT_MS = 20000;

function getCoverUrl(doc) {
    if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
    const isbn = doc.isbn?.[0];
    if (isbn) {
        return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    }
    return '';
}

function normalizeOLDoc(doc) {
    const isbns = doc.isbn || [];
    return {
        id: doc.key,
        title: doc.title || 'Unknown Title',
        authors: doc.author_name || ['Unknown Author'],
        description: 'No description available.',
        thumbnail: getCoverUrl(doc),
        categories: (doc.subject || []).slice(0, 5),
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : 'Unknown',
        pageCount: 0,
        averageRating: 0,
        isbn: isbns[0] || null,
        source: 'openlibrary',
    };
}

/**
 * Fetch JSON from Open Library using node:https with a custom timeout.
 * We avoid the global fetch() here because Node's internal undici client has
 * a default 10-second connect timeout that can't be configured without access
 * to the undici package.  Using https.get gives us full control.
 */
function httpsFetch(url, timeoutMs = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: timeoutMs }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => JSON.parse(body),
                    text: () => body,
                });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            const err = new Error('timeout');
            err.status = 0;
            reject(err);
        });
    });
}

/**
 * Build an Open Library search URL that handles Google-style query syntax.
 * - Strips subject: prefix and passes it as the `subject` param
 * - Passes remaining text as `q`
 */
function buildSearchUrl(query, maxResults, startIndex) {
    const subjectMatch = query.match(/subject:(\w[\w\s]*\w|\w)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : null;
    const textQuery = query.replace(/subject:\w[\w\s]*\w/g, '').replace(/subject:\w/g, '').trim();

    const params = new URLSearchParams();
    if (textQuery) params.set('q', textQuery);
    if (subject) params.set('subject', subject);
    if (!textQuery && !subject) params.set('q', query);
    params.set('limit', String(maxResults));
    params.set('offset', String(startIndex));

    return `${OPEN_LIBRARY_URL}/search.json?${params.toString()}`;
}

export async function searchOpenLibrary(query, maxResults = 40, startIndex = 0) {
    const url = buildSearchUrl(query, maxResults, startIndex);

    const response = await httpsFetch(url);

    if (!response.ok) {
        const err = new Error(`Open Library API error: ${response.status}`);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    const books = (data.docs || []).map(normalizeOLDoc);

    return { books, totalItems: data.numFound || books.length };
}

export async function getOpenLibraryBook(key) {
    if (!key || !key.startsWith('/')) {
        throw new Error(`Invalid Open Library key: "${key}" (must start with /)`);
    }
    const url = `${OPEN_LIBRARY_URL}${key}.json`;

    const response = await httpsFetch(url);

    if (!response.ok) {
        const err = new Error(`Open Library API error: ${response.status}`);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();

    let description = 'No description available.';
    if (typeof data.description === 'string') {
        description = data.description;
    } else if (data.description?.value) {
        description = data.description.value;
    }

    const coverId = data.covers?.[0];
    let thumbnail = '';
    if (coverId) {
        thumbnail = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }

    const allIsbns = [];
    if (data.identifiers?.isbn_13) allIsbns.push(...data.identifiers.isbn_13);
    if (data.identifiers?.isbn_10) allIsbns.push(...data.identifiers.isbn_10);

    const authors = data.authors?.map(a => {
        if (typeof a === 'string') return a;
        return a.name || a.key || 'Unknown Author';
    }) || ['Unknown Author'];

    const subjects = (data.subjects || []).map(s => {
        if (typeof s === 'string') return s;
        return s.name || '';
    }).filter(Boolean).slice(0, 5);

    return {
        id: key,
        title: data.title || 'Unknown Title',
        authors,
        description,
        thumbnail,
        categories: subjects,
        publishedDate: data.first_publish_date || data.created?.value?.split('-')[0] || 'Unknown',
        pageCount: 0,
        averageRating: 0,
        isbn: allIsbns[0] || null,
        source: 'openlibrary',
    };
}
