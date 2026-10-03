/**
 * Weather Service Module
 *
 * Purpose: Fetches real-time rainfall data from OpenWeatherMap API
 *
 * Features:
 * - 3-hour rainfall forecast
 * - Probability of precipitation (PoP)
 * - Graceful fallback on API failure
 * - Request timeout handling
 *
 * Usage:
 *   const { fetchRainfall } = require('./services/weatherService');
 *   const data = await fetchRainfall(6.45, 3.39);
 */

const axios = require('axios');
const { API_ENDPOINTS, API_TIMEOUTS } = require('../config/constants');

/**
 * Fetches rainfall data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{value: number, source: string, pop?: number}>}
 */
const fetchRainfall = async (lat, lng) => {
  try {
    const apiKey = process.env.OWM_KEY;

    if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
      console.warn('  ⚠ OpenWeatherMap API key not configured');
      return { value: 0, source: 'fallback (no API key)' };
    }

    const url = `${API_ENDPOINTS.OPENWEATHERMAP}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url, {
      timeout: API_TIMEOUTS.WEATHER
    });

    // Get first forecast entry (next 3 hours)
    const forecast = response.data.list[0];
    const rainfall = forecast.rain?.['3h'] || 0;  // 3-hour rainfall in mm
    const pop = (forecast.pop * 100).toFixed(1);  // Probability of precipitation

    console.log(`  → Rainfall: ${rainfall.toFixed(2)}mm (3h) | PoP: ${pop}%`);

    return {
      value: rainfall,
      source: 'OpenWeatherMap',
      pop: parseFloat(pop)
    };

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.warn('  ⚠ OpenWeatherMap API timeout');
    } else if (error.response) {
      console.warn(`  ⚠ OpenWeatherMap API error: ${error.response.status}`);
    } else {
      console.warn('  ⚠ OpenWeatherMap failed:', error.message);
    }

    // Return fallback value
    return { value: 0, source: 'fallback' };
  }
};

/**
 * Fetches current weather conditions
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>}
 */
const fetchCurrentWeather = async (lat, lng) => {
  try {
    const apiKey = process.env.OWM_KEY;
    if (!apiKey) return null;

    const url = `${API_ENDPOINTS.OPENWEATHERMAP}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url, {
      timeout: API_TIMEOUTS.WEATHER
    });

    return {
      temp: response.data.main.temp,
      humidity: response.data.main.humidity,
      pressure: response.data.main.pressure,
      description: response.data.weather[0].description,
      windSpeed: response.data.wind.speed
    };

  } catch (error) {
    console.warn('Failed to fetch current weather:', error.message);
    return null;
  }
};

module.exports = {
  fetchRainfall,
  fetchCurrentWeather
};
