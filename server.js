/**
 * FloodGuard Backend Server (Refactored)
 *
 * Purpose: Main application entry point
 *
 * Features:
 * - Express.js REST API
 * - Socket.io for real-time updates
 * - MongoDB database connection
 * - Scheduled data ingestion
 * - Firebase push notifications
 *
 * Environment Variables Required:
 * - MONGO_URI: MongoDB connection string
 * - OWM_KEY: OpenWeatherMap API key
 * - JWT_SECRET: JWT signing secret
 * - PORT: Server port (default: 3000)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Configuration
const { connectDB } = require('./src/config/database');
const { initializeFirebase } = require('./src/config/firebase');
const { SERVER } = require('./src/config/constants');

// Routes
const routes = require('./src/routes');

// Jobs
const { startDataIngestion } = require('./src/jobs/dataIngestion');

// Sockets
const { setupFloodSocket } = require('./src/sockets/floodSocket');

// AI Model
const { loadModel } = require('./src/ai/model');

// ======================
// 1. Initialize App
// ======================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: SERVER.CORS_ORIGIN }
});

// Store io instance in app for access in routes
app.set('io', io);

// ======================
// 2. Middleware
// ======================
app.use(cors({ origin: SERVER.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// 3. Database Connection
// ======================
connectDB();

// ======================
// 4. Firebase Initialization
// ======================
initializeFirebase();

// ======================
// 5. API Routes
// ======================
app.use('/api', routes);

// Legacy routes (for backward compatibility)
app.get('/api/latest', (req, res) => res.redirect('/api/flood/latest'));
app.get('/api/history', (req, res) => res.redirect('/api/flood/history'));
app.get('/api/stats', (req, res) => res.redirect('/api/flood/stats'));
app.post('/api/trigger', (req, res) => res.redirect(307, '/api/flood/trigger'));

// ======================
// 6. Dashboard (Frontend)
// ======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ======================
// 7. WebSocket Setup
// ======================
setupFloodSocket(io);

// ======================
// 8. Start Cron Jobs
// ======================
let cronJob = null;
if (process.env.NODE_ENV !== 'test') {
  cronJob = startDataIngestion(io);
}

// ======================
// 9. Error Handling
// ======================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ======================
// 10. Start Server
// ======================
const PORT = SERVER.PORT;

server.listen(PORT, async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 FloodGuard Backend Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
  console.log('\n📋 Available Endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/flood/latest');
  console.log('  GET  /api/flood/history');
  console.log('  GET  /api/flood/stats');
  console.log('  GET  /api/flood/alerts');
  console.log('  POST /api/flood/trigger');
  console.log('  POST /api/users/register');
  console.log('  POST /api/users/login');
  console.log('  GET  /api/users/profile (protected)');
  console.log('='.repeat(50) + '\n');

  // Load AI model on startup
  await loadModel();
});

// ======================
// 11. Graceful Shutdown
// ======================
const gracefulShutdown = () => {
  console.log('\n⚠️  Shutting down gracefully...');

  // Stop cron job
  if (cronJob) {
    cronJob.stop();
    console.log('✓ Cron job stopped');
  }

  // Close server
  server.close(() => {
    console.log('✓ HTTP server closed');

    // Close database connection
    const { disconnectDB } = require('./src/config/database');
    disconnectDB().then(() => {
      console.log('✓ Database connection closed');
      console.log('👋 Goodbye!\n');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, io };
