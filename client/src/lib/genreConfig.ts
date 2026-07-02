export interface GenreConfigItem {
    genre: string;
    emoji: string;
    query: string;
}

export const GENRE_CONFIG: GenreConfigItem[] = [
    { genre: 'Fiction', emoji: '✨', query: 'subject:fiction bestselling' },
    { genre: 'Mystery & Thriller', emoji: '🕵️', query: 'subject:mystery' },
    { genre: 'Science Fiction', emoji: '🚀', query: 'subject:science fiction' },
    { genre: 'Fantasy', emoji: '🧙', query: 'subject:fantasy popular' },
    { genre: 'Romance', emoji: '💕', query: 'subject:romance' },
    { genre: 'History', emoji: '📜', query: 'subject:history nonfiction' },
    { genre: 'Biography', emoji: '👤', query: 'subject:biography memoir' },
    { genre: 'Self-Help', emoji: '💡', query: 'subject:self help personal development' },
];
