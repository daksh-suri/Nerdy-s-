export function deduplicateBooks(books) {
    const seen = new Map();

    for (const book of books) {
        const key = getDedupKey(book);
        if (key && !seen.has(key)) {
            seen.set(key, book);
        } else if (!key) {
            seen.set(`source:${book.source}:${book.sourceId}`, book);
        }
    }

    return [...seen.values()];
}

function getDedupKey(book) {
    if (book.isbn) return `isbn:${book.isbn}`;

    const title = book.title?.toLowerCase().trim();
    const author = book.authors?.[0]?.toLowerCase().trim();
    if (title && author) return `title:${title}|author:${author}`;

    return null;
}
