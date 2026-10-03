/**
 * Flood WebSocket Handler
 *
 * Purpose: Manages WebSocket connections for real-time flood updates
 *
 * Features:
 * - Sends historical data on connection
 * - Broadcasts real-time updates
 * - Connection tracking
 *
 * Usage:
 *   const { setupFloodSocket } = require('./sockets/floodSocket');
 *   setupFloodSocket(io);
 */

const FloodData = require('../models/FloodData');

/**
 * Sets up WebSocket event handlers
 * @param {Object} io - Socket.io instance
 */
const setupFloodSocket = (io) => {
  io.on('connection', async (socket) => {
    console.log('🔌 Client connected:', socket.id);

    try {
      // Send historical data to newly connected client
      const historicalRecords = await FloodData.find()
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();  // Use lean() for better performance

      socket.emit('historical', historicalRecords);
      console.log(`  → Sent ${historicalRecords.length} historical records to ${socket.id}`);

    } catch (err) {
      console.error('Error fetching historical data:', err.message);
      socket.emit('error', { message: 'Failed to load historical data' });
    }

    // Handle client requests for specific data
    socket.on('request:latest', async () => {
      try {
        const latest = await FloodData.findOne()
          .sort({ timestamp: -1 })
          .lean();

        socket.emit('latest', latest);
      } catch (err) {
        console.error('Error fetching latest data:', err.message);
      }
    });

    // Handle client requests for statistics
    socket.on('request:stats', async () => {
      try {
        const stats = await FloodData.getStats();
        socket.emit('stats', stats);
      } catch (err) {
        console.error('Error fetching stats:', err.message);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✓ WebSocket handlers configured');
};

/**
 * Broadcasts a flood update to all connected clients
 * @param {Object} io - Socket.io instance
 * @param {Object} data - Flood data to broadcast
 */
const broadcastFloodUpdate = (io, data) => {
  io.emit('floodUpdate', data);
  console.log('📡 Broadcast update to all clients');
};

/**
 * Gets count of connected clients
 * @param {Object} io - Socket.io instance
 * @returns {number}
 */
const getConnectedClientsCount = (io) => {
  return io.engine.clientsCount;
};

module.exports = {
  setupFloodSocket,
  broadcastFloodUpdate,
  getConnectedClientsCount
};
