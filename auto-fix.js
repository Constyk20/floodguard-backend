// auto-fix.js - Automatic Problem Detection & Fixing
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🔧 FloodGuard Automatic Problem Solver');
console.log('='.repeat(70) + '\n');

const issues = [];
const fixes = [];

// Helper function to run commands safely
function runCommand(cmd, silent = false) {
  try {
    return execSync(cmd, { stdio: silent ? 'pipe' : 'inherit' }).toString();
  } catch (e) {
    return null;
  }
}

// Check 1: Node.js version
console.log('📋 Step 1: Checking Node.js...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 14) {
  issues.push('Node.js version too old');
  console.log('  ❌ Node.js ' + nodeVersion + ' (minimum: v14.0.0)');
} else {
  console.log('  ✓ Node.js ' + nodeVersion);
}

// Check 2: MongoDB
console.log('\n📋 Step 2: Checking MongoDB...');
const mongoCheck = runCommand('sc query MongoDB', true);

if (mongoCheck && mongoCheck.includes('RUNNING')) {
  console.log('  ✓ MongoDB is running');
} else {
  issues.push('MongoDB not running');
  console.log('  ⚠️  MongoDB is not running');
  
  // Try to start MongoDB
  console.log('  → Attempting to start MongoDB...');
  const started = runCommand('net start MongoDB', true);
  
  if (started) {
    console.log('  ✓ MongoDB started successfully');
    fixes.push('Started MongoDB service');
  } else {
    console.log('  ℹ️  Could not start MongoDB - will use fallback or Atlas');
    console.log('  💡 Solution: Install MongoDB or use MongoDB Atlas');
  }
}

// Check 3: .env file
console.log('\n📋 Step 3: Checking configuration...');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  issues.push('.env missing');
  console.log('  ⚠️  .env file not found');
  console.log('  → Creating .env template...');
  
  const envTemplate = `# MongoDB Configuration
# Option 1: Local MongoDB
MONGO_URI=mongodb://localhost:27017/floodguard

# Option 2: MongoDB Atlas (uncomment and update)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/floodguard?retryWrites=true&w=majority

# OpenWeatherMap API Key (Get from: https://openweathermap.org/api)
OWM_KEY=your_openweathermap_api_key_here

# Server Configuration
PORT=3000

# Optional: Firebase (for push notifications)
# Firebase configuration in firebase-service-account.json
`;
  
  fs.writeFileSync(envPath, envTemplate);
  console.log('  ✓ Created .env template');
  console.log('  ⚠️  You must update .env with your API keys!');
  fixes.push('Created .env file');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for placeholder values
  if (envContent.includes('your_openweathermap_api_key_here')) {
    issues.push('OWM_KEY not configured');
    console.log('  ⚠️  OpenWeatherMap API key not set');
    console.log('  💡 Get free key: https://openweathermap.org/api');
  } else {
    console.log('  ✓ .env file configured');
  }
}

// Check 4: TensorFlow
console.log('\n📋 Step 4: Checking TensorFlow...');
let tfWorking = false;

try {
  const tf = require('@tensorflow/tfjs-node');
  console.log('  ✓ @tensorflow/tfjs-node installed');
  tfWorking = true;
} catch (e1) {
  try {
    const tf = require('@tensorflow/tfjs');
    console.log('  ✓ @tensorflow/tfjs (CPU) installed');
    tfWorking = true;
  } catch (e2) {
    issues.push('TensorFlow not installed');
    console.log('  ⚠️  No TensorFlow version found');
    console.log('  → Installing browser-compatible version...');
    
    try {
      // Remove any broken installation
      runCommand('npm uninstall @tensorflow/tfjs-node --force', true);
      
      // Install CPU version
      console.log('  → Installing @tensorflow/tfjs...');
      runCommand('npm install @tensorflow/tfjs@4.11.0 --save');
      console.log('  → Installing CPU backend...');
      runCommand('npm install @tensorflow/tfjs-backend-cpu@4.11.0 --save');
      
      console.log('  ✓ TensorFlow.js installed');
      fixes.push('Installed TensorFlow.js CPU version');
      tfWorking = true;
      
      // Update imports in files
      updateTensorFlowImports();
      
    } catch (installError) {
      console.log('  ⚠️  TensorFlow installation failed');
      console.log('  ℹ️  System will use enhanced fallback algorithm');
    }
  }
}

// Check 5: Dependencies
console.log('\n📋 Step 5: Checking dependencies...');
const requiredPackages = [
  'express', 'socket.io', 'mongoose', 'axios', 
  'node-cron', 'firebase-admin', 'dotenv'
];

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const missingPackages = requiredPackages.filter(pkg => 
  !packageJson.dependencies[pkg]
);

if (missingPackages.length > 0) {
  issues.push('Missing packages: ' + missingPackages.join(', '));
  console.log('  ⚠️  Missing packages:', missingPackages.join(', '));
  console.log('  → Installing missing packages...');
  runCommand('npm install');
  console.log('  ✓ Dependencies installed');
  fixes.push('Installed missing packages');
} else {
  console.log('  ✓ All required packages present');
}

// Check 6: Firebase
console.log('\n📋 Step 6: Checking Firebase...');
const firebasePath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(firebasePath)) {
  console.log('  ℹ️  Firebase not configured (optional)');
  console.log('  💡 For push notifications, add firebase-service-account.json');
} else {
  console.log('  ✓ Firebase configuration exists');
}

// Check 7: AI Model
console.log('\n📋 Step 7: Checking AI model...');
const modelPath = path.join(__dirname, 'ai-model', 'model.json');

if (!fs.existsSync(modelPath)) {
  console.log('  ℹ️  AI model not trained yet');
  console.log('  💡 Run: npm run train (optional)');
} else {
  console.log('  ✓ AI model found');
}

// Check 8: Port availability
console.log('\n📋 Step 8: Checking port 3000...');
try {
  const portCheck = runCommand('netstat -ano | findstr :3000', true);
  if (portCheck && portCheck.trim()) {
    console.log('  ⚠️  Port 3000 is in use');
    console.log('  💡 Change PORT in .env or kill the process');
  } else {
    console.log('  ✓ Port 3000 is available');
  }
} catch (e) {
  console.log('  ✓ Port 3000 appears available');
}

// Helper function to update TensorFlow imports
function updateTensorFlowImports() {
  console.log('\n  → Updating TensorFlow imports...');
  
  const filesToUpdate = ['server.js', 'train-model.js', 'test-prediction.js'];
  const oldImport = "require('@tensorflow/tfjs-node')";
  const newImport = "require('@tensorflow/tfjs'); require('@tensorflow/tfjs-backend-cpu')";
  
  filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport, 'g'), newImport);
        fs.writeFileSync(filePath, content);
        console.log('    ✓ Updated ' + file);
      }
    }
  });
}

// Test MongoDB connection
async function testMongoDB() {
  console.log('\n📋 Step 9: Testing MongoDB connection...');
  try {
    require('dotenv').config();
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/floodguard', {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('  ✓ MongoDB connection successful');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('  ⚠️  MongoDB connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('  💡 Start MongoDB: net start MongoDB');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('  💡 Add your IP to MongoDB Atlas Network Access');
    }
    
    return false;
  }
}

// Summary
async function showSummary() {
  const mongoWorks = await testMongoDB();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(70) + '\n');
  
  if (issues.length === 0 && mongoWorks && tfWorking) {
    console.log('✅ ALL SYSTEMS OPERATIONAL!\n');
    console.log('Everything is working perfectly. You can start the server:\n');
    console.log('  npm start\n');
  } else {
    console.log('🔍 Issues Found: ' + issues.length + '\n');
    
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    
    console.log('\n🔧 Fixes Applied: ' + fixes.length + '\n');
    
    if (fixes.length > 0) {
      fixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }
    
    console.log('\n📋 Remaining Actions:\n');
    
    if (!mongoWorks) {
      console.log('  1. Fix MongoDB:');
      console.log('     • Start MongoDB: net start MongoDB');
      console.log('     • OR use Atlas: Update MONGO_URI in .env\n');
    }
    
    if (issues.some(i => i.includes('OWM_KEY'))) {
      console.log('  2. Configure OpenWeatherMap:');
      console.log('     • Get key: https://openweathermap.org/api');
      console.log('     • Update OWM_KEY in .env\n');
    }
    
    if (!tfWorking) {
      console.log('  3. TensorFlow (Optional):');
      console.log('     • System works with fallback algorithm');
      console.log('     • Or run: node fix-tensorflow.js\n');
    }
  }
  
  console.log('='.repeat(70));
  console.log('\n💡 Quick Actions:\n');
  console.log('  Start server:     npm start');
  console.log('  Train AI model:   npm run train');
  console.log('  Test system:      npm run test');
  console.log('  View dashboard:   http://localhost:3000\n');
  console.log('📚 Need help? Check TROUBLESHOOTING.md\n');
}

// Run diagnostic
showSummary().then(() => {
  process.exit(issues.length === 0 ? 0 : 1);
});