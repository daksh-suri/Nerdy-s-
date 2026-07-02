
import { useEffect, useState } from 'react';
import { searchBooks, type Book } from '@/lib/api';
import { GENRE_CONFIG } from '@/lib/genreConfig';
import { GenreScrollRow } from '@/components/ui/GenreScrollRow';
import { Filter, TrendingUp } from 'lucide-react';
import '@/styles/pages.css';

type FilterOption = 'all' | string;

export function Trending() {
    const [genreBooks, setGenreBooks] = useState<Record<string, Book[]>>({});
    const [genreLoading, setGenreLoading] = useState<Record<string, boolean>>({});
    const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

    useEffect(() => {
        GENRE_CONFIG.forEach(async ({ genre, query }) => {
            setGenreLoading(prev => ({ ...prev, [genre]: true }));
            try {
                const { books } = await searchBooks(query, 0, 20);
                if (books && books.length > 0) {
                    setGenreBooks(prev => ({ ...prev, [genre]: books }));
                }
            } catch { /* ignore */ }
            setGenreLoading(prev => ({ ...prev, [genre]: false }));
        });
    }, []);


    const visibleGenres = activeFilter === 'all'
        ? GENRE_CONFIG
        : GENRE_CONFIG.filter(g => g.genre === activeFilter);

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
                    {GENRE_CONFIG.map(({ genre, emoji }) => (
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
