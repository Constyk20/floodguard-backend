// train-model.js - Train Flood Prediction AI Model (Browser-compatible)
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🤖 FloodGuard AI Model Training');
console.log('='.repeat(60) + '\n');

async function trainModel() {
  let tf;
  
  try {
    console.log('📦 Loading TensorFlow.js...');
    
    // Try browser-compatible version first
    try {
      tf = require('@tensorflow/tfjs');
      require('@tensorflow/tfjs-backend-cpu');
      await tf.ready();
      console.log(`✓ TensorFlow.js loaded (CPU backend)`);
    } catch (e1) {
      // Fallback to Node version
      try {
        tf = require('@tensorflow/tfjs-node');
        console.log(`✓ TensorFlow.js loaded (Node backend)`);
      } catch (e2) {
        throw new Error('TensorFlow.js not installed. Run: npm install @tensorflow/tfjs @tensorflow/tfjs-backend-cpu');
      }
    }
    
    console.log(`  Version: ${tf.version.tfjs}`);
    console.log(`  Backend: ${tf.getBackend()}\n`);

    // Training data: [rainfall(mm), soilMoisture(0-1), waterLevel(m), dummy1, dummy2]
    // Labels: flood risk (0-1)
    console.log('📊 Generating training data...');
    
    const trainingData = [];
    const labels = [];
    
    // Generate 1000 synthetic training examples
    for (let i = 0; i < 1000; i++) {
      const rainfall = Math.random() * 60;
      const soilMoisture = Math.random();
      const waterLevel = Math.random() * 6;
      
      // Calculate risk based on conditions
      let risk = 0;
      
      // Rainfall contribution
      if (rainfall > 40) risk += 0.5;
      else if (rainfall > 25) risk += 0.35;
      else if (rainfall > 15) risk += 0.2;
      else risk += rainfall / 100;
      
      // Water level contribution
      if (waterLevel > 4.5) risk += 0.4;
      else if (waterLevel > 3.5) risk += 0.25;
      else if (waterLevel > 2.5) risk += 0.15;
      else risk += waterLevel / 30;
      
      // Soil moisture contribution
      if (soilMoisture > 0.85) risk += 0.25;
      else if (soilMoisture > 0.7) risk += 0.15;
      else risk += soilMoisture / 10;
      
      // Combined effect multiplier
      if (rainfall > 30 && waterLevel > 4 && soilMoisture > 0.8) {
        risk = Math.min(risk * 1.4, 1.0);
      }
      
      risk = Math.min(risk, 1.0);
      
      trainingData.push([
        rainfall / 50,      // Normalize
        soilMoisture,
        waterLevel / 6,
        Math.random() * 0.1, // Dummy features
        Math.random() * 0.1
      ]);
      
      labels.push([risk]);
    }
    
    console.log(`✓ Generated ${trainingData.length} training examples\n`);

    // Convert to tensors
    console.log('🔢 Creating tensors...');
    const xs = tf.tensor2d(trainingData);
    const ys = tf.tensor2d(labels);
    console.log(`  Input shape: [${xs.shape}]`);
    console.log(`  Output shape: [${ys.shape}]\n`);

    // Create the model
    console.log('🏗️  Building neural network architecture...');
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [5], 
          units: 32, 
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ 
          units: 16, 
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ 
          units: 8, 
          activation: 'relu' 
        }),
        tf.layers.dense({ 
          units: 1, 
          activation: 'sigmoid' 
        })
      ]
    });

    console.log('✓ Model architecture created\n');
    
    // Model summary
    console.log('📋 Model Summary:');
    console.log('-'.repeat(60));
    model.summary();
    console.log('-'.repeat(60) + '\n');

    // Compile the model
    console.log('⚙️  Compiling model...');
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae']
    });
    console.log('✓ Model compiled\n');

    // Train the model
    console.log('🎓 Training model (this may take 1-2 minutes)...\n');
    const history = await model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if ((epoch + 1) % 10 === 0) {
            console.log(
              `  Epoch ${(epoch + 1).toString().padStart(3, ' ')}/100 - ` +
              `loss: ${logs.loss.toFixed(4)} - ` +
              `val_loss: ${logs.val_loss.toFixed(4)} - ` +
              `mae: ${logs.mae.toFixed(4)}`
            );
          }
        }
      }
    });

    console.log('\n✓ Training complete!\n');

    // Evaluate model
    console.log('📈 Final Training Metrics:');
    const finalLoss = history.history.loss[history.history.loss.length - 1];
    const finalValLoss = history.history.val_loss[history.history.val_loss.length - 1];
    const finalMae = history.history.mae[history.history.mae.length - 1];
    
    console.log(`  Training Loss:    ${finalLoss.toFixed(4)}`);
    console.log(`  Validation Loss:  ${finalValLoss.toFixed(4)}`);
    console.log(`  Mean Abs Error:   ${finalMae.toFixed(4)}\n`);

    // Test predictions
    console.log('🧪 Testing model predictions...\n');
    const testCases = [
      { name: 'Low Risk (Clear Day)', rain: 5, soil: 0.3, water: 1.5, expected: 'low' },
      { name: 'Low Risk (Light Rain)', rain: 10, soil: 0.4, water: 2.0, expected: 'low' },
      { name: 'Medium Risk (Moderate)', rain: 25, soil: 0.7, water: 3.2, expected: 'medium' },
      { name: 'Medium Risk (High Soil)', rain: 20, soil: 0.85, water: 3.0, expected: 'medium' },
      { name: 'High Risk (Heavy Rain)', rain: 45, soil: 0.7, water: 4.2, expected: 'high' },
      { name: 'High Risk (Extreme)', rain: 55, soil: 0.9, water: 5.0, expected: 'high' }
    ];

    testCases.forEach(test => {
      const input = tf.tensor2d([[
        test.rain / 50,
        test.soil,
        test.water / 6,
        0.05,
        0.05
      ]]);
      
      const prediction = model.predict(input);
      const risk = (prediction.dataSync()[0] * 100).toFixed(1);
      const riskLevel = risk < 30 ? 'LOW' : risk < 70 ? 'MEDIUM' : 'HIGH';
      const symbol = risk < 30 ? '🟢' : risk < 70 ? '🟡' : '🔴';
      
      console.log(`  ${symbol} ${test.name}:`);
      console.log(`     Input: Rain=${test.rain}mm, Soil=${(test.soil*100).toFixed(0)}%, Water=${test.water}m`);
      console.log(`     Predicted Risk: ${risk}% (${riskLevel}) - Expected: ${test.expected.toUpperCase()}\n`);
      
      tf.dispose([input, prediction]);
    });

    // Save the model
    const modelDir = path.join(__dirname, 'ai-model');
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    console.log('💾 Saving model...');
    
    // Custom save handler for browser TensorFlow.js
    class NodeFileSystem {
      constructor(path) {
        this.path = path;
      }

      async save(modelArtifacts) {
        const modelPath = this.path.replace('file://', '');
        const weightsPath = modelPath.replace('model.json', 'weights.bin');
        
        // Save model topology
        const modelJSON = {
          modelTopology: modelArtifacts.modelTopology,
          weightsManifest: [{
            paths: ['weights.bin'],
            weights: modelArtifacts.weightSpecs
          }],
          format: 'layers-model',
          generatedBy: 'TensorFlow.js tfjs-layers v' + tf.version.tfjs,
          convertedBy: null
        };
        
        fs.writeFileSync(modelPath, JSON.stringify(modelJSON, null, 2));
        
        // Save weights
        const weightsBuffer = Buffer.from(modelArtifacts.weightData);
        fs.writeFileSync(weightsPath, weightsBuffer);
        
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON',
            modelTopologyBytes: JSON.stringify(modelArtifacts.modelTopology).length,
            weightSpecsBytes: JSON.stringify(modelArtifacts.weightSpecs).length,
            weightDataBytes: modelArtifacts.weightData.byteLength
          }
        };
      }
    }

    const savePath = `file://${path.join(modelDir, 'model.json')}`;
    const saveHandler = new NodeFileSystem(savePath);
    await model.save(saveHandler);
    
    console.log(`✓ Model saved to: ${modelDir}/\n`);

    // Save model metadata
    const metadata = {
      version: '1.0.0',
      trainedAt: new Date().toISOString(),
      tensorflowVersion: tf.version.tfjs,
      backend: tf.getBackend(),
      architecture: {
        inputShape: [5],
        layers: [
          'dense(32, relu, heNormal)',
          'dropout(0.2)',
          'dense(16, relu, heNormal)',
          'dropout(0.1)',
          'dense(8, relu)',
          'dense(1, sigmoid)'
        ]
      },
      training: {
        epochs: 100,
        batchSize: 32,
        samples: trainingData.length,
        optimizer: 'adam(0.001)',
        loss: 'meanSquaredError',
        finalLoss: parseFloat(finalLoss.toFixed(4)),
        finalValLoss: parseFloat(finalValLoss.toFixed(4)),
        finalMae: parseFloat(finalMae.toFixed(4))
      },
      inputFeatures: [
        { name: 'rainfall', description: 'Rainfall in mm (normalized by /50)', range: '0-60mm' },
        { name: 'soilMoisture', description: 'Soil moisture percentage', range: '0-1' },
        { name: 'waterLevel', description: 'Water level in meters (normalized by /6)', range: '0-6m' },
        { name: 'feature4', description: 'Placeholder feature', range: '0-0.1' },
        { name: 'feature5', description: 'Placeholder feature', range: '0-0.1' }
      ],
      output: {
        name: 'floodRisk',
        description: 'Probability of flood occurrence',
        range: '0-1 (multiply by 100 for percentage)'
      }
    };

    fs.writeFileSync(
      path.join(modelDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✓ Metadata saved\n');

    // Cleanup
    tf.dispose([xs, ys, model]);

    console.log('='.repeat(60));
    console.log('✅ Model Training Complete!');
    console.log('='.repeat(60));
    console.log('\n📁 Model files created:');
    console.log(`  - ${modelDir}/model.json`);
    console.log(`  - ${modelDir}/weights.bin`);
    console.log(`  - ${modelDir}/metadata.json\n`);
    
    console.log('📊 Model Performance:');
    console.log(`  • Training Accuracy: ${((1 - finalLoss) * 100).toFixed(1)}%`);
    console.log(`  • Validation Accuracy: ${((1 - finalValLoss) * 100).toFixed(1)}%`);
    console.log(`  • Mean Error: ±${(finalMae * 100).toFixed(1)}%\n`);
    
    console.log('🚀 Next Steps:');
    console.log('  1. Restart the server: npm start');
    console.log('  2. The AI model will be loaded automatically');
    console.log('  3. Test predictions: npm run test');
    console.log('  4. View dashboard: http://localhost:3000\n');

    return true;

  } catch (error) {
    console.error('\n❌ Training failed:', error.message);
    
    if (error.message.includes('TensorFlow')) {
      console.log('\n💡 Solution:');
      console.log('  1. Install TensorFlow.js:');
      console.log('     npm install @tensorflow/tfjs @tensorflow/tfjs-backend-cpu');
      console.log('  2. Or use the system with fallback algorithm (no training needed)');
    }
    
    console.error('\n📋 Full error:', error);
    return false;
  }
}

// Run training
trainModel().then(success => {
  process.exit(success ? 0 : 1);
});