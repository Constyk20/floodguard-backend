/**
 * Data Ingestion Job
 *
 * Purpose: Scheduled task that fetches environmental data and makes flood
 * predictions for every Nigerian state (36 states + FCT).
 *
 * Features:
 * - Runs every 10 minutes (configurable via cron)
 * - Loops through all states sequentially with a small delay (API friendly)
 * - Per-state failures don't stop the rest
 * - Overlap protection (a slow run won't stack with the next one)
 * - Stores results in MongoDB, broadcasts via WebSocket rooms
 * - Sends alerts for medium/high risk
 *
 * Usage:
 *   const { startDataIngestion } = require('./jobs/dataIngestion');
 *   startDataIngestion(io);
 */

const cron = require('node-cron');
const FloodData = require('../models/FloodData');
const { fetchRainfall } = require('../services/weatherService');
const { fetchWaterLevel } = require('../services/waterLevelService');
const { fetchSoilMoisture } = require('../services/soilService');
const { sendFloodAlert } = require('../services/notificationService');
const { predictFloodRisk, isUsingFallback } = require('../ai/model');
const { broadcastFloodUpdate } = require('../sockets/floodSocket');
const { STATES } = require('../config/states');
const { CRON_SCHEDULE, INGESTION, getRiskLevel } = require('../config/constants');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let isRunning = false;

/**
 * Fetches data, predicts and stores a record for ONE state
 * @param {Object} state - entry from config/states.js
 * @param {Object} [io] - Socket.io instance
 * @param {{force?: boolean}} [options] - force: bypass service caches (manual refresh)
 * @returns {Promise<Object>} saved record (plain object)
 */
const ingestForLocation = async (state, io, { force = false } = {}) => {
  const { lat, lng, name, slug } = state;
  console.log(`\n📍 ${name} (${lat}, ${lng})`);

  const [rainfallData, waterLevelData, soilMoistureData] = await Promise.all([
    fetchRainfall(lat, lng),
    fetchWaterLevel(lat, lng, { force }),
    fetchSoilMoisture(lat, lng, { force })
  ]);

  const riskPercent = await predictFloodRisk(
    rainfallData.value,
    waterLevelData.value,
    soilMoistureData.value
  );

  const riskLevel = getRiskLevel(riskPercent);
  const modelType = isUsingFallback() ? 'Fallback Algorithm' : 'AI Model';

  console.log(`📊 ${name}: ${riskPercent}% risk (${riskLevel.toUpperCase()}) [${modelType}]`);

  const newData = new FloodData({
    state: slug,
    stateName: name,
    lat,
    lng,
    rainfall: rainfallData.value,
    waterLevel: waterLevelData.value,
    soilMoisture: soilMoistureData.value,
    prediction: riskPercent,
    riskLevel,
    dataSource: {
      rainfall: rainfallData.source,
      waterLevel: waterLevelData.source,
      soilMoisture: soilMoistureData.source
    }
  });

  await newData.save();

  const record = newData.toObject();

  if (io) {
    broadcastFloodUpdate(io, record);
  }

  // Alert failures must not lose the saved record
  if (riskLevel !== 'low') {
    try {
      await sendFloodAlert(newData);
    } catch (err) {
      console.error(`  ⚠ Alert failed for ${name}:`, err.message);
    }
  }

  return record;
};

/**
 * Ingests every state, one after another
 * @param {Object} [io] - Socket.io instance
 */
const ingestAllStates = async (io) => {
  if (isRunning) {
    console.warn('⏭  Previous ingestion still running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();

  console.log('\n' + '='.repeat(50));
  console.log(`🔄 Fetching flood data for ${STATES.length} locations...`);
  console.log('='.repeat(50));

  let ok = 0;
  let failed = 0;

  try {
    for (const state of STATES) {
      try {
        await ingestForLocation(state, io);
        ok++;
      } catch (err) {
        failed++;
        console.error(`✗ ${state.name} failed:`, err.message);
      }
      await sleep(INGESTION.DELAY_BETWEEN_STATES_MS);
    }
  } finally {
    isRunning = false;
  }

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✓ Ingestion done in ${secs}s — ${ok} succeeded, ${failed} failed`);
  console.log('='.repeat(50) + '\n');
};

/**
 * Starts the cron job for data ingestion
 * @param {Object} io - Socket.io instance
 * @returns {Object} Cron job instance
 */
const startDataIngestion = (io) => {
  console.log(`\n⏰ Scheduling data ingestion: ${CRON_SCHEDULE}`);

  const job = cron.schedule(CRON_SCHEDULE, () => {
    ingestAllStates(io).catch((err) => console.error('Scheduled ingestion failed:', err));
  });

  console.log('✓ Data ingestion job scheduled');

  console.log('🚀 Running initial data fetch...');
  ingestAllStates(io).catch((err) => {
    console.error('Initial data fetch failed:', err);
  });

  return job;
};

/**
 * Manual trigger (all states)
 * @param {Object} io - Socket.io instance
 */
const triggerManualIngestion = async (io) => {
  console.log('🔧 Manual data ingestion triggered');
  await ingestAllStates(io);
};

module.exports = {
  startDataIngestion,
  triggerManualIngestion,
  ingestAllStates,
  ingestForLocation,
  ingestData: ingestAllStates // backwards-compatible alias
};