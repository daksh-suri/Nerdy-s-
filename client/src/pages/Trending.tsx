
import { useEffect, useState } from 'react';
import { fetchTrendingBooks, type Book } from '@/lib/api';
import { STARTER_BOOKS } from '@/lib/staticBooks';
import { GenreScrollRow } from '@/components/ui/GenreScrollRow';
import { Filter, TrendingUp } from 'lucide-react';
import '@/styles/pages.css';

const GENRES = [
    { genre: 'Fiction', emoji: '✨', query: 'subject:fiction bestselling' },
    { genre: 'Mystery & Thriller', emoji: '🕵️', query: 'subject:mystery' },
    { genre: 'Science Fiction', emoji: '🚀', query: 'subject:science fiction' },
    { genre: 'Fantasy', emoji: '🧙', query: 'subject:fantasy popular' },
    { genre: 'Romance', emoji: '💕', query: 'subject:romance' },
    { genre: 'History', emoji: '📜', query: 'subject:history nonfiction' },
    { genre: 'Biography', emoji: '👤', query: 'subject:biography memoir' },
    { genre: 'Self-Help', emoji: '💡', query: 'subject:self help personal development' },
];

type FilterOption = 'all' | string;

export function Trending() {
    const [genreBooks, setGenreBooks] = useState<Record<string, Book[]>>(STARTER_BOOKS);
    const [genreLoading, setGenreLoading] = useState<Record<string, boolean>>({});
    const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

    useEffect(() => {
        GENRES.forEach(async ({ genre, query }) => {
            setGenreLoading(prev => ({ ...prev, [genre]: true }));
            try {
                const { books } = await fetchTrendingBooks(query, 20, 0);
                if (books && books.length > 0) {
                    setGenreBooks(prev => ({ ...prev, [genre]: books }));
                }
            } catch { /* ignore */ }
            setGenreLoading(prev => ({ ...prev, [genre]: false }));
        });
    }, []);


    const visibleGenres = activeFilter === 'all'
        ? GENRES
        : GENRES.filter(g => g.genre === activeFilter);

    return (
        <div className="page-container-inner">
            {/* Header */}
            <div className="trending-header animate-fade-in-up">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
                        <TrendingUp style={{ display: 'inline', width: '1.5rem', height: '1.5rem', marginRight: '0.5rem', verticalAlign: 'middle', color: 'var(--primary)' }} />
                        Trending Books
                    </h1>
                    <p className="page-description">Top picks across every genre, updated daily. Scroll sideways to see more in each genre.</p>
                </div>
            </div>

            {/* Genre Filter Pills */}
            <div className="genre-filter-bar animate-fade-in-up delay-200 glass-panel" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                <Filter className="genre-filter-icon" />
                <div className="genre-filter-pills">
                    <button
                        className={`genre-pill ${activeFilter === 'all' ? 'genre-pill-active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All Genres
                    </button>
                    {GENRES.map(({ genre, emoji }) => (
                        <button
                            key={genre}
                            className={`genre-pill ${activeFilter === genre ? 'genre-pill-active' : ''}`}
                            onClick={() => setActiveFilter(genre)}
                        >
                            {emoji} {genre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Genre Rows */}
            <div className="trending-rows animate-fade-in-up delay-400">
                {visibleGenres.map(({ genre, emoji }) => (
                    <GenreScrollRow
                        key={genre}
                        genre={genre}
                        emoji={emoji}
                        books={genreBooks[genre] || []}
                        loading={genreLoading[genre]}
                    />
                ))}
            </div>
        </div>
    );
}
