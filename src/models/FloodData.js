/**
 * FloodData Model
 *
 * Purpose: MongoDB schema for storing flood prediction records
 *
 * Features:
 * - Per-state records (36 states + FCT)
 * - Stores environmental data (rainfall, water level, soil moisture)
 * - Tracks AI predictions and risk levels
 * - Records data sources for debugging
 *
 * Usage:
 *   const FloodData = require('./models/FloodData');
 *   const record = await FloodData.create({ ... });
 */

const mongoose = require('mongoose');

const floodDataSchema = new mongoose.Schema({
  /**
   * State this record belongs to (slug, e.g. 'lagos', 'cross-river')
   * Optional so legacy records (pre-state support) remain valid.
   */
  state: {
    type: String,
    lowercase: true,
    trim: true
  },
  stateName: {
    type: String,
    trim: true
  },

  /**
   * Geographic coordinates
   */
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },

  /**
   * Environmental measurements
   */
  rainfall: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    description: 'Rainfall in millimeters (3-hour forecast)'
  },
  waterLevel: {
    type: Number,
    required: true,
    min: 0,
    description: 'Water level index on the model scale (0-6)'
  },
  soilMoisture: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    description: 'Soil moisture (0-1 scale)'
  },

  /**
   * AI Prediction results
   */
  prediction: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    description: 'Flood risk percentage predicted by AI model'
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    description: 'Risk category: low (0-29%), medium (30-69%), high (70-100%)'
  },

  /**
   * Alert tracking
   */
  sentAlert: {
    type: Boolean,
    default: false
  },

  /**
   * Data source tracking
   */
  dataSource: {
    rainfall: { type: String, default: 'unknown' },
    waterLevel: { type: String, default: 'unknown' },
    soilMoisture: { type: String, default: 'unknown' }
  },

  /**
   * Timestamp
   */
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
floodDataSchema.index({ timestamp: -1 });
floodDataSchema.index({ state: 1, timestamp: -1 });          // per-state latest/history
floodDataSchema.index({ state: 1, riskLevel: 1, timestamp: -1 });
floodDataSchema.index({ lat: 1, lng: 1, timestamp: -1 });
floodDataSchema.index({ riskLevel: 1, timestamp: -1 });

/**
 * Instance method to check if alert should be sent
 * @returns {boolean}
 */
floodDataSchema.methods.shouldSendAlert = function () {
  return !this.sentAlert && this.riskLevel !== 'low';
};

/**
 * Get recent high-risk predictions, optionally for one state
 * @param {number} limit
 * @param {string} [state] - state slug
 */
floodDataSchema.statics.getRecentHighRisk = function (limit = 10, state) {
  const filter = { riskLevel: 'high' };
  if (state) filter.state = state;
  return this.find(filter).sort({ timestamp: -1 }).limit(limit).exec();
};

/**
 * Get statistics, optionally for one state
 * @param {string} [state] - state slug
 */
floodDataSchema.statics.getStats = async function (state) {
  const base = state ? { state } : {};

  const [total, highRisk, mediumRisk, lowRisk, latest] = await Promise.all([
    this.countDocuments(base),
    this.countDocuments({ ...base, riskLevel: 'high' }),
    this.countDocuments({ ...base, riskLevel: 'medium' }),
    this.countDocuments({ ...base, riskLevel: 'low' }),
    this.findOne(base).sort({ timestamp: -1 })
  ]);

  return {
    total,
    riskDistribution: { high: highRisk, medium: mediumRisk, low: lowRisk },
    latest
  };
};

/**
 * Latest record for every state (one per state), for the map overview
 * @returns {Promise<Object>} map of slug -> latest record
 */
floodDataSchema.statics.getLatestPerState = async function () {
  const rows = await this.aggregate([
    { $match: { state: { $exists: true, $ne: null } } },
    { $sort: { timestamp: -1 } },
    { $group: { _id: '$state', doc: { $first: '$$ROOT' } } }
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.doc]));
};

module.exports = mongoose.model('FloodData', floodDataSchema);