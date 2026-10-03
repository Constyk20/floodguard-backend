/**
 * Water Level Service Module
 *
 * Purpose: Fetches river discharge data from Open-Meteo Flood API (GloFAS)
 *
 * Features:
 * - Global coverage (works for any lat/lng, including Nigeria)
 * - Free, no API key required
 * - GloFAS (Global Flood Awareness System) river discharge data
 * - Output always clamped to the model's 0-6 range (never negative)
 * - Per-location in-memory cache (keeps 37-state ingestion within free limits)
 * - Fallback value on API failure
 *
 * API: https://open-meteo.com/en/docs/flood-api
 *
 * Usage:
 *   const { fetchWaterLevel } = require('./services/waterLevelService');
 *   const data = await fetchWaterLevel(6.45, 3.39); // Lagos, Nigeria
 */

const axios = require('axios');
const { API_TIMEOUTS, CACHE_TTL } = require('../config/constants');

const FLOOD_API_URL = 'https://flood-api.open-meteo.com/v1/flood';
const MAX_LEVEL = 6;
const CACHE_TTL_MS = (CACHE_TTL && CACHE_TTL.WATER) || 60 * 60 * 1000; // 1 hour

const cache = new Map(); // key -> { expires, data }
const cacheKey = (lat, lng) => `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;

/**
 * Converts discharge (m³/s) to the model's 0-6 scale using log10.
 *
 *   discharge:  0.1   1     10    100   1000  10000  100000+
 *   level:      0     0     1     2     3     4      5 (capped at 6)
 *
 * Values below 1 m³/s (including 0 / dry rivers) map to 0, so the result
 * is never negative (negative values fail the FloodData schema's min: 0).
 *
 * @param {number} discharge - River discharge in m³/s
 * @returns {number} 0 - 6
 */
const normalizeDischarge = (discharge) => {
  if (!Number.isFinite(discharge) || discharge <= 0) return 0;
  const level = Math.log10(discharge);
  return Math.min(Math.max(level, 0), MAX_LEVEL);
};

/**
 * Fetches river discharge from Open-Meteo Flood API (GloFAS)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{value: number, source: string, raw?: number, unit?: string}>}
 */
const fetchWaterLevel = async (lat, lng) => {
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  try {
    const response = await axios.get(FLOOD_API_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'river_discharge',
        forecast_days: 1 // only need today
      },
      timeout: API_TIMEOUTS.WATER
    });

    // Latest river discharge value (m³/s)
    const discharge = response.data.daily?.river_discharge?.[0];

    if (discharge === undefined || discharge === null) {
      throw new Error('No river discharge data available for this location');
    }

    const normalizedValue = normalizeDischarge(discharge);

    console.log(`  → River Discharge: ${discharge.toFixed(1)} m³/s (normalized: ${normalizedValue.toFixed(2)})`);

    const data = {
      value: normalizedValue,
      source: 'Open-Meteo GloFAS',
      raw: discharge, // keep raw value for reference
      unit: 'm³/s'
    };

    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
    return data;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.warn('  ⚠ Open-Meteo API timeout');
    } else if (error.response) {
      console.warn(`  ⚠ Open-Meteo API error: ${error.response.status}`);
    } else {
      console.warn('  ⚠ Open-Meteo API failed:', error.message);
    }

    // Fallback (medium baseline for model)
    return {
      value: 2.5,
      source: 'fallback',
      unit: 'normalized (0-6)'
    };
  }
};

/**
 * Fetches 7-day river discharge forecast
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Array|null>}
 */
const fetchRiverDischargeForecast = async (lat, lng) => {
  try {
    const response = await axios.get(FLOOD_API_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'river_discharge',
        forecast_days: 7
      },
      timeout: API_TIMEOUTS.WATER
    });

    const data = response.data.daily;
    if (!data?.river_discharge) return null;

    return data.time.map((date, i) => ({
      date,
      discharge: data.river_discharge[i],
      normalized: normalizeDischarge(data.river_discharge[i])
    }));

  } catch (error) {
    console.warn('Failed to fetch river discharge forecast:', error.message);
    return null;
  }
};

/**
 * Gets additional flood indicators from Open-Meteo
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>}
 */
const fetchFloodIndicators = async (lat, lng) => {
  try {
    const response = await axios.get(FLOOD_API_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'river_discharge'
      },
      timeout: API_TIMEOUTS.WATER
    });

    return {
      // ?? (not ||) so a real discharge of 0 isn't turned into null
      discharge: response.data.daily?.river_discharge?.[0] ?? null,
      source: 'Open-Meteo GloFAS',
      location: {
        lat: response.data.latitude,
        lng: response.data.longitude,
        elevation: response.data.elevation
      }
    };

  } catch (error) {
    console.warn('Failed to fetch flood indicators:', error.message);
    return null;
  }
};

module.exports = {
  fetchWaterLevel,
  fetchRiverDischargeForecast,
  fetchFloodIndicators,
  normalizeDischarge
};