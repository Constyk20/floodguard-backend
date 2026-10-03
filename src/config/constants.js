/**
 * Application Constants
 *
 * Purpose: Centralized configuration values used throughout the application
 *
 * Features:
 * - Risk thresholds for flood prediction
 * - API endpoints for external services
 * - Data normalization constants
 * - System limits and defaults
 */

module.exports = {
  /**
   * Risk Level Thresholds
   */
  RISK_LEVELS: {
    LOW: { min: 0, max: 29, label: 'low' },
    MEDIUM: { min: 30, max: 69, label: 'medium' },
    HIGH: { min: 70, max: 100, label: 'high' }
  },

  /**
   * Get risk level label from percentage
   * @param {number} percentage - Risk percentage (0-100)
   * @returns {string} 'low' | 'medium' | 'high'
   */
  getRiskLevel: (percentage) => {
    if (percentage < 30) return 'low';
    if (percentage < 70) return 'medium';
    return 'high';
  },

  /**
   * Data Normalization Constants
   */
  NORMALIZATION: {
    MAX_RAINFALL: 50,        // Maximum expected rainfall in mm
    MAX_WATER_LEVEL: 6,      // Maximum expected water level (model scale, 0-6)
    SOIL_MOISTURE_RANGE: 1   // Soil moisture already 0-1
  },

  /**
   * External API Configuration
   */
  API_ENDPOINTS: {
    OPENWEATHERMAP: 'https://api.openweathermap.org/data/2.5',
    OPEN_METEO: 'https://api.open-meteo.com/v1',               // soil moisture
    OPEN_METEO_FLOOD: 'https://flood-api.open-meteo.com/v1',   // river discharge (GloFAS)
    SOILGRIDS: 'https://rest.isric.org/soilgrids/v2.0'         // static soil properties
  },

  /**
   * API Timeouts (in milliseconds)
   */
  API_TIMEOUTS: {
    WEATHER: 10000,
    WATER: 10000,
    SOIL: 10000
  },

  /**
   * Cache TTLs (in milliseconds) - keeps 37-state ingestion within free API limits
   */
  CACHE_TTL: {
    WATER: 60 * 60 * 1000,   // river discharge is daily data: 1 hour
    SOIL: 30 * 60 * 1000     // soil moisture: 30 minutes
  },

  /**
   * Ingestion behaviour
   */
  INGESTION: {
    DELAY_BETWEEN_STATES_MS: parseInt(process.env.STATE_DELAY_MS) || 1000,
    REFRESH_COOLDOWN_MS: 2 * 60 * 1000,        // normal refresh: reuse a record younger than this
    FORCE_REFRESH_MIN_INTERVAL_MS: 15 * 1000   // refresh button (?force=true): anti-spam minimum
  },

  /**
   * Default Location (Lagos, Nigeria)
   * Still used as a fallback when no state is specified.
   */
  DEFAULT_LOCATION: {
    lat: parseFloat(process.env.DEFAULT_LAT) || 6.45,
    lng: parseFloat(process.env.DEFAULT_LNG) || 3.39,
    name: process.env.DEFAULT_LOCATION_NAME || 'Lagos, Nigeria'
  },

  /**
   * Cron Schedule
   * Default: Every 10 minutes
   */
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '*/10 * * * *',

  /**
   * Data Retention
   */
  DATA_RETENTION: {
    HISTORY_LIMIT: 50,
    MAX_HISTORY_LIMIT: 500,
    ARCHIVE_AFTER_DAYS: 90
  },

  /**
   * JWT Configuration
   */
  JWT: {
    EXPIRES_IN: '30d',
    SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here'
  },

  /**
   * FCM Topics
   */
  FCM_TOPICS: {
    ALL_ALERTS: 'flood_alerts',
    HIGH_RISK_ONLY: 'flood_alerts_high',
    MEDIUM_RISK: 'flood_alerts_medium'
  },

  /**
   * AI Model Configuration
   */
  AI_MODEL: {
    PATH: 'ai-model/model.json',
    INPUT_FEATURES: 5,
    OUTPUT_RANGE: [0, 1]
  },

  /**
   * Server Configuration
   */
  SERVER: {
    PORT: parseInt(process.env.PORT) || 3000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
  }
};