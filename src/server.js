import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { notFound } from './middleware/notFound.js';

// Import routes
import authRoutes from './domains/auth/auth.routes.js';
import userRoutes from './domains/users/users.routes.js';
import pregnancyRoutes from './domains/pregnancy/pregnancy.routes.js';
import communityRoutes from './domains/community/community.routes.js';
import classRoutes from './domains/classes/classes.routes.js';
import eventRoutes from './domains/events/events.routes.js';
import mediaRoutes from './domains/media/media.routes.js';
import notificationRoutes from './domains/notifications/notifications.routes.js';
import adminRoutes from './domains/admin/admin.routes.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(logger);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Muitas requisições deste IP, por favor tente novamente em alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(`/api/${API_VERSION}/`, limiter);

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Mamacita API is running! 🌸',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

const BASE_PATH = `/api/${API_VERSION}`;

// Authentication & Users
app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/users`, userRoutes);

// Core Domains
app.use(`${BASE_PATH}/pregnancy`, pregnancyRoutes);
app.use(`${BASE_PATH}/community`, communityRoutes);
app.use(`${BASE_PATH}/classes`, classRoutes);
app.use(`${BASE_PATH}/events`, eventRoutes);

// Shared
app.use(`${BASE_PATH}/media`, mediaRoutes);
app.use(`${BASE_PATH}/notifications`, notificationRoutes);

// Admin
app.use(`${BASE_PATH}/admin`, adminRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('\n🚀 ====================================');
  console.log('   MAMACITA API SERVER');
  console.log('   ====================================');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   API Version: ${API_VERSION}`);
  console.log(`   Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
  console.log('   ====================================\n');
});

export default app;
