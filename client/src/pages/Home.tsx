
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Star, Eye, TrendingUp, Users, Zap } from 'lucide-react';
import CountUp from 'react-countup';
import { searchBooks, getBookDetails, type Book } from '@/lib/api';
import { GENRE_CONFIG } from '@/lib/genreConfig';
import { GenreScrollRow } from '@/components/ui/GenreScrollRow';
import { getFavorites, getAllLogs, getUserLogs } from '@/lib/storage';
import { useAuth } from '@/lib/AuthContext';
import '@/styles/pages.css';

const FEATURE_CARDS = [
    { icon: Eye, title: 'Track every book', desc: 'Keep a diary of every book you read, starting from whenever you join.', color: '#7c3aed' },
    { icon: Heart, title: 'Love your reads', desc: 'Show love for books by adding them to your favorites list.', color: '#e11d48' },
    { icon: Star, title: 'Rate & Review', desc: 'Rate books on a five-star scale and log your thoughts with notes.', color: '#d97706' },
    { icon: BookOpen, title: 'AI Recommendations', desc: 'Get personalized book picks from our AI based on your mood and preferences.', color: '#0891b2' },
];

const SAMPLE_REVIEWS = [
    { user: 'alice_reads', book: 'The Night Circus', bookId: '', rating: 5, comment: 'Absolutely magical. One of the most atmospheric books I\'ve ever read.' },
    { user: 'bookworm91', book: 'Project Hail Mary', bookId: '', rating: 5, comment: 'Andy Weir at the peak of his craft. Couldn\'t put it down.' },
    { user: 'literary_leo', book: 'Tomorrow, and Tomorrow, and Tomorrow', bookId: '', rating: 4, comment: 'A gorgeous meditation on friendship, creativity and loss.' },
    { user: 'sarah_pages', book: 'Piranesi', bookId: '', rating: 5, comment: 'Strange, beautiful, and unlike anything else. A modern classic.' },
    { user: 'readsalot', book: 'The Midnight Library', bookId: '', rating: 4, comment: 'A philosophical page-turner. Made me rethink my choices.' },
    { user: 'inkstained', book: 'Normal People', bookId: '', rating: 4, comment: 'Sally Rooney dissects modern love with devastating precision.' },
];

const POPULAR_LISTS = [
    { name: 'Books that changed my life', curator: 'alice_reads', count: 12 },
    { name: 'Best sci-fi of the decade', curator: 'bookworm91', count: 20 },
    { name: 'Comfort reads for rainy days', curator: 'sarah_pages', count: 15 },
    { name: 'Literary fiction masterworks', curator: 'literary_leo', count: 18 },
];

function getDailyBook(books: Book[]): Book | null {
    if (!books.length) return null;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return books[dayOfYear % books.length];
}

type ReviewItem = { user: string; book: string; bookId: string; rating: number; comment: string; isReal?: boolean };

export function Home() {
    const { user, isAuthenticated } = useAuth();
    const [heroBook, setHeroBook] = useState<Book | null>(null);
    const [showcaseBooks, setShowcaseBooks] = useState<Book[]>([]);
    const [genreData, setGenreData] = useState<Record<string, Book[]>>({});
    const [genreLoading, setGenreLoading] = useState<Record<string, boolean>>({});
    const [recentBooks, setRecentBooks] = useState<Book[]>([]);
    const [heroLoading, setHeroLoading] = useState(true);
    const [activeReview, setActiveReview] = useState(0);
    const [communityReviews, setCommunityReviews] = useState<ReviewItem[]>(SAMPLE_REVIEWS);

    const [booksRead, setBooksRead] = useState(0);
    const [favsCount, setFavsCount] = useState(0);

    // Load real user reviews from API, fall back to samples
    useEffect(() => {
        if (!isAuthenticated) return;
        // Load stats
        getFavorites().then(favs => setFavsCount(favs.length)).catch(() => { });
        getUserLogs('').then(logs => setBooksRead(logs.length)).catch(() => { });
        // Load community reviews
        getAllLogs().then(realLogs => {
            const withNotes = realLogs.filter(l => l.notes && l.notes.trim() && (l.username || l.user?.username));
            if (withNotes.length >= 3) {
                const sorted = [...withNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCommunityReviews(sorted.slice(0, 6).map(l => ({
                    user: l.username || l.user?.username || 'Anonymous',
                    book: l.bookTitle || 'a book',
                    bookId: l.bookId,
                    rating: l.rating,
                    comment: l.notes,
                    isReal: true,
                })));
            }
        }).catch(() => { });
    }, [isAuthenticated]);

    // Cycle through community reviews
    useEffect(() => {
        const timer = setInterval(() => {
            setCommunityReviews(prev => { setActiveReview(a => (a + 1) % prev.length); return prev; });
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    // Fetch hero & showcase books
    useEffect(() => {
        (async () => {
            setHeroLoading(true);
            try {
                const [bestsellers, classics] = await Promise.all([
                    searchBooks('bestselling fiction 2024', 0, 10),
                    searchBooks('subject:classic literature popular', 0, 10),
                ]);
                setHeroBook(getDailyBook(bestsellers.books));
                setShowcaseBooks([...bestsellers.books, ...classics.books].slice(0, 10));
            } catch { /* ignore */ }
            setHeroLoading(false);
        })();
    }, []);

    // Fetch recent views
    useEffect(() => {
        (async () => {
            const recentIds: string[] = JSON.parse(localStorage.getItem('nerdys_recent_views') || '[]');
            if (recentIds.length > 0) {
                const fetched = await Promise.all(recentIds.slice(0, 6).map(id => getBookDetails(id)));
                setRecentBooks(fetched.filter((b): b is Book => b !== null));
            }
        })();
    }, []);

    // Fetch genres in background — static books show instantly
    useEffect(() => {
        GENRE_CONFIG.forEach(async ({ genre, query }) => {
            setGenreLoading(prev => ({ ...prev, [genre]: true }));
            try {
                const { books } = await searchBooks(query, 0);
                if (books && books.length > 0) {
                    setGenreData(prev => ({ ...prev, [genre]: books }));
                }
            } catch { /* ignore */ }
            setGenreLoading(prev => ({ ...prev, [genre]: false }));
        });
    }, []);

    return (
        <div className="home-wrapper" style={{ position: 'relative', minHeight: '100vh' }}>
            {/* ── GLOBAL BOOKSHELF BACKGROUND ──────────────────── */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
                <div className="lb-hero-bg hero-gradient-bg" style={{ position: 'absolute', inset: 0, opacity: 0.95, mixBlendMode: 'normal', backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'sepia(0.3) opacity(0.3) brightness(1.2) contrast(0.9)' }}>
                    {heroBook?.coverUrl && (
                        <img src={heroBook.coverUrl} alt="" className="lb-hero-bg-img" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                    )}
                    <div className="lb-hero-overlay" style={{ position: 'absolute', inset: 0 }} />
                </div>
                <div className="hero-noise-overlay" style={{ position: 'absolute', inset: 0 }}></div>
                <div className="hero-radial-glow" style={{ position: 'absolute', inset: 0 }}></div>
            </div>

            {/* ── FULL-BLEED HERO ───────────────────────────────── */}
            <section className="lb-hero" style={{ position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' }}>
                <div className="lb-hero-content" style={{ position: 'relative', zIndex: 10 }}>
                    {!isAuthenticated ? (
                        <>
                            <h1 className="lb-hero-tagline animate-fade-in-up">
                                Your reading life,<br />
                                beautifully tracked.
                            </h1>
                            <div className="lb-hero-actions animate-fade-in-up delay-200">
                                <Link to="/register" className="lb-cta-btn btn-glow">
                                    Get started — it's free!
                                </Link>
                                <p className="lb-hero-sub hover-underline-animation">The social network for book lovers.</p>
                            </div>
                            {/* Animated global stats */}
                            <div className="lb-hero-global-stats animate-fade-in-up delay-400" style={{ padding: '0.5rem 0', width: '100%', maxWidth: '800px', margin: '2.5rem auto 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 0 10px rgba(212, 175, 55, 0.2)' }}><CountUp end={12840} duration={2.5} separator="," /></span>
                                        <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>books logged today</span>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 0 10px rgba(212, 175, 55, 0.2)' }}><CountUp end={3204} duration={2.5} separator="," /></span>
                                        <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>reviews written</span>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 0 10px rgba(212, 175, 55, 0.2)' }}><CountUp end={8561} duration={2.5} separator="," /></span>
                                        <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>members active</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1 className="lb-hero-tagline animate-fade-in-up">
                                Welcome back, {user?.username}! 📚<br />
                                <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>What will you read today?</span>
                            </h1>
                            <div className="lb-hero-global-stats animate-fade-in-up delay-400" style={{ padding: '0.5rem 0', width: '100%', maxWidth: '800px', margin: '1.5rem auto 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 0 10px rgba(212, 175, 55, 0.2)' }}><CountUp end={booksRead} duration={2} /></span>
                                        <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>logged</span>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(212, 175, 55, 0.4)', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)', cursor: 'default' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 0 10px rgba(212, 175, 55, 0.2)' }}><CountUp end={favsCount} duration={2} /></span>
                                        <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>favorites</span>
                                    </div>
                                </div>
                            </div>
                            <div className="lb-hero-actions animate-fade-in-up delay-200" style={{ marginTop: '1.5rem' }}>
                                <Link to="/trending" className="lb-cta-btn btn-glow" style={{ fontSize: '0.95rem', padding: '0.7rem 1.8rem' }}>
                                    <TrendingUp style={{ display: 'inline', marginRight: '0.4rem', width: '1rem', height: '1rem' }} />
                                    Browse Trending
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* ── SHOWCASE BOOK STRIP ────────────────────────────── */}
            <section className="lb-showcase">
                <div className="lb-showcase-inner">
                    {heroLoading
                        ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="lb-showcase-skeleton" />)
                        : showcaseBooks.map((book, i) => (
                            <Link key={book.id} to={`/book/${book.id}`} className="lb-showcase-cover" style={{ animationDelay: `${i * 50}ms` }}>
                                <img src={book.coverUrl} alt={book.title} />
                            </Link>
                        ))
                    }
                </div>
                {!heroLoading && (
                    <p className="lb-showcase-caption">
                        A selection of popular books on Nerdy's right now. <Link to="/trending">Browse all →</Link>
                    </p>
                )}
            </section>

            {/* ── WHAT NERDY'S LETS YOU DO ─────────────────────── */}
            {!isAuthenticated && (
                <section className="lb-features-section page-container-inner">
                    <h2 className="lb-features-heading animate-fade-in-up">NERDY'S LETS YOU…</h2>
                    <div className="lb-features-grid">
                        {FEATURE_CARDS.map(({ icon: Icon, title, desc, color }, i) => (
                            <div key={title} className="lb-feature-card premium-card animate-fade-in-up" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
                                <div className="lb-feature-icon-wrap" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                                    <Icon className="lb-feature-icon" style={{ color }} />
                                </div>
                                <h3 className="lb-feature-title">{title}</h3>
                                <p className="lb-feature-desc">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── COMMUNITY BUZZ ──────────────────────────────────── */}
            <section className="lb-community-section page-container-inner">
                <div className="lb-community-inner">
                    {/* Popular Reviews */}
                    <div className="lb-community-reviews">
                        <div className="lb-section-header">
                            <h2 className="lb-section-title">
                                <Users style={{ display: 'inline', width: '1.1rem', height: '1.1rem', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                                POPULAR REVIEWS THIS WEEK
                            </h2>
                            {!isAuthenticated && (
                                <p className="lb-section-sub">
                                    <Link to="/register" className="lb-inline-link">Sign up</Link> to create your own.
                                </p>
                            )}
                        </div>
                        <div className="lb-reviews-list">
                            {communityReviews.map((r, i) => (
                                <div
                                    key={i}
                                    className={`lb-review-card ${i === activeReview ? 'lb-review-active' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    <div className="lb-review-top">
                                        <Link
                                            to={r.isReal ? `/user/${r.user}` : '#'}
                                            className="lb-review-avatar"
                                            title={`View ${r.user}'s profile`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            {r.user[0].toUpperCase()}
                                        </Link>
                                        <div>
                                            <Link
                                                to={r.isReal ? `/user/${r.user}` : '#'}
                                                className="lb-review-user"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                {r.user}
                                            </Link>
                                            <span className="lb-review-action"> reviewed </span>
                                            {r.bookId ? (
                                                <Link to={`/book/${r.bookId}`} className="lb-review-book" style={{ textDecoration: 'none' }}>
                                                    {r.book}
                                                </Link>
                                            ) : (
                                                <span className="lb-review-book">{r.book}</span>
                                            )}
                                        </div>
                                        <div className="lb-review-stars">
                                            {Array.from({ length: r.rating }).map((_, si) => (
                                                <Star key={si} className="lb-star" />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="lb-review-comment">"{r.comment}"</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Popular Lists */}
                    <div className="lb-popular-lists">
                        <div className="lb-section-header">
                            <h2 className="lb-section-title">
                                <Zap style={{ display: 'inline', width: '1.1rem', height: '1.1rem', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                                POPULAR LISTS
                            </h2>
                        </div>
                        <div className="lb-lists-grid">
                            {POPULAR_LISTS.map((list, i) => (
                                <div key={i} className="lb-list-card">
                                    <div className="lb-list-num">{String(i + 1).padStart(2, '0')}</div>
                                    <div className="lb-list-info">
                                        <span className="lb-list-name">{list.name}</span>
                                        <span className="lb-list-meta">by {list.curator} · {list.count} books</span>
                                    </div>
                                    <ArrowRight className="lb-list-arrow" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── BOOK OF THE DAY ──────────────────────────────── */}
            {heroBook && (
                <section className="lb-botd page-container-inner">
                    <div className="lb-botd-label">📖 BOOK OF THE DAY</div>
                    <div className="lb-botd-card">
                        <Link to={`/book/${heroBook.id}`} className="lb-botd-cover-link">
                            <img src={heroBook.coverUrl} alt={heroBook.title} className="lb-botd-cover" />
                        </Link>
                        <div className="lb-botd-info">
                            <h3 className="lb-botd-title">{heroBook.title}</h3>
                            <p className="lb-botd-author">by {heroBook.author}</p>
                            {heroBook.rating > 0 && <p className="lb-botd-rating">⭐ {heroBook.rating.toFixed(1)}/5</p>}
                            <p className="lb-botd-desc">{heroBook.description.slice(0, 240)}{heroBook.description.length > 240 ? '...' : ''}</p>
                            <Link to={`/book/${heroBook.id}`} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.75rem' }}>
                                View Book <ArrowRight style={{ display: 'inline', marginLeft: '0.3rem', width: '1rem', height: '1rem' }} />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── RECENTLY VIEWED ──────────────────────────────── */}
            {recentBooks.length > 0 && (
                <section className="page-container-inner">
                    <GenreScrollRow genre="Recently Viewed" books={recentBooks} emoji="🕐" />
                </section>
            )}

            {/* ── GENRE ROWS ────────────────────────────────────── */}
            <div className="page-container-inner">
                {GENRE_CONFIG.map(({ genre, emoji }) => (
                    <GenreScrollRow
                        key={genre}
                        genre={genre}
                        emoji={emoji}
                        books={genreData[genre] || []}
                        loading={genreLoading[genre]}
                    />
                ))}
            </div>
        </div>
    );
}
