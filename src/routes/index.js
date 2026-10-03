/**
 * Main Router
 *
 * Purpose: Combines all API routes
 *
 * Usage:
 *   const routes = require('./routes');
 *   app.use('/api', routes);
 */

const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const floodRoutes = require('./floodRoutes');

// Mount route modules
router.use('/users', userRoutes);
router.use('/flood', floodRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FloodGuard API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
