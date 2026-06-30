import { useState, useRef, useEffect } from 'react';
import { Sparkles, Clock, Smile, Search, BookOpen, Send, Mic, MicOff, Volume2 } from 'lucide-react';
import { searchBooks, type Book } from '@/lib/api';
import '@/styles/pages.css';
import '@/styles/ai-chat.css';

// ─── Mood Recommender Data ────────────────────────────────────────────────────
const MOOD_OPTIONS = [
    {
        group: '😌 Emotional & Reflective',
        moods: [
            { value: 'romance love story', label: '💕 Romantic & Hopeful' },
            { value: 'emotional grief healing literary fiction', label: '😢 Sad & Melancholic' },
            { value: 'nostalgic memoir coming of age classic', label: '🌇 Nostalgic & Sentimental' },
            { value: 'cozy comforting heartwarming fiction', label: '🫂 Anxious, Need Comfort' },
            { value: 'inspiring motivational self help success', label: '✨ Inspired & Motivated' },
        ],
    },
    {
        group: '🗺️ Adventure & Escape',
        moods: [
            { value: 'adventure action hero quest', label: '🗺️ Adventurous & Bold' },
            { value: 'travel exploration world journey', label: '🌍 Want to Travel the World' },
            { value: 'fantasy magic epic world building', label: '🧙 Craving Fantasy & Magic' },
            { value: 'science fiction space future technology', label: '🚀 Sci-Fi & Futuristic' },
            { value: 'mystery detective suspense thriller', label: '🕵️ Mysterious & Suspenseful' },
        ],
    },
    {
        group: '🧠 Mind & Growth',
        moods: [
            { value: 'popular science discovery nonfiction', label: '🔬 Curious, Want to Learn' },
            { value: 'philosophy existential meaning life', label: '🤔 Philosophical & Deep' },
            { value: 'personal development productivity habits', label: '💪 Self-Improvement Mode' },
            { value: 'history biography true story', label: '📜 History & True Stories' },
            { value: 'psychology human behavior social', label: '🧠 Understanding People' },
        ],
    },
    {
        group: '☕ Light & Cozy',
        moods: [
            { value: 'cozy mystery village cottage gentle', label: '☕ Cozy & Relaxed' },
            { value: 'comedy humor funny fiction', label: '😂 Funny & Lighthearted' },
            { value: 'fast paced action page turner exciting', label: '😴 Bored, Need Excitement' },
            { value: 'uplifting feel good hope friendship', label: '🌈 Feel-Good & Uplifting' },
            { value: 'short novella quick light read', label: '⚡ Quick & Fun Read' },
        ],
    },
    {
        group: '🌑 Dark & Intense',
        moods: [
            { value: 'dark psychological literary drama', label: '🖤 Dark & Edgy' },
            { value: 'psychological thriller suspense crime', label: '😰 Tense, Want a Thriller' },
            { value: 'horror supernatural ghost scary', label: '👻 Horror & Creepy' },
            { value: 'dystopian rebellion resistance fierce', label: '😤 Angry & Fierce' },
        ],
    },
];

const TIME_OPTIONS = [
    { value: 'an hour or two', label: '⏱️ An hour or two (flash read)' },
    { value: 'a weekend', label: '🌅 A weekend (Short & Sweet)' },
    { value: 'a week', label: '📅 A week (Moderate pace)' },
    { value: 'two weeks', label: '🗓️ Two weeks (Comfortable)' },
    { value: 'a month', label: '📖 A month (Deep dive)' },
    { value: 'no rush, epic saga', label: '♾️ No rush (Epic saga)' },
];

// ─── Chat Quick Prompts ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
    '📚 Summarize a classic book for me',
    '🌑 Books like Harry Potter but darker',
    '🎓 Books like Atomic Habits but for students',
    '🕵️ Explain Sherlock Holmes as a character',
    '🔥 Fast-paced thrillers I can\'t put down',
    '🌿 Cozy fantasy novels for beginners',
    '✨ Best self-help books of all time',
    '💔 Emotional romance recommendations',
];

// ─── Message Type ─────────────────────────────────────────────────────────────
interface Message {
    role: 'user' | 'model';
    content: string;
}

// ─── Speech Recognition Type ─────────────────────────────────────────────────
interface SpeechRecognitionType extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionType;
        webkitSpeechRecognition: new () => SpeechRecognitionType;
    }
}

export function AiRecommend() {
    const [activeTab, setActiveTab] = useState<'mood' | 'chat'>('mood');

    // ── Mood Finder state ──
    const [mood, setMood] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState('');

    // ── Chat state ──
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceOutput, setVoiceOutput] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionType | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatLoading]);

    // ── Mood Finder submit ──
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mood) return;
        setLoading(true);
        setHasSearched(true);
        setError('');
        setRecommendations([]);
        try {
            const { books: results } = await searchBooks(mood, 0, 10);
            if (results.length === 0) {
                setError('No books found for this mood. Try a different selection!');
            } else {
                setRecommendations(results.slice(0, 8));
            }
        } catch {
            setError('Failed to load recommendations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Chat send ──
    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || chatLoading) return;
        const userMsg: Message = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setChatInput('');
        setChatLoading(true);

        try {
            // Use raw fetch so non-200 responses don't throw
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed, history: messages }),
            });
            const data = await res.json().catch(() => ({}));
            const reply = data.reply || data.error || 'Something went wrong. Please try again.';
            console.log('[AI Chat] Response:', { status: res.status, reply });
            const botMsg: Message = { role: 'model', content: reply };
            setMessages(prev => [...prev, botMsg]);
            if (voiceOutput && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.rate = 1;
                utterance.pitch = 1;
                window.speechSynthesis.speak(utterance);
            }
        } catch (e: any) {
            console.error('[AI Chat] Network error:', e);
            setMessages(prev => [...prev, {
                role: 'model',
                content: '📚 It looks like the server isn\'t running. Please start the server with `npm run start` and try again!'
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(chatInput);
    };

    // ── Voice input ──
    const toggleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice recognition is not supported in your browser. Try Chrome or Edge.');
            return;
        }
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setChatInput(transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    return (
        <div className="ai-container">
            {/* Page Header */}
            <div className="ai-header">
                <div className="ai-icon-wrapper">
                    <Sparkles className="ai-icon text-primary" />
                </div>
                <h1 className="page-title text-5xl mb-4">AI Book Concierge</h1>
                <p className="page-description text-xl max-w-2xl mx-auto leading-relaxed">
                    Your personal reading companion. Discover books by mood, or chat with our AI Librarian.
                </p>
            </div>

            {/* Tab switcher */}
            <div className="ai-tabs-wrapper">
                <button
                    className={`ai-tab-btn ${activeTab === 'mood' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mood')}
                >
                    <Smile size={16} /> Mood Finder
                </button>
                <button
                    className={`ai-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                >
                    <Sparkles size={16} /> AI Librarian Chat
                </button>
            </div>

            {/* ── TAB: Mood Finder ── */}
            {activeTab === 'mood' && (
                <>
                    <form onSubmit={handleSearch} className="ai-form">
                        <div className="form-grid">
                            <div className="space-y-2">
                                <label htmlFor="mood" className="form-label">
                                    <Smile className="w-4 h-4 text-primary" />
                                    Current Mood
                                </label>
                                <select id="mood" className="form-select" value={mood} onChange={(e) => setMood(e.target.value)} required>
                                    <option value="" disabled>How are you feeling right now?</option>
                                    {MOOD_OPTIONS.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.moods.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="time" className="form-label">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Time Commitment
                                </label>
                                <select id="time" className="form-select" value={time} onChange={(e) => setTime(e.target.value)} required>
                                    <option value="" disabled>How much time do you have?</option>
                                    {TIME_OPTIONS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" disabled={loading || !mood || !time} className="btn btn-primary btn-full">
                            {loading ? (
                                <><Sparkles className="w-5 h-5 mr-2" style={{ animation: 'spin 1s linear infinite' }} />Consulting the Oracle...</>
                            ) : (
                                <><Search className="w-5 h-5 mr-2" />Find My Book</>
                            )}
                        </button>
                    </form>

                    {hasSearched && !loading && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '2rem 0 1.5rem' }}>
                                <div style={{ height: '1px', background: 'var(--border)', flex: 1, maxWidth: '100px' }} />
                                <h2 className="section-title" style={{ margin: 0 }}>Curated For You</h2>
                                <div style={{ height: '1px', background: 'var(--border)', flex: 1, maxWidth: '100px' }} />
                            </div>
                            {error ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                                    <BookOpen style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.75rem' }} />
                                    <p>{error}</p>
                                </div>
                            ) : (
                                <div className="ai-results-grid">
                                    {recommendations.map((book) => (
                                        <a key={book.id} href={`/book/${book.id}`} className="ai-result-card">
                                            <div className="ai-result-cover-wrap">
                                                <img src={book.coverUrl} alt={book.title} className="ai-result-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=No+Cover'; }} />
                                            </div>
                                            <div className="ai-result-info">
                                                <p className="ai-result-title">{book.title}</p>
                                                <p className="ai-result-author">{book.author}</p>
                                                {book.rating > 0 && <span className="ai-result-rating">⭐ {book.rating.toFixed(1)}</span>}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── TAB: AI Librarian Chat ── */}
            {activeTab === 'chat' && (
                <div className="ai-chat-wrapper">
                    {/* Avatar & intro */}
                    <div className="ai-chat-intro">
                        <div className="ai-chat-avatar">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="#f5c842" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="#f5c842" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </div>
                        <h2>Nerdy's AI Librarian</h2>
                        <p>Ask me anything about books — recommendations, summaries, characters, and more.</p>
                    </div>

                    {/* Quick prompt chips */}
                    <div className="ai-quick-prompts">
                        {QUICK_PROMPTS.map(p => (
                            <button key={p} className="ai-prompt-chip" onClick={() => sendMessage(p)}>{p}</button>
                        ))}
                    </div>

                    {/* Messages */}
                    <div className="ai-chat-messages">
                        {messages.length === 0 && !chatLoading && (
                            <div className="ai-empty-chat">
                                <span style={{ fontSize: '2rem' }}>💬</span>
                                <span>Start a conversation or click a prompt above</span>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                                <div className="ai-msg-avatar">
                                    {msg.role === 'user' ? '👤' : (
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="#f5c842" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="#f5c842" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <div className="ai-msg-bubble">{msg.content}</div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="ai-msg bot">
                                <div className="ai-msg-avatar">📚</div>
                                <div className="ai-msg-bubble">
                                    <div className="ai-typing">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input row */}
                    <form onSubmit={handleChatSubmit} className="ai-chat-input-row">
                        <button
                            type="button"
                            className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
                            onClick={toggleVoice}
                            title={isRecording ? 'Stop recording' : 'Voice input'}
                        >
                            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <input
                            className="ai-chat-input"
                            placeholder={isRecording ? '🎤 Listening...' : 'Ask about books, characters, recommendations...'}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={chatLoading}
                        />
                        <button
                            type="submit"
                            className="ai-chat-send-btn"
                            disabled={!chatInput.trim() || chatLoading}
                            title="Send"
                        >
                            <Send size={18} />
                        </button>
                    </form>

                    {/* Voice output toggle */}
                    <label className="ai-voice-toggle">
                        <Volume2 size={14} />
                        Read responses aloud
                        <input
                            type="checkbox"
                            checked={voiceOutput}
                            onChange={e => setVoiceOutput(e.target.checked)}
                        />
                    </label>
                </div>
            )}
        </div>
    );
}
