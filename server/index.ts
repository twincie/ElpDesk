import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { DatabaseManager } from './database/index.js';
import { authRoutes } from './routes/auth.js';
import { ticketRoutes } from './routes/tickets.js';
import { messageRoutes } from './routes/messages.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { userRoutes } from './routes/users.js';
import { analyticsRoutes } from './routes/analytics.js';
import { fileURLToPath } from 'url';

// required only on local development
// Uncomment the next line if you want to use dotenv for local development
// Make sure to create a .env file in the root directory with the necessary environment variables
// If you are using a different method to manage environment variables, you can ignore this line

// dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Serve static files from frontend build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
const db = new DatabaseManager();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Make database available to routes
app.use((req, _res, next) => {
  (req as any).db = db;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.io setup
setupSocketHandlers(io, db);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = Number(process.env.PORT) || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database initialized successfully`);
});

export { io };