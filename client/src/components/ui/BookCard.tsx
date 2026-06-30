
import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { type Book } from '@/lib/mockData';
import '@/styles/components.css';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=200&auto=format&fit=crop';

interface BookCardProps {
    book: Book;
}

export const BookCard = memo(function BookCard({ book }: BookCardProps) {
    const [imgError, setImgError] = useState(false);

    return (
        <Link to={`/book/${book.id}`} className="book-card group">
            <div className="book-cover-container">
                <img
                    src={imgError ? FALLBACK_COVER : book.coverUrl}
                    alt={book.title}
                    className="book-card-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                />
            </div>
            <div className="book-card-info">
                <h3 className="book-card-title">
                    {book.title}
                </h3>
                <p className="book-card-author">{book.author}</p>
                <div className="book-card-rating">
                    <Star className="star-icon" />
                    <span>{book.rating}</span>
                </div>
            </div>
        </Link>
    );
});
