/**
 * Flood Routes
 *
 * Purpose: API endpoints for flood prediction data
 *
 * Routes:
 * - GET  /api/flood/latest      - Get latest prediction
 * - GET  /api/flood/history     - Get historical data (paginated)
 * - GET  /api/flood/stats       - Get statistics summary
 * - GET  /api/flood/alerts      - Get recent high-risk alerts
 * - POST /api/flood/trigger     - Manually trigger data fetch
 */

const express = require('express');
const router = express.Router();
const {
  getLatest,
  getHistory,
  getStats,
  getAlerts,
  triggerIngestion,
  getStates,
  refreshState
} = require('../controllers/floodController');

// Public routes
router.get('/states', getStates);
router.get('/latest', getLatest);            // also accepts ?state=kano
router.get('/history', getHistory);          // also accepts ?state=kano
router.post('/states/:state/refresh',refreshState);
router.get('/stats', getStats);
router.get('/alerts',getAlerts);

// Manual trigger (consider protecting this in production)
router.post('/trigger', triggerIngestion);

module.exports = router;
