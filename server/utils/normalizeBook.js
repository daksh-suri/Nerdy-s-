function resolveCover(coverId, isbn) {
    if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    return '';
}

export function normalizeOpenLibraryBook(doc) {
    const coverId = doc.cover_i;
    const isbn = doc.isbn?.[0] || null;

    return {
        title: doc.title || 'Unknown Title',
        authors: doc.author_name || ['Unknown Author'],
        description: doc.first_sentence?.[0] || '',
        coverImage: resolveCover(coverId, isbn),
        isbn,
        publishedYear: doc.first_publish_year || null,
        genres: doc.subject?.slice(0, 5) || [],
        language: doc.language?.[0] || 'en',
        pageCount: doc.number_of_pages_median || null,
        source: 'openlibrary',
        sourceId: doc.key.replace('/works/', ''),
        averageRating: doc.ratings_average || 0,
        ratingsCount: doc.ratings_count || 0,
    };
}

export function normalizeGoogleBook(item) {
    const v = item.volumeInfo || {};
    const isbn = v.industryIdentifiers?.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier || null;

    const gbCover = v.imageLinks?.thumbnail?.replace('http:', 'https:');
    const coverImage = gbCover || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : '');

    return {
        title: v.title || 'Unknown Title',
        authors: v.authors || ['Unknown Author'],
        description: v.description || 'No description available.',
        coverImage,
        isbn,
        publishedYear: v.publishedDate ? parseInt(v.publishedDate) || null : null,
        genres: v.categories || [],
        language: v.language || 'en',
        pageCount: v.pageCount || null,
        source: 'googlebooks',
        sourceId: item.id,
        averageRating: v.averageRating || 0,
        ratingsCount: v.ratingsCount || 0,
    };
}

export async function normalizeOpenLibraryBookDetail(data) {
    let author = 'Unknown Author';
    if (data.authors && data.authors.length > 0) {
        const authorKey = data.authors[0].author?.key;
        if (authorKey) {
            try {
                const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`, { signal: AbortSignal.timeout(5000) });
                if (authorRes.ok) {
                    const authorData = await authorRes.json();
                    author = authorData.name || 'Unknown Author';
                }
            } catch {}
        }
    }

    let description = 'No description available.';
    if (data.description) {
        description = typeof data.description === 'string' ? data.description : (data.description.value || 'No description available.');
    }

    const coverId = data.covers?.[0];
    const isbn = data.isbn_13?.[0] || data.isbn_10?.[0] || null;

    return {
        title: data.title || 'Unknown Title',
        authors: [author],
        description,
        coverImage: resolveCover(coverId, isbn),
        isbn,
        publishedYear: data.first_publish_date ? parseInt(data.first_publish_date) || null : null,
        genres: data.subjects?.slice(0, 5) || [],
        language: 'en',
        pageCount: null,
        source: 'openlibrary',
        sourceId: data.key?.replace('/works/', '') || '',
        averageRating: 0,
        ratingsCount: 0,
    };
}

export function toApiFormat(book) {
    return {
        id: book.sourceId,
        title: book.title,
        author: book.authors.join(', '),
        description: book.description,
        coverUrl: book.coverImage,
        rating: book.averageRating,
        publishedDate: book.publishedYear ? String(book.publishedYear) : 'Unknown',
        pages: book.pageCount || 0,
        genre: book.genres,
    };
}
