// fix-tensorflow.js - Alternative TensorFlow Setup for Windows
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🔧 Windows TensorFlow.js Alternative Setup');
console.log('='.repeat(60) + '\n');

async function setupTensorFlow() {
  console.log('🔍 Analyzing the issue...\n');
  console.log('The native TensorFlow build is failing on Windows.');
  console.log('We have 3 options:\n');
  
  console.log('Option 1: Use @tensorflow/tfjs (CPU - browser-like, works everywhere)');
  console.log('Option 2: Use @tensorflow/tfjs-node (Native - faster, Windows issues)');
  console.log('Option 3: Skip AI model entirely (Use enhanced fallback)\n');

  // Check current installation
  const nodeModulesPath = path.join(__dirname, 'node_modules', '@tensorflow');
  
  console.log('📦 Attempting Option 1: Browser-compatible TensorFlow...\n');
  
  try {
    // Remove problematic native version
    console.log('→ Removing @tensorflow/tfjs-node...');
    try {
      execSync('npm uninstall @tensorflow/tfjs-node --force', { stdio: 'inherit' });
    } catch (e) {
      console.log('  (Already removed or not installed)');
    }

    // Install browser-compatible version
    console.log('\n→ Installing @tensorflow/tfjs (CPU version)...');
    execSync('npm install @tensorflow/tfjs@4.11.0', { stdio: 'inherit' });

    console.log('\n→ Installing CPU backend...');
    execSync('npm install @tensorflow/tfjs-backend-cpu@4.11.0', { stdio: 'inherit' });

    console.log('\n✅ Successfully installed TensorFlow.js CPU version!\n');
    
    console.log('⚠️  Note: This version is slightly slower but works on all systems.');
    console.log('✓ No native compilation required');
    console.log('✓ Cross-platform compatible\n');

    // Create a test file
    console.log('🧪 Testing installation...');
    const testCode = `
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');

async function test() {
  await tf.ready();
  console.log('✓ TensorFlow.js is working!');
  console.log('  Backend:', tf.getBackend());
  console.log('  Version:', tf.version.tfjs);
  
  // Simple test
  const a = tf.tensor([1, 2, 3, 4]);
  const b = tf.tensor([10, 20, 30, 40]);
  const c = a.add(b);
  console.log('  Test computation: [1,2,3,4] + [10,20,30,40] =', c.dataSync());
  
  tf.dispose([a, b, c]);
}

test().catch(err => {
  console.error('✗ Test failed:', err.message);
  process.exit(1);
});
`;

    fs.writeFileSync('test-tf.js', testCode);
    execSync('node test-tf.js', { stdio: 'inherit' });
    fs.unlinkSync('test-tf.js');

    console.log('\n✅ TensorFlow.js is working correctly!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.log('\n💡 Recommendation: Use the enhanced fallback algorithm');
    console.log('   The system works great without TensorFlow!\n');
    return false;
  }
}

// Update server.js to use tfjs instead of tfjs-node
function updateServerCode() {
  console.log('📝 Updating server.js for browser-compatible TensorFlow...\n');
  
  const serverPath = path.join(__dirname, 'server.js');
  let serverCode = fs.readFileSync(serverPath, 'utf8');

  // Replace tfjs-node with tfjs
  const oldImport = "require('@tensorflow/tfjs-node')";
  const newImport = "require('@tensorflow/tfjs'); require('@tensorflow/tfjs-backend-cpu')";
  
  if (serverCode.includes(oldImport)) {
    serverCode = serverCode.replace(new RegExp(oldImport, 'g'), newImport);
    
    // Backup original
    fs.writeFileSync(serverPath + '.backup', fs.readFileSync(serverPath));
    
    // Save updated version
    fs.writeFileSync(serverPath, serverCode);
    
    console.log('✓ Updated server.js');
    console.log('✓ Backup saved as server.js.backup\n');
  } else {
    console.log('ℹ️  server.js already configured\n');
  }

  // Update train-model.js
  const trainPath = path.join(__dirname, 'train-model.js');
  if (fs.existsSync(trainPath)) {
    let trainCode = fs.readFileSync(trainPath, 'utf8');
    if (trainCode.includes(oldImport)) {
      trainCode = trainCode.replace(new RegExp(oldImport, 'g'), newImport);
      fs.writeFileSync(trainPath + '.backup', fs.readFileSync(trainPath));
      fs.writeFileSync(trainPath, trainCode);
      console.log('✓ Updated train-model.js\n');
    }
  }

  // Update test-prediction.js
  const testPath = path.join(__dirname, 'test-prediction.js');
  if (fs.existsSync(testPath)) {
    let testCode = fs.readFileSync(testPath, 'utf8');
    if (testCode.includes(oldImport)) {
      testCode = testCode.replace(new RegExp(oldImport, 'g'), newImport);
      fs.writeFileSync(testPath + '.backup', fs.readFileSync(testPath));
      fs.writeFileSync(testPath, testCode);
      console.log('✓ Updated test-prediction.js\n');
    }
  }
}

// Main execution
(async () => {
  const success = await setupTensorFlow();
  
  if (success) {
    updateServerCode();
    
    console.log('='.repeat(60));
    console.log('✅ Setup Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 What changed:\n');
    console.log('  • Switched from @tensorflow/tfjs-node to @tensorflow/tfjs');
    console.log('  • Using CPU backend (no native compilation)');
    console.log('  • Updated server.js, train-model.js, test-prediction.js');
    console.log('  • Backups saved with .backup extension\n');
    console.log('🚀 Next steps:\n');
    console.log('  1. Fix MongoDB connection (see below)');
    console.log('  2. Run: npm run train');
    console.log('  3. Run: npm start\n');
  } else {
    console.log('='.repeat(60));
    console.log('ℹ️  Fallback Mode');
    console.log('='.repeat(60));
    console.log('\nThe enhanced fallback algorithm will be used.');
    console.log('This is perfectly fine for production use!\n');
  }

  process.exit(success ? 0 : 1);
})();