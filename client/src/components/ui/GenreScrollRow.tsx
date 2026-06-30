import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Book } from '@/lib/api';
import { BookCard } from '@/components/ui/BookCard';
import '@/styles/components.css';

interface GenreScrollRowProps {
    genre: string;
    books: Book[];
    loading?: boolean;
    emoji?: string;
    hasMore?: boolean;
    onLoadMore?: () => void;
    loadingMore?: boolean;
}

export function GenreScrollRow({ genre, books, loading, emoji = '📚', hasMore, onLoadMore, loadingMore }: GenreScrollRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.75;
        scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    return (
        <div className="genre-row">
            <div className="genre-row-header">
                <div className="genre-row-title-wrap">
                    <span className="genre-row-emoji">{emoji}</span>
                    <h2 className="genre-row-title">{genre}</h2>
                    <span className="genre-row-count">Top {books.length}</span>
                </div>
                <div className="genre-row-nav">
                    <button className="genre-row-btn" onClick={() => scroll('left')} aria-label="Scroll left">
                        <ChevronLeft className="genre-row-btn-icon" />
                    </button>
                    <button className="genre-row-btn" onClick={() => scroll('right')} aria-label="Scroll right">
                        <ChevronRight className="genre-row-btn-icon" />
                    </button>
                </div>
            </div>

            {books.length === 0 && loading ? (
                <div className="genre-row-skeleton">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="genre-skeleton-card" />
                    ))}
                </div>
            ) : books.length === 0 ? (
                <div className="genre-no-books">
                    No books found in this category.
                </div>
            ) : (
                <div className="genre-row-scroll" ref={scrollRef}>
                    {books.map((book, index) => (
                        <div key={book.id} className="genre-row-item fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="genre-rank">{index + 1}</div>
                            <BookCard book={book} />
                        </div>
                    ))}
                </div>
            )}
            {hasMore && !loading && (
                <div className="genre-row-footer">
                    <button
                        className="genre-load-more"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading...' : 'Show more →'}
                    </button>
                </div>
            )}
        </div>
    );
}
