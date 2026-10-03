/**
 * Flood Data Controller
 *
 * Purpose: Business logic for flood data endpoints
 *
 * Features:
 * - Latest predictions
 * - Historical data with pagination
 * - Statistics aggregation
 * - Manual data ingestion trigger
 *
 * Usage:
 *   const floodController = require('./controllers/floodController');
 *   router.get('/latest', floodController.getLatest);
 */

const FloodData = require('../models/FloodData');
const { getModelStatus } = require('../ai/model');
const { DATA_RETENTION } = require('../config/constants');
const { STATES, getStateBySlug } = require('../config/states');

/**
 * @desc    Get latest flood data
 * @route   GET /api/flood/latest
 * @access  Public
 */
const getLatest = async (req, res) => {
  try {
    const latest = await FloodData.findOne(stateFilter(req)).sort({ timestamp: -1 }).lean();


    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'No flood data available yet'
      });
    }

    res.json({
      success: true,
      data: latest
    });

  } catch (error) {
    console.error('Get latest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get historical flood data
 * @route   GET /api/flood/history
 * @access  Public
 */
const getHistory = async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit) || DATA_RETENTION.HISTORY_LIMIT,
      DATA_RETENTION.MAX_HISTORY_LIMIT
    );

    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = stateFilter(req);
    const data = await FloodData.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
    const total = await FloodData.countDocuments(filter);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get flood statistics
 * @route   GET /api/flood/stats
 * @access  Public
 */
const getStats = async (req, res) => {
  try {
    const stats = await FloodData.getStats();
    const modelStatus = getModelStatus();

    res.json({
      success: true,
      data: {
        ...stats,
        modelStatus
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get high-risk alerts
 * @route   GET /api/flood/alerts
 * @access  Public
 */
const getAlerts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const alerts = await FloodData.getRecentHighRisk(limit);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Trigger manual data ingestion
 * @route   POST /api/flood/trigger
 * @access  Public (should be protected in production)
 */
const triggerIngestion = async (req, res) => {
  try {
    const { triggerManualIngestion } = require('../jobs/dataIngestion');
    const io = req.app.get('io');  // Get Socket.io instance from app

    console.log('📍 Manual data fetch triggered via API');

    // Trigger ingestion asynchronously
    triggerManualIngestion(io).catch(err => {
      console.error('Manual ingestion failed:', err);
    });

    res.json({
      success: true,
      message: 'Data fetch triggered successfully'
    });

  } catch (error) {
    console.error('Trigger ingestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @route GET /api/flood/states
 * Returns all 37 locations with their latest risk (for coloring the map)
 */
const getStates = async (req, res) => {
  try {
    const latestPerState = await FloodData.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$state', doc: { $first: '$$ROOT' } } }
    ]);
    const byState = Object.fromEntries(latestPerState.map(r => [r._id, r.doc]));

    res.json({
      success: true,
      count: STATES.length,
      data: STATES.map(s => ({ ...s, latest: byState[s.slug] || null }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @route POST /api/flood/states/:state/refresh
 * Called when the user taps a state: fetches fresh data for that state
 */
const refreshState = async (req, res) => {
  const state = getStateBySlug(req.params.state);
  if (!state) {
    return res.status(404).json({ success: false, message: 'Unknown state' });
  }
  try {
    const { ingestForLocation } = require('../jobs/dataIngestion');
    const record = await ingestForLocation(state, req.app.get('io'));
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const stateFilter = (req) => {
  const slug = req.query.state || req.params.state;
  return slug ? { state: String(slug).toLowerCase() } : {};
};



module.exports = {
  getLatest,
  getHistory,
  getStats,
  getAlerts,
  triggerIngestion,
  refreshState,
  getStates
};
