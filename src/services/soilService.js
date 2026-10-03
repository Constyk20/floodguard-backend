/**
 * Soil Moisture Service Module
 *
 * Purpose: Fetches current soil moisture for any coordinates using Open-Meteo
 * (free, no API key, global coverage).
 *
 * NOTE: The previous SoilGrids query requested "wgssd", which is not a
 * SoilGrids property, so it was most likely always falling back to 0.5.
 * SoilGrids only provides static soil properties, not live moisture.
 *
 * Features:
 * - Volumetric soil moisture (1-3cm layer), normalized to 0-1
 * - In-memory cache per location
 * - Fallback value on API failure
 *
 * Usage:
 *   const { fetchSoilMoisture } = require('./services/soilService');
 *   const data = await fetchSoilMoisture(6.60, 3.35);
 */

const axios = require('axios');
const { API_ENDPOINTS, API_TIMEOUTS, CACHE_TTL } = require('../config/constants');

// Typical saturation for volumetric soil moisture (m3/m3). Used to scale to 0-1.
const SATURATION = 0.5;

const cache = new Map(); // key -> { expires, data }
const cacheKey = (lat, lng) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

/**
 * Fetches soil moisture
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {{force?: boolean}} [options] - force: skip the cache and call the API
 * @returns {Promise<{value: number, source: string, depth?: string}>}
 */
const fetchSoilMoisture = async (lat, lng, { force = false } = {}) => {
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (!force && hit && hit.expires > Date.now()) return hit.data;

  try {
    const url =
      `${API_ENDPOINTS.OPEN_METEO}/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=soil_moisture_1_to_3cm&forecast_days=1&timezone=UTC`;

    const response = await axios.get(url, { timeout: API_TIMEOUTS.SOIL });

    const values = response.data?.hourly?.soil_moisture_1_to_3cm;
    if (!Array.isArray(values)) {
      throw new Error('Unexpected Open-Meteo soil response');
    }

    // forecast_days=1 starts at 00:00 UTC today, so index = current UTC hour
    const raw = values[new Date().getUTCHours()];
    if (typeof raw !== 'number' || Number.isNaN(raw)) {
      throw new Error('No soil moisture data available');
    }

    const moisture = Math.min(Math.max(raw / SATURATION, 0), 1);

    console.log(`  → Soil Moisture: ${(moisture * 100).toFixed(1)}% (raw ${raw.toFixed(3)} m³/m³)`);

    const data = { value: moisture, source: 'Open-Meteo', depth: '1-3cm' };
    cache.set(key, { expires: Date.now() + CACHE_TTL.SOIL, data });
    return data;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.warn('  ⚠ Soil moisture API timeout');
    } else {
      console.warn('  ⚠ Soil moisture API failed, using default:', error.message);
    }

    return { value: 0.5, source: 'fallback' };
  }
};

/**
 * Fetches static soil properties (clay/sand/silt/pH) from SoilGrids.
 * Not used in the 10-minute loop (SoilGrids is strictly rate limited).
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object|null>}
 */
const fetchSoilProperties = async (lat, lng) => {
  try {
    const properties = ['clay', 'sand', 'silt', 'phh2o'];
    const url = `${API_ENDPOINTS.SOILGRIDS}/properties/query?lon=${lng}&lat=${lat}&property=${properties.join(',')}&depth=0-5cm&value=mean`;

    const response = await axios.get(url, { timeout: API_TIMEOUTS.SOIL });
    const layers = response.data.properties.layers;

    return {
      clay: layers.find((l) => l.name === 'clay')?.depths?.[0]?.values?.mean,
      sand: layers.find((l) => l.name === 'sand')?.depths?.[0]?.values?.mean,
      silt: layers.find((l) => l.name === 'silt')?.depths?.[0]?.values?.mean,
      ph: layers.find((l) => l.name === 'phh2o')?.depths?.[0]?.values?.mean,
      source: 'SoilGrids'
    };

  } catch (error) {
    console.warn('Failed to fetch soil properties:', error.message);
    return null;
  }
};

module.exports = {
  fetchSoilMoisture,
  fetchSoilProperties
};