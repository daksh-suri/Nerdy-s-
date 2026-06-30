
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchBooks, type Book } from '@/lib/api';
import { BookCard } from '@/components/ui/BookCard';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import '@/styles/pages.css';

export function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [books, setBooks] = useState<Book[]>([]);
    const [related, setRelated] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBooks = async () => {
            if (!query) return;

            setLoading(true);
            setError('');
            setBooks([]);
            setRelated([]);
            try {
                const { books: results } = await searchBooks(query, 0, 20);
                if (results.length === 0) {
                    setError('No books found matching your search.');
                } else {
                    setBooks(results.slice(0, 1));
                    setRelated(results.slice(1));
                }
            } catch {
                setError('Failed to fetch books. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [query]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="search-query-badge">
                    <Search className="search-query-icon" />
                    <span>"{query}"</span>
                </div>
                <h1 className="page-title">Search Results</h1>
                <p className="page-description">
                    {!loading && books.length > 0 &&
                        `Found ${books.length + related.length} results`
                    }
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="text-center py-20 text-muted-foreground text-lg">
                    {error}
                </div>
            ) : (
                <>
                    {/* Best Match Hero */}
                    {books.length > 0 && (
                        <section className="fade-in-up">
                            <div className="section-header">
                                <h2 className="section-title">🎯 Best Match</h2>
                            </div>
                            <div className="search-hero-card">
                                <Link to={`/book/${books[0].id}`} className="search-hero-link">
                                    <div className="search-hero-cover-wrap">
                                        <img
                                            src={books[0].coverUrl}
                                            alt={books[0].title}
                                            className="search-hero-cover"
                                        />
                                        <div className="search-hero-glow" />
                                    </div>
                                    <div className="search-hero-info">
                                        <span className="search-hero-badge">Top Result</span>
                                        <h3 className="search-hero-title">{books[0].title}</h3>
                                        <p className="search-hero-author">by {books[0].author}</p>
                                        {books[0].rating > 0 && (
                                            <p className="search-hero-rating">⭐ {books[0].rating.toFixed(1)} / 5</p>
                                        )}
                                        {books[0].genre.length > 0 && (
                                            <div className="search-hero-tags">
                                                {books[0].genre.slice(0, 3).map(g => (
                                                    <span key={g} className="tag">{g}</span>
                                                ))}
                                            </div>
                                        )}
                                        <p className="search-hero-desc">
                                            {books[0].description.slice(0, 180)}{books[0].description.length > 180 ? '...' : ''}
                                        </p>
                                        <span className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                                            View Book <ArrowRight style={{ marginLeft: '0.4rem', width: '1rem', height: '1rem', display: 'inline' }} />
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Related Books Grid */}
                    {related.length > 0 && (
                        <section>
                            <div className="section-header">
                                <h2 className="section-title">📚 Related Books</h2>
                            </div>
                            <div className="books-grid">
                                {related.map((book, i) => (
                                    <div key={book.id} className="fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                                        <BookCard book={book} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
