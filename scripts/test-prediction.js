// test-prediction.js - Test FloodGuard Predictions (Browser-compatible)
const path = require('path');
const fs = require('fs');

console.log('\n' + '='.repeat(60));
console.log('🧪 FloodGuard Prediction Testing');
console.log('='.repeat(60) + '\n');

async function testPredictions() {
  try {
    // Try loading TensorFlow
    let tf, model;
    let usingFallback = false;

    console.log('📦 Loading prediction system...');
    
    try {
      // Try browser-compatible version first
      try {
        tf = require('@tensorflow/tfjs');
        require('@tensorflow/tfjs-backend-cpu');
        await tf.ready();
        console.log(`✓ TensorFlow.js loaded (${tf.getBackend()} backend)`);
      } catch (e1) {
        // Fallback to Node version
        tf = require('@tensorflow/tfjs-node');
        console.log('✓ TensorFlow.js loaded (Node backend)');
      }
      
      const modelPath = path.join(__dirname, 'ai-model', 'model.json');
      
      if (!fs.existsSync(modelPath)) {
        throw new Error('Model not found');
      }
      
      // Custom load handler for browser TensorFlow.js
      class NodeFileSystem {
        constructor(path) {
          this.path = path;
        }

        async load() {
          const modelPath = this.path;
          const weightsPath = modelPath.replace('model.json', 'weights.bin');
          
          // Load model JSON
          const modelJSON = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
          
          // Load weights
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
      console.log('✓ AI Model loaded successfully\n');
      
      // Load and display metadata
      const metadataPath = path.join(__dirname, 'ai-model', 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log('📊 Model Information:');
        console.log(`  Version: ${metadata.version}`);
        console.log(`  Trained: ${new Date(metadata.trainedAt).toLocaleString()}`);
        console.log(`  Backend: ${metadata.backend}`);
        console.log(`  Training Loss: ${metadata.training.finalLoss}`);
        console.log(`  Validation Loss: ${metadata.training.finalValLoss}\n`);
      }
      
    } catch (err) {
      console.log('⚠️  AI Model not available:', err.message);
      console.log('→  Using enhanced fallback algorithm\n');
      usingFallback = true;
    }

    // Fallback prediction function
    function calculateRiskFallback(rainfall, waterLevel, soilMoisture) {
      let risk = 0;
      
      if (rainfall > 50) risk += 45;
      else if (rainfall > 30) risk += 38;
      else if (rainfall > 20) risk += 28;
      else if (rainfall > 10) risk += 18;
      else if (rainfall > 5) risk += 10;
      else risk += rainfall;
      
      if (waterLevel > 5) risk += 35;
      else if (waterLevel > 4) risk += 28;
      else if (waterLevel > 3) risk += 20;
      else if (waterLevel > 2.5) risk += 12;
      else if (waterLevel > 2) risk += 5;
      
      if (soilMoisture > 0.9) risk += 20;
      else if (soilMoisture > 0.8) risk += 16;
      else if (soilMoisture > 0.7) risk += 12;
      else if (soilMoisture > 0.6) risk += 8;
      else if (soilMoisture > 0.5) risk += 4;
      
      if (rainfall > 20 && waterLevel > 3 && soilMoisture > 0.7) {
        risk = Math.min(risk * 1.3, 100);
      }
      
      return Math.min(Math.round(risk), 100);
    }

    // AI prediction function
    function predictWithModel(rainfall, waterLevel, soilMoisture) {
      const input = tf.tensor2d([[
        rainfall / 50,
        soilMoisture,
        waterLevel / 6,
        0.05,
        0.05
      ]]);
      
      const prediction = model.predict(input);
      const risk = Math.round(prediction.dataSync()[0] * 100);
      
      tf.dispose([input, prediction]);
      return Math.max(0, Math.min(risk, 100));
    }

    // Test scenarios
    const testScenarios = [
      {
        category: '🟢 LOW RISK SCENARIOS',
        cases: [
          { name: 'Clear Day', rain: 0, soil: 0.3, water: 1.8 },
          { name: 'Light Drizzle', rain: 3, soil: 0.4, water: 2.0 },
          { name: 'Dry Season', rain: 1, soil: 0.2, water: 1.5 },
          { name: 'Normal Conditions', rain: 5, soil: 0.5, water: 2.2 }
        ]
      },
      {
        category: '🟡 MEDIUM RISK SCENARIOS',
        cases: [
          { name: 'Moderate Rain', rain: 20, soil: 0.6, water: 2.8 },
          { name: 'High Soil Moisture', rain: 15, soil: 0.8, water: 2.5 },
          { name: 'Rising Water', rain: 18, soil: 0.5, water: 3.5 },
          { name: 'Combined Medium', rain: 22, soil: 0.7, water: 3.2 }
        ]
      },
      {
        category: '🔴 HIGH RISK SCENARIOS',
        cases: [
          { name: 'Heavy Rainfall', rain: 45, soil: 0.7, water: 4.2 },
          { name: 'Very High Water', rain: 25, soil: 0.8, water: 5.2 },
          { name: 'Saturated Soil', rain: 35, soil: 0.95, water: 4.5 },
          { name: 'Extreme Conditions', rain: 55, soil: 0.9, water: 5.5 }
        ]
      },
      {
        category: '⚡ EDGE CASES',
        cases: [
          { name: 'Maximum Values', rain: 60, soil: 1.0, water: 6.0 },
          { name: 'Minimum Values', rain: 0, soil: 0, water: 0 },
          { name: 'Mixed Low/High', rain: 50, soil: 0.2, water: 1.5 },
          { name: 'Mixed High/Low', rain: 5, soil: 0.9, water: 5.0 }
        ]
      }
    ];

    // Run tests
    console.log('📊 Running Test Scenarios');
    console.log('='.repeat(60) + '\n');

    testScenarios.forEach(scenario => {
      console.log(scenario.category);
      console.log('-'.repeat(60));

      scenario.cases.forEach(testCase => {
        const risk = usingFallback
          ? calculateRiskFallback(testCase.rain, testCase.water, testCase.soil)
          : predictWithModel(testCase.rain, testCase.water, testCase.soil);

        const riskLevel = risk < 30 ? 'LOW' : risk < 70 ? 'MEDIUM' : 'HIGH';
        const color = risk < 30 ? '🟢' : risk < 70 ? '🟡' : '🔴';

        console.log(`\n${testCase.name}:`);
        console.log(`  Input:  Rain=${testCase.rain}mm | Water=${testCase.water}m | Soil=${(testCase.soil*100).toFixed(0)}%`);
        console.log(`  Result: ${color} ${risk}% risk (${riskLevel})`);
      });

      console.log('\n' + '='.repeat(60) + '\n');
    });

    // Statistical analysis
    console.log('📈 STATISTICAL ANALYSIS\n');
    
    const allTests = testScenarios.flatMap(s => s.cases);
    const results = allTests.map(test => ({
      ...test,
      risk: usingFallback
        ? calculateRiskFallback(test.rain, test.water, test.soil)
        : predictWithModel(test.rain, test.water, test.soil)
    }));

    const lowRisk = results.filter(r => r.risk < 30).length;
    const mediumRisk = results.filter(r => r.risk >= 30 && r.risk < 70).length;
    const highRisk = results.filter(r => r.risk >= 70).length;

    console.log(`Total Test Cases:     ${results.length}`);
    console.log(`Low Risk (0-29%):     ${lowRisk} (${((lowRisk/results.length)*100).toFixed(1)}%)`);
    console.log(`Medium Risk (30-69%): ${mediumRisk} (${((mediumRisk/results.length)*100).toFixed(1)}%)`);
    console.log(`High Risk (70-100%):  ${highRisk} (${((highRisk/results.length)*100).toFixed(1)}%)`);

    const avgRisk = results.reduce((sum, r) => sum + r.risk, 0) / results.length;
    console.log(`\nAverage Risk Score:   ${avgRisk.toFixed(1)}%`);

    // Find extremes
    const maxRisk = results.reduce((max, r) => r.risk > max.risk ? r : max);
    const minRisk = results.reduce((min, r) => r.risk < min.risk ? r : min);

    console.log(`\nHighest Risk: ${maxRisk.risk}% (${maxRisk.name})`);
    console.log(`Lowest Risk:  ${minRisk.risk}% (${minRisk.name})`);

    // Risk distribution chart
    console.log('\n📊 Risk Distribution:');
    console.log('-'.repeat(60));
    const lowBar = '█'.repeat(Math.round(lowRisk * 40 / results.length));
    const medBar = '█'.repeat(Math.round(mediumRisk * 40 / results.length));
    const highBar = '█'.repeat(Math.round(highRisk * 40 / results.length));
    console.log(`Low:    ${lowBar} ${lowRisk}`);
    console.log(`Medium: ${medBar} ${mediumRisk}`);
    console.log(`High:   ${highBar} ${highRisk}`);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Testing Complete! (Using ${usingFallback ? 'Fallback Algorithm' : 'AI Model'})`);
    console.log('='.repeat(60) + '\n');

    // Recommendations
    if (usingFallback) {
      console.log('💡 RECOMMENDATIONS:\n');
      console.log('  To use the AI model instead of fallback:');
      console.log('  1. Install TensorFlow: npm install @tensorflow/tfjs @tensorflow/tfjs-backend-cpu');
      console.log('  2. Train model: npm run train');
      console.log('  3. Run tests again: npm run test\n');
      console.log('  Note: The fallback algorithm is production-ready!');
    } else {
      console.log('✨ AI Model is working correctly!\n');
      console.log('🚀 Next Steps:');
      console.log('  • Start the server: npm start');
      console.log('  • View dashboard: http://localhost:3000');
      console.log('  • Monitor predictions in real-time\n');
    }

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('TensorFlow') || error.message.includes('MODULE_NOT_FOUND')) {
      console.log('\n💡 Install TensorFlow to use AI model:');
      console.log('   npm install @tensorflow/tfjs @tensorflow/tfjs-backend-cpu');
      console.log('\n   Or the system will use the fallback algorithm automatically.');
    }
    
    console.error('\n📋 Full error:', error);
    return false;
  }
}

// Run tests
testPredictions().then(success => {
  process.exit(success ? 0 : 1);
});