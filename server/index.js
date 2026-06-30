import dotenv from 'dotenv'
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import authRoutes from './routes/auth.js';
import logsRoutes from './routes/logs.js';
import favoritesRoutes from './routes/favorites.js';
import chatRoutes from './routes/chat.js';
import aiRoutes from './routes/aiRoutes.js';
import dnaRoutes from './routes/dna.js';
import profileRoutes from './routes/profile.js';
import friendsRoutes from './routes/friends.js';
import booksRoutes from './routes/books.js';
import { setupSocketHandlers } from './socket/chat.js';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dna', dnaRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/books', booksRoutes);

// Health check / keep-alive endpoint
app.get('/ping', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ message: "Nerdy's API is running 📚" }));

// Socket.io
setupSocketHandlers(io, prisma);

// Seed default chat rooms
async function seedChatRooms() {
    const rooms = [
        { name: 'General', slug: 'general', description: 'Open community chat for all book lovers', emoji: '📢' },
        { name: 'Currently Reading', slug: 'currently-reading', description: 'Share what you\'re reading right now', emoji: '📖' },
        { name: 'Recommendations', slug: 'recommendations', description: 'Ask for and give book recommendations', emoji: '💡' },
        { name: 'Fiction', slug: 'fiction', description: 'Discuss fiction books', emoji: '✨' },
        { name: 'Mystery & Thriller', slug: 'mystery', description: 'Whodunit discussions', emoji: '🕵️' },
        { name: 'Science Fiction', slug: 'sci-fi', description: 'Sci-fi and speculative fiction chat', emoji: '🚀' },
        { name: 'Fantasy', slug: 'fantasy', description: 'Fantasy worlds and magic systems', emoji: '🧙' },
    ];
    for (const room of rooms) {
        await prisma.chatRoom.upsert({
            where: { slug: room.slug },
            update: {},
            create: room,
        });
    }
    console.log('✅ Chat rooms seeded');
}

const PORT = process.env.PORT || 5000;

async function main() {
    await prisma.$connect();
    console.log('✅ Database connected');
    await seedChatRooms();
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔌 Socket.io ready for live chat`);

        // Keep-alive: ping ourselves every 14 minutes to prevent Render free-tier sleep
        const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        setInterval(async () => {
            try {
                await fetch(`${selfUrl}/ping`);
                console.log('💓 Keep-alive ping sent');
            } catch (e) {
                // Silently ignore ping errors
            }
        }, 14 * 60 * 1000); // every 14 minutes
    });
}

main().catch((e) => {
    console.error('❌ Server failed to start:', e);
    process.exit(1);
});
