
import express from 'express';
import * as bookProvider from '../services/bookProvider.js';

const router = express.Router();

// ─── Mood Recommender ─────────────────────────────────────────────────────────
const MOOD_TO_QUERY = {
    'romantic and hopeful': 'romance love story bestseller',
    'sad and melancholic': 'emotional literary fiction grief healing',
    'nostalgic and sentimental': 'nostalgic classic coming of age memoir',
    'anxious and need comfort': 'cozy comforting feel good book',
    'inspired and motivated': 'inspiring motivational success biography',
    'adventurous and bold': 'adventure action thriller bestseller',
    'want to travel the world through books': 'travel adventure world exploration',
    'craving fantasy and magic': 'fantasy magic epic bestseller',
    'sci-fi curious and futuristic': 'science fiction space future technology',
    'mysterious and suspenseful': 'mystery thriller suspense detective',
    'curious and want to learn something new': 'popular science nonfiction discovery',
    'philosophical and want a deep read': 'philosophy existential literary fiction',
    'focused on self improvement': 'self help personal development productivity',
    'interested in history and biography': 'history biography true story',
    'want to understand people better': 'psychology behaviour human nature',
    'cozy and relaxed': 'cozy mystery cottage village gentle fiction',
    'want something funny and lighthearted': 'comedy humor funny fiction',
    'bored and need excitement': 'fast paced thriller action page turner',
    'want a feel good uplifting story': 'uplifting feel good heartwarming fiction',
    'just want a quick fun read': 'short novella fun light quick read',
    'dark and edgy mood': 'dark literary fiction psychological drama',
    'tense and want a thriller': 'psychological thriller suspense bestseller',
    'want a horror story': 'horror supernatural scary ghost',
    'angry and want something fierce and powerful': 'powerful rebellion fierce dystopian',
};

const TIME_TO_PAGES = {
    'an hour or two': 'maxResults=8&filter=ebooks',
    'a weekend': 'maxResults=8',
    'a week': 'maxResults=8',
    'two weeks': 'maxResults=8',
    'a month': 'maxResults=8',
    'no rush, an epic saga is fine': 'maxResults=8',
};

router.post('/recommend', async (req, res) => {
    const { mood, time } = req.body;
    const query = MOOD_TO_QUERY[mood] || mood || 'bestseller fiction';
    const timeLimit = (TIME_TO_PAGES[time] && parseInt(TIME_TO_PAGES[time].match(/\d+/)?.[0] || '8')) || 8;
    try {
        const result = await bookProvider.search(query, 0, timeLimit * 2);
        const books = result.books
            .filter(b => b.thumbnail)
            .slice(0, timeLimit)
            .map(b => ({
                id: b.id,
                title: b.title,
                author: b.authors.join(', '),
                coverUrl: b.thumbnail,
                rating: b.averageRating || 0,
                description: b.description || '',
                publishedDate: b.publishedDate,
                pages: b.pageCount || 0,
                genre: b.categories,
            }));
        res.json(books);
    } catch (error) {
        console.error('AI recommend error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// ─── Smart Built-in Book Librarian ───────────────────────────────────────────
const BOOK_BRAIN = [
    {
        match: /thank|thanks|thank you|no need|that('s| is) all|no thanks|i('m| am) good|all good|perfect|great|awesome|wonderful|excellent|amazing|brilliant|cool|okay|ok|sure/i,
        reply: `You're very welcome! 😊 Happy reading — come back whenever you need another recommendation! 📚`
    },

    {
        match: /bye|goodbye|see you|cya|later|take care|good night|goodnight/i,
        reply: `Happy reading! 📖 Come back anytime you need book advice. Bye! 👋`
    },

    {
        match: /^(hi|hello|hey|yo|sup|hiya|howdy)/i,
        reply: `Hey there, fellow reader! 📚 I'm Nerdy's AI Librarian. Ask me anything about books — recommendations, summaries, character analysis, or just what to read next. What are you looking for today?`
    },

    {
        match: /summary|summarize|what is .+ about|plot of/i,
        reply: `Great choice! Here are a few classic summaries:\n\n📖 **1984 by George Orwell** — A chilling dystopia where Big Brother watches everyone. Winston Smith secretly rebels against total state control. A sobering masterpiece about power and truth.\n\n📖 **To Kill a Mockingbird by Harper Lee** — Young Scout Finch watches her father defend a Black man falsely accused of a crime in 1930s Alabama. A timeless story of justice.\n\n📖 **The Alchemist by Paulo Coelho** — A shepherd boy travels from Spain to Egypt following a dream of treasure. A spiritual fable about destiny.\n\nName a specific book and I'll summarize it! 😊`
    },

    {
        match: /character|who is|explain .+(character|person|protagonist|antagonist)/i,
        reply: `Love a character deep-dive! 🧠\n\n⚡ **Harry Potter** — The Boy Who Lived. Brave, loyal, and defined by love defeating evil.\n\n🕵️ **Sherlock Holmes** — The world's greatest detective. Brilliant and eccentric, fiercely principled.\n\n🌹 **Elizabeth Bennet** (Pride & Prejudice) — Witty, independent, and proud. A feminist icon before feminism had a name.\n\nName a character and I'll dig deeper! 📚`
    },

    {
        match: /darker|dark version|more intense|gritty|disturbing/i,
        reply: `You want something dark! 🖤\n\n🌑 **We Need to Talk About Kevin** by Lionel Shriver — A mother reflects on raising a son who commits a school massacre. Brutal and unforgettable.\n🌑 **The Road** by Cormac McCarthy — A father and son walk a post-apocalyptic America. Bleak and devastating.\n🌑 **House of Leaves** by Mark Z. Danielewski — A horror novel where a house is bigger on the inside. Genuinely unsettling.`
    },

    {
        match: /like harry potter|similar to harry potter|harry potter but/i,
        reply: `If you love Harry Potter, try these! ⚡\n\n📚 **The Name of the Wind** by Patrick Rothfuss — A magic school prodigy, more adult and complex.\n📚 **Percy Jackson** by Rick Riordan — Greek gods are real and a 12-year-old must save Olympus.\n📚 **Six of Crows** by Leigh Bardugo — Magical misfits pull off an impossible heist. Darker than HP.`
    },

    {
        match: /atomic habits|self.?help|productivity|student|habit|personal development|self improvement/i,
        reply: `Best personal growth books 💪\n\n📗 **Atomic Habits** by James Clear — Small 1% improvements compound into massive results.\n📗 **Deep Work** by Cal Newport — How to focus intensely in a distracted world. Perfect for students.\n📗 **The 7 Habits of Highly Effective People** by Stephen Covey — Timeless success principles.\n📗 **Make It Stick** — Science-backed learning for any student.\n📗 **Thinking, Fast and Slow** by Kahneman — How our two minds shape every decision.`
    },

    {
        match: /adventure|adventurous|action|quest|bold/i,
        reply: `Buckle up, adventurer! 🗺️\n\n📚 **The Hobbit** — A homebody hobbit swept into a dragon-slaying quest. Fantasy grandfather.\n📚 **Life of Pi** by Yann Martel — A boy, a tiger, 227 days adrift at sea.\n📚 **The Count of Monte Cristo** — Unjustly imprisoned man takes magnificent revenge.`
    },

    {
        match: /thriller|mystery|suspense|detective|crime|whodunit|murder/i,
        reply: `These thrillers will keep you up all night! 😰\n\n🔪 **Gone Girl** by Gillian Flynn — A marriage with shocking secrets. The twist is legendary.\n🔪 **The Girl with the Dragon Tattoo** by Stieg Larsson — Journalist and hacker investigate a cold case.\n🔪 **Big Little Lies** by Liane Moriarty — Three women's lives unravel around a murder.`
    },

    {
        match: /romance|romantic|love story|love book/i,
        reply: `Fall in love with these reads 💕\n\n❤️ **Pride and Prejudice** — The original slow-burn romance. Elizabeth and Darcy are iconic.\n❤️ **Me Before You** by Jojo Moyes — A caretaker and a man who has given up on life. Devastatingly beautiful.\n❤️ **It Ends with Us** by Colleen Hoover — A powerful modern story about love and strength.`
    },

    {
        match: /fantasy|magic|magical|wizard|witch|dragon|elf/i,
        reply: `Welcome to the world of magic! 🧙\n\n🔮 **The Lord of the Rings** — The defining epic fantasy quest.\n🔮 **A Game of Thrones** — Politics, betrayal, and dragons in a brutal medieval world.\n🔮 **The Way of Kings** by Brandon Sanderson — Incredible world-building, massive epic.`
    },

    {
        match: /sci.?fi|science fiction|space|future|robot|technology|dystopia/i,
        reply: `To infinity and beyond! 🚀\n\n🤖 **Dune** by Frank Herbert — A desert planet holds the universe's most valuable resource.\n🤖 **The Hitchhiker's Guide to the Galaxy** — Hilariously absurd intergalactic adventures. The answer is 42.\n🤖 **The Martian** by Andy Weir — An astronaut stranded on Mars must science his way home.`
    },

    {
        match: /horror|scary|ghost|supernatural|haunted|creepy|stephen king/i,
        reply: `Turn on the lights for these! 👻\n\n🕯️ **The Shining** by Stephen King — An isolated hotel slowly drives a writer insane.\n🕯️ **Dracula** by Bram Stoker — The original gothic vampire novel.\n🕯️ **Bird Box** by Josh Malerman — Unseen monsters make sight deadly.`
    },

    {
        match: /beginner|first book|start reading|never read|new to reading|where to start|first time/i,
        reply: `Welcome to the world of books! 🌟\n\n✅ **The Alchemist** by Paulo Coelho — Short, inspiring, universally loved. Perfect first book.\n✅ **Harry Potter and the Philosopher's Stone** — Magical and impossible to put down.\n✅ **The Martian** by Andy Weir — Fast-paced, funny, gripping.\n\nStart with whichever sounds most exciting — that's the real secret! 😊`
    },

    {
        match: /classic|classic book|all time|greatest|best books ever/i,
        reply: `The greatest books ever written 🏆\n\n📜 **To Kill a Mockingbird** — Harper Lee's masterpiece on race and justice\n📜 **1984** — Orwell's timeless warning about authoritarianism\n📜 **The Great Gatsby** — Fitzgerald's portrait of the American Dream\n📜 **Crime and Punishment** — Dostoevsky's psychological masterwork\n📜 **One Hundred Years of Solitude** — Magical realism at its peak`
    },

    {
        match: /philosophy|philosophical|meaning of life|existential|deep/i,
        reply: `Let's go deep 🤔\n\n🧠 **Meditations** by Marcus Aurelius — A Roman Emperor's private wisdom on how to live.\n🧠 **The Stranger** by Albert Camus — Absurdism explored through a senseless murder.\n🧠 **Sophie's World** by Jostein Gaarder — A novel that teaches the entire history of philosophy.`
    },

    {
        match: /cozy|light|easy|relaxing|feel good|heartwarming|funny|humor|laugh/i,
        reply: `Sometimes you just need a warm read ☕\n\n🌸 **The House in the Cerulean Sea** by TJ Klune — A caseworker for magical creatures falls in love. Cozy and sweet.\n🌸 **Good Omens** by Terry Pratchett & Neil Gaiman — Angel and demon try to stop the apocalypse. Hilarious.\n🌸 **Anxious People** by Fredrik Backman — A bank robber accidentally traps hostages. Warm and funny.`
    },

    {
        match: /biography|history|true story|real events|non.?fiction|nonfiction/i,
        reply: `Truth is often stranger than fiction! 📜\n\n🏛️ **Sapiens** by Yuval Noah Harari — A brief history of humankind. Mind-expanding.\n🏛️ **Educated** by Tara Westover — A woman raised by survivalists earns a Cambridge degree.\n🏛️ **Steve Jobs** by Walter Isaacson — The rollercoaster life of Apple's visionary founder.`
    },

    {
        match: /psychology|human behavior|why people|brain|mind|how people think/i,
        reply: `Human behaviour is endlessly fascinating 🧠\n\n🔬 **Thinking, Fast and Slow** by Kahneman — How our two mental systems shape every decision.\n🔬 **Influence** by Robert Cialdini — The six principles that make people say yes.\n🔬 **Predictably Irrational** by Dan Ariely — All the ways humans make irrational choices.`
    },

    {
        match: /recommend|what should i read|suggest|what to read|good book|best book/i,
        reply: `I'd love to help find your next favourite! 📚 Tell me:\n\n1️⃣ **Genres you enjoy** — fantasy, thriller, romance, sci-fi, non-fiction...\n2️⃣ **A book you've loved** — I'll find something similar\n3️⃣ **How you're feeling** — adventurous, cozy, curious, need to laugh...\n\nOr use the **Mood Finder** tab to get instant curated picks! ✨`
    },

    // Default
    {
        match: /.*/,
        reply: `I'm Nerdy's Book Librarian, here to help with anything book-related! 📚\n\nTry asking me:\n🔍 "Recommend a fantasy book"\n📖 "Summarize 1984"\n🧠 "Who is Sherlock Holmes?"\n🌑 "Books like Harry Potter but darker"\n⚡ "Best books for beginners"\n💪 "Books like Atomic Habits for students"\n\nJust type naturally and I'll find the perfect answer! 😊`
    }
];

function getBookReply(message) {
    for (const rule of BOOK_BRAIN) {
        if (rule.match.test(message)) return rule.reply;
    }
    return BOOK_BRAIN[BOOK_BRAIN.length - 1].reply;
}

// POST /api/ai/chat
router.post('/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    res.json({ reply: getBookReply(message) });
});

export default router;
