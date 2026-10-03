/**
 * Logger Utility
 *
 * Purpose: Structured logging for the application
 *
 * Features:
 * - Console logging with colors
 * - Log levels (info, warn, error, debug)
 * - Timestamp prefixes
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started');
 *   logger.error('Database error', error);
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const COLORS = {
  DEBUG: '\x1b[36m',  // Cyan
  INFO: '\x1b[32m',   // Green
  WARN: '\x1b[33m',   // Yellow
  ERROR: '\x1b[31m',  // Red
  RESET: '\x1b[0m'
};

/**
 * Formats log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string}
 */
const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  const color = COLORS[level] || COLORS.RESET;
  return `${color}[${timestamp}] [${level}]${COLORS.RESET} ${message}`;
};

/**
 * Logs debug message
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
const debug = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(formatMessage(LOG_LEVELS.DEBUG, message));
    if (data) console.log(data);
  }
};

/**
 * Logs info message
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
const info = (message, data = null) => {
  console.log(formatMessage(LOG_LEVELS.INFO, message));
  if (data) console.log(data);
};

/**
 * Logs warning message
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
const warn = (message, data = null) => {
  console.warn(formatMessage(LOG_LEVELS.WARN, message));
  if (data) console.warn(data);
};

/**
 * Logs error message
 * @param {string} message - Message to log
 * @param {Error} error - Error object
 */
const error = (message, err = null) => {
  console.error(formatMessage(LOG_LEVELS.ERROR, message));
  if (err) {
    console.error(err.stack || err);
  }
};

module.exports = {
  debug,
  info,
  warn,
  error
};
