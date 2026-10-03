/**
 * Notification Service Module
 *
 * Purpose: Sends push notifications via Firebase Cloud Messaging
 *
 * Features:
 * - Topic-based messaging
 * - High/medium risk alerts
 * - Automatic alert tracking
 *
 * Usage:
 *   const { sendFloodAlert } = require('./services/notificationService');
 *   await sendFloodAlert(floodData);
 */

const { sendNotification, isFirebaseInitialized } = require('../config/firebase');
const { FCM_TOPICS } = require('../config/constants');

/**
 * Sends a flood alert notification
 * @param {Object} floodData - FloodData model instance
 * @returns {Promise<boolean>} Success status
 */
const sendFloodAlert = async (floodData) => {
  // Skip if Firebase not initialized or alert already sent
  if (!isFirebaseInitialized() || floodData.sentAlert) {
    return false;
  }

  // Only send alerts for medium and high risk
  if (floodData.riskLevel === 'low') {
    return false;
  }

  // Prepare notification content
  const title = `⚠️ Flood Alert: ${floodData.riskLevel.toUpperCase()} Risk`;
  const body = `${floodData.prediction}% flood probability detected near ${floodData.lat.toFixed(2)}, ${floodData.lng.toFixed(2)}. Rainfall: ${floodData.rainfall.toFixed(1)}mm`;

  // Additional data payload
  const data = {
    lat: floodData.lat,
    lng: floodData.lng,
    risk: floodData.prediction,
    level: floodData.riskLevel,
    rainfall: floodData.rainfall,
    waterLevel: floodData.waterLevel,
    timestamp: floodData.timestamp.toISOString()
  };

  // Choose topic based on risk level
  const topic = floodData.riskLevel === 'high'
    ? FCM_TOPICS.HIGH_RISK_ONLY
    : FCM_TOPICS.MEDIUM_RISK;

  try {
    // Send notification
    const messageId = await sendNotification(title, body, data, topic);

    if (messageId) {
      // Mark alert as sent
      floodData.sentAlert = true;
      await floodData.save();
      console.log('✓ Flood alert sent and marked');
      return true;
    }

    return false;

  } catch (error) {
    console.error('✗ Failed to send flood alert:', error.message);
    return false;
  }
};

/**
 * Sends a test notification
 * @returns {Promise<boolean>}
 */
const sendTestNotification = async () => {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized. Cannot send test notification.');
    return false;
  }

  const title = '🧪 FloodGuard Test Notification';
  const body = 'This is a test notification. Your alerts are configured correctly!';
  const data = { type: 'test', timestamp: new Date().toISOString() };

  const messageId = await sendNotification(title, body, data, FCM_TOPICS.ALL_ALERTS);
  return !!messageId;
};

/**
 * Sends bulk notifications to multiple topics
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Array<string>} topics - Array of topic names
 * @returns {Promise<Array<string>>} Array of successful message IDs
 */
const sendBulkNotifications = async (title, body, topics) => {
  if (!isFirebaseInitialized()) return [];

  const promises = topics.map(topic =>
    sendNotification(title, body, {}, topic)
  );

  const results = await Promise.allSettled(promises);
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
};

module.exports = {
  sendFloodAlert,
  sendTestNotification,
  sendBulkNotifications
};
