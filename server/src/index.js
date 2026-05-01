require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');

// ─── Environment Validation ─────────────────────────────
const requiredEnv = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`❌ CRITICAL: Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// ─── Import Routes ──────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const orgRoutes = require('./routes/org.routes');
const queueRoutes = require('./routes/queue.routes');
const { initializeSocket } = require('./socket/handler');

const app = express();
const server = http.createServer(app);

// ─── Security Middleware ────────────────────────────────
app.use(helmet()); // Sets various security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Specific limiter for Auth routes (Login/Register)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 attempts per hour
  message: { error: 'Too many authentication attempts. Please try again after an hour.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Core Middleware ────────────────────────────────────
app.use(morgan('dev')); // Request logging
app.use(express.json({ limit: '10kb' })); // Body parser with size limit (security)

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QueueX API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/queues', queueRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler (Fault Tolerance) ──────────────
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ─── Socket.IO Setup ────────────────────────────────────
initializeSocket(server);

// ─── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 QueueX server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
});

// ─── Graceful Shutdown & Fault Tolerance ────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In a real prod environment, we might want to shut down gracefully here
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1); // Immediate exit as the state might be corrupted
});

module.exports = { app, server };
