/**
 * Input Validators
 *
 * Purpose: Custom validation functions for API inputs
 *
 * Usage:
 *   const { isValidEmail, isValidCoordinates } = require('./utils/validators');
 *   if (!isValidEmail(email)) throw new Error('Invalid email');
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validates latitude
 * @param {number} lat - Latitude
 * @returns {boolean}
 */
const isValidLatitude = (lat) => {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
};

/**
 * Validates longitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
const isValidLongitude = (lng) => {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
};

/**
 * Validates coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
const isValidCoordinates = (lat, lng) => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

/**
 * Validates username
 * @param {string} username - Username
 * @returns {boolean}
 */
const isValidUsername = (username) => {
  return typeof username === 'string' &&
         username.length >= 3 &&
         username.length <= 30 &&
         /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Validates password strength
 * @param {string} password - Password
 * @returns {boolean}
 */
const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

/**
 * Validates date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean}
 */
const isValidDateRange = (startDate, endDate) => {
  return startDate instanceof Date &&
         endDate instanceof Date &&
         startDate <= endDate;
};

/**
 * Sanitizes string input
 * @param {string} str - String to sanitize
 * @returns {string}
 */
const sanitizeString = (str) => {
  return String(str).trim().replace(/[<>]/g, '');
};

module.exports = {
  isValidEmail,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isValidUsername,
  isValidPassword,
  isValidDateRange,
  sanitizeString
};
