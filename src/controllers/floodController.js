/**
 * Flood Data Controller
 *
 * Purpose: Business logic for flood data endpoints
 *
 * Features:
 * - Latest predictions (all of Nigeria or a single state)
 * - Historical data with pagination
 * - Statistics aggregation
 * - State list with latest risk (map overview)
 * - Per-state refresh when a user taps a state
 * - Manual data ingestion trigger
 *
 * State can be passed as ?state=lagos or as a route param /states/:state
 *
 * Usage:
 *   const floodController = require('./controllers/floodController');
 *   router.get('/latest', floodController.getLatest);
 */

const FloodData = require('../models/FloodData');
const { getModelStatus } = require('../ai/model');
const { DATA_RETENTION, INGESTION } = require('../config/constants');
const { STATES, getStateBySlug } = require('../config/states');

/**
 * Builds a Mongo filter from the request's state (query or param).
 * @returns {{filter: Object, slug: string|null, invalid: boolean}}
 */
const stateFilter = (req) => {
  const raw = req.params.state || req.query.state;
  if (!raw) return { filter: {}, slug: null, invalid: false };

  const state = getStateBySlug(raw);
  if (!state) return { filter: {}, slug: null, invalid: true };

  return { filter: { state: state.slug }, slug: state.slug, invalid: false };
};

const unknownState = (res) =>
  res.status(404).json({
    success: false,
    message: 'Unknown state. Use a slug like "lagos", "cross-river" or "fct".'
  });

const serverError = (res, label, error) => {
  console.error(`${label}:`, error);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: error.message
  });
};

/**
 * @desc    Get latest flood data (optionally for one state)
 * @route   GET /api/flood/latest?state=lagos
 * @route   GET /api/flood/states/:state
 * @access  Public
 */
const getLatest = async (req, res) => {
  try {
    const { filter, invalid } = stateFilter(req);
    if (invalid) return unknownState(res);

    const latest = await FloodData.findOne(filter).sort({ timestamp: -1 }).lean();

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'No flood data available yet'
      });
    }

    res.json({ success: true, data: latest });

  } catch (error) {
    serverError(res, 'Get latest error', error);
  }
};

/**
 * @desc    Get historical flood data (optionally for one state)
 * @route   GET /api/flood/history?state=lagos
 * @route   GET /api/flood/states/:state/history
 * @access  Public
 */
const getHistory = async (req, res) => {
  try {
    const { filter, invalid } = stateFilter(req);
    if (invalid) return unknownState(res);

    const limit = Math.min(
      parseInt(req.query.limit) || DATA_RETENTION.HISTORY_LIMIT,
      DATA_RETENTION.MAX_HISTORY_LIMIT
    );

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      FloodData.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      FloodData.countDocuments(filter)
    ]);

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
    serverError(res, 'Get history error', error);
  }
};

/**
 * @desc    Get flood statistics (optionally for one state)
 * @route   GET /api/flood/stats?state=lagos
 * @access  Public
 */
const getStats = async (req, res) => {
  try {
    const { slug, invalid } = stateFilter(req);
    if (invalid) return unknownState(res);

    const stats = await FloodData.getStats(slug || undefined);
    const modelStatus = getModelStatus();

    res.json({
      success: true,
      data: {
        ...stats,
        modelStatus
      }
    });

  } catch (error) {
    serverError(res, 'Get stats error', error);
  }
};

/**
 * @desc    Get high-risk alerts (optionally for one state)
 * @route   GET /api/flood/alerts?state=lagos
 * @access  Public
 */
const getAlerts = async (req, res) => {
  try {
    const { slug, invalid } = stateFilter(req);
    if (invalid) return unknownState(res);

    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const alerts = await FloodData.getRecentHighRisk(limit, slug || undefined);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (error) {
    serverError(res, 'Get alerts error', error);
  }
};

/**
 * @desc    List all 36 states + FCT with their latest risk (for the map)
 * @route   GET /api/flood/states
 * @access  Public
 */
const getStates = async (req, res) => {
  try {
    const latestByState = await FloodData.getLatestPerState();

    res.json({
      success: true,
      count: STATES.length,
      data: STATES.map((s) => ({
        name: s.name,
        slug: s.slug,
        capital: s.capital,
        lat: s.lat,
        lng: s.lng,
        latest: latestByState[s.slug] || null
      }))
    });

  } catch (error) {
    serverError(res, 'Get states error', error);
  }
};

/**
 * @desc    Fetch fresh data for one state and run a new analysis.
 *          Default (user taps a state): a record younger than 2 minutes is reused.
 *          ?force=true (refresh button): bypasses the API caches and only
 *          rate-limits to one analysis per 15 seconds per state.
 * @route   POST /api/flood/states/:state/refresh[?force=true]
 * @access  Public (consider rate limiting / auth in production)
 */
const refreshState = async (req, res) => {
  const state = getStateBySlug(req.params.state);
  if (!state) return unknownState(res);

  try {
    const latest = await FloodData.findOne({ state: state.slug })
      .sort({ timestamp: -1 })
      .lean();

    const force = String(req.query.force).toLowerCase() === 'true';
    const maxAgeMs = force
      ? INGESTION.FORCE_REFRESH_MIN_INTERVAL_MS
      : INGESTION.REFRESH_COOLDOWN_MS;

    if (latest && Date.now() - new Date(latest.timestamp).getTime() < maxAgeMs) {
      return res.json({ success: true, cached: true, data: latest });
    }

    const { ingestForLocation } = require('../jobs/dataIngestion');
    const record = await ingestForLocation(state, req.app.get('io'), { force });

    res.json({ success: true, cached: false, data: record });

  } catch (error) {
    serverError(res, 'Refresh state error', error);
  }
};

/**
 * @desc    Trigger manual data ingestion for all states
 * @route   POST /api/flood/trigger
 * @access  Public (should be protected in production)
 */
const triggerIngestion = async (req, res) => {
  try {
    const { triggerManualIngestion } = require('../jobs/dataIngestion');
    const io = req.app.get('io');

    console.log('📍 Manual data fetch triggered via API');

    triggerManualIngestion(io).catch((err) => {
      console.error('Manual ingestion failed:', err);
    });

    res.json({
      success: true,
      message: 'Data fetch triggered successfully'
    });

  } catch (error) {
    serverError(res, 'Trigger ingestion error', error);
  }
};

module.exports = {
  getLatest,
  getHistory,
  getStats,
  getAlerts,
  getStates,
  refreshState,
  triggerIngestion
};