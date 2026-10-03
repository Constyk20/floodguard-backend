/**
 * AI Model Module
 *
 * Purpose: Handles AI model loading, prediction, and fallback logic
 *
 * Features:
 * - TensorFlow.js model loading (browser and Node backends)
 * - Normalized input preprocessing
 * - Fallback algorithm when model unavailable
 * - Risk percentage calculation
 *
 * Usage:
 *   const { predictFloodRisk, isModelLoaded } = require('./ai/model');
 *   const risk = await predictFloodRisk(25, 3.5, 0.7);
 */

const path = require('path');
const fs = require('fs');
const { NORMALIZATION, getRiskLevel } = require('../config/constants');

let model = null;
let modelLoadAttempted = false;
let usingFallback = false;
let tf = null;

/**
 * Loads TensorFlow.js model from disk
 * @returns {Promise<Object|null>} Loaded model or null
 */
const loadModel = async () => {
  if (model) return model;
  if (modelLoadAttempted) return null;

  modelLoadAttempted = true;

  try {
    // Try loading TensorFlow.js (browser-compatible first, then Node)
    try {
      tf = require('@tensorflow/tfjs');
      require('@tensorflow/tfjs-backend-cpu');
      await tf.ready();
      console.log('✓ Using TensorFlow.js (CPU backend)');
    } catch (e1) {
      try {
        tf = require('@tensorflow/tfjs-node');
        console.log('✓ Using TensorFlow.js (Node backend)');
      } catch (e2) {
        throw new Error('TensorFlow.js not installed');
      }
    }

    const modelPath = path.join(__dirname, '..', '..', 'ai-model', 'model.json');

    if (!fs.existsSync(modelPath)) {
      console.warn('⚠ Model file not found at:', modelPath);
      console.log('→ Using enhanced fallback prediction algorithm');
      usingFallback = true;
      return null;
    }

    // Custom file system loader for TensorFlow.js
    class NodeFileSystem {
      constructor(path) {
        this.path = path;
      }

      async load() {
        const modelPath = this.path;
        const weightsPath = modelPath.replace('model.json', 'weights.bin');

        const modelJSON = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
        const weightsBuffer = fs.readFileSync(weightsPath);
        const weightData = new Uint8Array(weightsBuffer).buffer;

        return {
          modelTopology: modelJSON.modelTopology,
          weightSpecs: modelJSON.weightsManifest[0].weights,
          weightData: weightData,
          format: modelJSON.format,
          generatedBy: modelJSON.generatedBy,
          convertedBy: modelJSON.convertedBy
        };
      }
    }

    const loadHandler = new NodeFileSystem(modelPath);
    model = await tf.loadLayersModel(loadHandler);
    console.log('✓ AI Model loaded successfully');
    return model;

  } catch (err) {
    console.warn('⚠ AI Model loading failed:', err.message);
    console.log('→ Using enhanced fallback prediction algorithm');
    usingFallback = true;
    return null;
  }
};

/**
 * Fallback prediction algorithm (rule-based)
 * Used when AI model is unavailable
 * @param {number} rainfall - Rainfall in mm
 * @param {number} waterLevel - Water level in meters
 * @param {number} soilMoisture - Soil moisture (0-1)
 * @returns {number} Risk percentage (0-100)
 */
const calculateRiskFallback = (rainfall, waterLevel, soilMoisture) => {
  let risk = 0;

  // Rainfall contribution (max 45 points)
  if (rainfall > 50) risk += 45;
  else if (rainfall > 30) risk += 38;
  else if (rainfall > 20) risk += 28;
  else if (rainfall > 10) risk += 18;
  else if (rainfall > 5) risk += 10;
  else risk += rainfall;

  // Water level contribution (max 35 points)
  if (waterLevel > 5) risk += 35;
  else if (waterLevel > 4) risk += 28;
  else if (waterLevel > 3) risk += 20;
  else if (waterLevel > 2.5) risk += 12;
  else if (waterLevel > 2) risk += 5;

  // Soil moisture contribution (max 20 points)
  if (soilMoisture > 0.9) risk += 20;
  else if (soilMoisture > 0.8) risk += 16;
  else if (soilMoisture > 0.7) risk += 12;
  else if (soilMoisture > 0.6) risk += 8;
  else if (soilMoisture > 0.5) risk += 4;

  // Combined risk multiplier (extreme conditions)
  if (rainfall > 20 && waterLevel > 3 && soilMoisture > 0.7) {
    risk = Math.min(risk * 1.3, 100);
  }

  return Math.min(Math.round(risk), 100);
};

/**
 * Predicts flood risk using AI model or fallback
 * @param {number} rainfall - Rainfall in mm
 * @param {number} waterLevel - Water level in meters
 * @param {number} soilMoisture - Soil moisture (0-1)
 * @returns {Promise<number>} Risk percentage (0-100)
 */
const predictFloodRisk = async (rainfall, waterLevel, soilMoisture) => {
  const loadedModel = await loadModel();

  // Use fallback if model not available
  if (!loadedModel) {
    return calculateRiskFallback(rainfall, waterLevel, soilMoisture);
  }

  try {
    // Normalize inputs for the model
    const input = tf.tensor2d([[
      rainfall / NORMALIZATION.MAX_RAINFALL,
      soilMoisture,  // Already 0-1
      waterLevel / NORMALIZATION.MAX_WATER_LEVEL,
      0.05,  // Placeholder features
      0.05
    ]], [1, 5]);

    const prediction = loadedModel.predict(input);
    const riskPercent = Math.round(prediction.dataSync()[0] * 100);

    // Clean up tensors to prevent memory leaks
    tf.dispose([input, prediction]);

    return Math.max(0, Math.min(riskPercent, 100));

  } catch (err) {
    console.warn('Model prediction error, using fallback:', err.message);
    return calculateRiskFallback(rainfall, waterLevel, soilMoisture);
  }
};

/**
 * Checks if AI model is loaded
 * @returns {boolean}
 */
const isModelLoaded = () => {
  return model !== null;
};

/**
 * Checks if using fallback algorithm
 * @returns {boolean}
 */
const isUsingFallback = () => {
  return usingFallback;
};

/**
 * Gets model status
 * @returns {string} 'ai-model' | 'fallback' | 'not-loaded'
 */
const getModelStatus = () => {
  if (model) return 'ai-model';
  if (usingFallback) return 'fallback';
  return 'not-loaded';
};

module.exports = {
  loadModel,
  predictFloodRisk,
  calculateRiskFallback,
  isModelLoaded,
  isUsingFallback,
  getModelStatus
};
