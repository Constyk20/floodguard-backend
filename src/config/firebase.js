/**
 * Firebase Configuration Module
 *
 * Purpose: Initializes Firebase Admin SDK for push notifications
 *
 * Features:
 * - Firebase Cloud Messaging (FCM) integration
 * - Handles missing credentials gracefully
 * - Topic-based notifications for flood alerts
 *
 * Usage:
 *   const { sendNotification, isFirebaseInitialized } = require('./config/firebase');
 *   if (isFirebaseInitialized()) {
 *     await sendNotification(title, body, data);
 *   }
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * @returns {boolean} Whether initialization was successful
 */
const initializeFirebase = () => {
  try {
    const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️  Firebase service account file not found');
      console.log('   Push notifications will be disabled');
      return false;
    }

    const serviceAccount = require(serviceAccountPath);

    // Check if it's a placeholder
    if (serviceAccount.project_id === 'your-project-id') {
      console.warn('⚠️  Firebase credentials are placeholders');
      console.log('   Push notifications will be disabled');
      return false;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✓ Firebase initialized successfully');
    return true;

  } catch (error) {
    console.error('✗ Firebase initialization failed:', error.message);
    console.log('  Push notifications will be disabled');
    return false;
  }
};

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
const isFirebaseInitialized = () => {
  return firebaseInitialized;
};

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @param {string} topic - FCM topic (default: 'flood_alerts')
 * @returns {Promise<string|null>} Message ID or null if failed
 */
const sendNotification = async (title, body, data = {}, topic = 'flood_alerts') => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return null;
  }

  const message = {
    notification: { title, body },
    topic,
    data: Object.keys(data).reduce((acc, key) => {
      acc[key] = String(data[key]);
      return acc;
    }, {})
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✓ FCM notification sent:', response);
    return response;
  } catch (error) {
    console.error('✗ FCM send error:', error.message);
    return null;
  }
};

module.exports = {
  initializeFirebase,
  isFirebaseInitialized,
  sendNotification
};
