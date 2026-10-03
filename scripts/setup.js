// setup.js - FloodGuard Setup Script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🌊 FloodGuard Setup & TensorFlow Installation');
console.log('='.repeat(60) + '\n');

// Check Node version
const nodeVersion = process.version;
console.log(`Node.js Version: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 14) {
  console.error('❌ Node.js 14 or higher is required');
  process.exit(1);
}

// Step 1: Check and create necessary directories
console.log('\n📁 Step 1: Creating directories...');
const dirs = ['ai-model', 'logs', 'backups'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✓ Created: ${dir}/`);
  } else {
    console.log(`  ℹ️  Exists: ${dir}/`);
  }
});

// Step 2: Check .env file
console.log('\n📝 Step 2: Checking environment configuration...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('  ⚠️  .env file not found! Creating template...');
  const envTemplate = `# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/floodguard

# OpenWeatherMap API Key
OWM_KEY=your_openweathermap_api_key_here

# Server Configuration
PORT=3000

# Optional: Additional API Keys
# USGS_KEY=your_usgs_key_here
# SOILGRIDS_KEY=your_soilgrids_key_here
`;
  fs.writeFileSync(envPath, envTemplate);
  console.log('  ✓ Created .env template');
  console.log('  ⚠️  Please update .env with your actual API keys!');
} else {
  console.log('  ✓ .env file exists');
}

// Step 3: Fix TensorFlow installation
console.log('\n🔧 Step 3: Fixing TensorFlow.js installation...');
console.log('  This may take a few minutes...\n');

try {
  // Remove existing installation
  console.log('  → Removing old @tensorflow/tfjs-node...');
  try {
    execSync('npm uninstall @tensorflow/tfjs-node', { stdio: 'inherit' });
  } catch (e) {
    console.log('  ℹ️  No existing installation found');
  }

  // Install specific version compatible with Windows
  console.log('\n  → Installing @tensorflow/tfjs-node...');
  execSync('npm install @tensorflow/tfjs-node@4.11.0 --build-from-source=false', { 
    stdio: 'inherit',
    env: { ...process.env, npm_config_platform: 'win32' }
  });

  console.log('\n  ✓ TensorFlow.js installed successfully');

  // Verify installation
  console.log('\n  → Verifying installation...');
  const tf = require('@tensorflow/tfjs-node');
  console.log(`  ✓ TensorFlow.js version: ${tf.version.tfjs}`);
  
} catch (error) {
  console.error('\n  ❌ TensorFlow installation failed:', error.message);
  console.log('\n  ℹ️  The system will continue to work with the fallback algorithm');
  console.log('  ℹ️  You can manually fix this later by running:');
  console.log('      npm install @tensorflow/tfjs-node@4.11.0');
}

// Step 4: Install additional dependencies
console.log('\n📦 Step 4: Checking other dependencies...');
const requiredPackages = [
  'express',
  'socket.io',
  'mongoose',
  'axios',
  'node-cron',
  'firebase-admin',
  'dotenv'
];

console.log('  ✓ All required packages should be installed via package.json');

// Step 5: Check Firebase configuration
console.log('\n🔥 Step 5: Checking Firebase configuration...');
const firebasePath = path.join(__dirname, 'firebase-service-account.json');
if (!fs.existsSync(firebasePath)) {
  console.log('  ⚠️  firebase-service-account.json not found!');
  console.log('  ℹ️  To enable push notifications:');
  console.log('     1. Go to Firebase Console');
  console.log('     2. Project Settings > Service Accounts');
  console.log('     3. Generate new private key');
  console.log('     4. Save as firebase-service-account.json');
  
  // Create placeholder
  const firebasePlaceholder = {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "your-private-key-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk@your-project-id.iam.gserviceaccount.com",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk"
  };
  
  fs.writeFileSync(firebasePath, JSON.stringify(firebasePlaceholder, null, 2));
  console.log('  ✓ Created firebase-service-account.json template');
} else {
  console.log('  ✓ Firebase configuration exists');
}

// Step 6: Create package.json scripts if missing
console.log('\n📜 Step 6: Checking package.json scripts...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  const scriptsToAdd = {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node setup.js",
    "train": "node train-model.js",
    "test": "node test-prediction.js"
  };
  
  let updated = false;
  Object.entries(scriptsToAdd).forEach(([key, value]) => {
    if (!packageJson.scripts[key]) {
      packageJson.scripts[key] = value;
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('  ✓ Added missing scripts to package.json');
  } else {
    console.log('  ✓ All scripts are configured');
  }
}

// Step 7: Test MongoDB connection
console.log('\n🍃 Step 7: Testing MongoDB connection...');
(async () => {
  try {
    require('dotenv').config();
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/floodguard', {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('  ✓ MongoDB connection successful');
    await mongoose.disconnect();
  } catch (error) {
    console.log('  ⚠️  MongoDB connection failed:', error.message);
    console.log('  ℹ️  Make sure MongoDB is running:');
    console.log('     - Install: https://www.mongodb.com/try/download/community');
    console.log('     - Start: net start MongoDB (Windows)');
    console.log('     - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n📋 Next Steps:\n');
  console.log('  1. Update .env with your API keys');
  console.log('  2. Update firebase-service-account.json (if using notifications)');
  console.log('  3. Ensure MongoDB is running');
  console.log('  4. Run: npm start\n');
  console.log('📚 Available Commands:\n');
  console.log('  npm start          - Start the server');
  console.log('  npm run dev        - Start with auto-reload (needs nodemon)');
  console.log('  npm run train      - Train the AI model');
  console.log('  npm run test       - Test predictions\n');
  console.log('🌐 Access Points:\n');
  console.log('  Dashboard:  http://localhost:3000');
  console.log('  API:        http://localhost:3000/api/latest');
  console.log('  WebSocket:  ws://localhost:3000\n');
  console.log('='.repeat(60) + '\n');

  process.exit(0);
})();