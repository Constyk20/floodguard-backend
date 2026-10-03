/**
 * Flood Routes
 *
 * Mount in routes/index.js:  router.use('/flood', require('./floodRoutes'));
 * (Merge with your existing flood routes file if it has extra routes.)
 */

const express = require('express');
const floodController = require('../controllers/floodController');

const router = express.Router();

// Whole-country / optional ?state=<slug>
router.get('/latest', floodController.getLatest);
router.get('/history', floodController.getHistory);
router.get('/stats', floodController.getStats);
router.get('/alerts', floodController.getAlerts);

// State-based (frontend: user taps a state)
router.get('/states', floodController.getStates);                       // all 37 + latest risk
router.get('/states/:state', floodController.getLatest);                // latest for one state
router.get('/states/:state/history', floodController.getHistory);       // history for one state
router.post('/states/:state/refresh', floodController.refreshState);    // fetch fresh data now

// Manual trigger for all states
router.post('/trigger', floodController.triggerIngestion);

module.exports = router;