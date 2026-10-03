/**
 * Utility Helper Functions
 *
 * Purpose: Reusable utility functions used across the application
 */

/**
 * Delays execution for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Formats a date to a readable string
 * @param {Date} date - Date object
 * @returns {string}
 */
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Rounds a number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Checks if a value is within a range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
const isInRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Generates a random ID
 * @param {number} length - Length of ID
 * @returns {string}
 */
const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * Safely parses JSON with fallback
 * @param {string} str - JSON string
 * @param {*} fallback - Fallback value
 * @returns {*}
 */
const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

/**
 * Removes undefined/null values from object
 * @param {Object} obj - Object to clean
 * @returns {Object}
 */
const cleanObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null)
  );
};

module.exports = {
  delay,
  formatDate,
  roundTo,
  isInRange,
  clamp,
  generateId,
  safeJsonParse,
  cleanObject
};
