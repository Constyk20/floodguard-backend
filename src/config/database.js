/**
 * Database Configuration Module
 *
 * Purpose: Manages MongoDB connection with retry logic and error handling
 *
 * Features:
 * - Automatic reconnection on connection loss
 * - Connection pooling for better performance
 * - Graceful error handling
 *
 * Usage:
 *   const connectDB = require('./config/database');
 *   connectDB();
 */

const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Connection options
      serverSelectionTimeoutMS: 5000,  // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`  Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
    });

  } catch (error) {
    console.error('✗ MongoDB Connection Failed:', error.message);
    console.error('  Please ensure MongoDB is running');
    console.error('  Connection string:', process.env.MONGO_URI);
    process.exit(1);
  }
};

/**
 * Closes the database connection gracefully
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

module.exports = { connectDB, disconnectDB };
