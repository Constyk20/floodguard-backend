// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');
const admin = require('firebase-admin');
const path = require('path');

// ======================
// 1. Initialize App
// ======================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(express.json());

// ======================
// 2. MongoDB Connection
// ======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('✗ MongoDB Error:', err.message);
    process.exit(1);
  });

// ======================
// 3. User Routes Import
// ======================
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// ======================
// 4. Flood Data Schema (Existing)
// ======================
const floodSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  lat: Number,
  lng: Number,
  rainfall: Number,
  waterLevel: Number,
  soilMoisture: Number,
  prediction: Number,
  riskLevel: String,
  sentAlert: { type: Boolean, default: false },
  dataSource: {
    rainfall: String,
    waterLevel: String,
    soilMoisture: String
  }
});

const FloodData = mongoose.model('FloodData', floodSchema);

// ======================
// 5. Firebase Admin (Production-ready)
// ======================
let firebaseInitialized = false;
try {
  let serviceAccount;
  
  if (process.env.FIREBASE_CONFIG_BASE64) {
    // Method B: Base64 encoded
    const decoded = Buffer.from(process.env.FIREBASE_CONFIG_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  } else if (process.env.FIREBASE_CONFIG) {
    // Method A: Direct JSON
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  } else {
    // Development: Load from file
    serviceAccount = require('./firebase-service-account.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firebaseInitialized = true;
  console.log('✓ Firebase Admin Initialized');
} catch (err) {
  console.warn('⚠ Firebase not initialized:', err.message);
}

// ======================
// 6. AI MODEL LOADING (Fixed)
// ======================
let model = null;
let modelLoadAttempted = false;
let usingFallback = false;

async function loadModel() {
  if (model) return model;
  if (modelLoadAttempted) return null;
  
  modelLoadAttempted = true;
  
  try {
    let tf;
    
    // Try browser-compatible version first
    try {
      tf = require('@tensorflow/tfjs');
      require('@tensorflow/tfjs-backend-cpu');
      await tf.ready();
      console.log('Using TensorFlow.js (CPU backend)');
    } catch (e1) {
      // Fallback to Node version
      try {
        tf = require('@tensorflow/tfjs-node');
        console.log('Using TensorFlow.js (Node backend)');
      } catch (e2) {
        throw new Error('TensorFlow.js not installed');
      }
    }
    
    const fs = require('fs');
    const modelPath = path.join(__dirname, 'ai-model', 'model.json');
    
    if (!fs.existsSync(modelPath)) {
      console.warn('⚠ Model file not found at:', modelPath);
      console.log('→ Using enhanced fallback prediction algorithm');
      usingFallback = true;
      return null;
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
    console.log('✓ AI Model Loaded Successfully');
    return model;
    
  } catch (err) {
    console.warn('⚠ AI Model loading failed:', err.message);
    console.log('→ Using enhanced fallback prediction algorithm');
    usingFallback = true;
    return null;
  }
}

// Enhanced fallback algorithm
function calculateRiskFallback(rainfall, waterLevel, soilMoisture) {
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
  
  // Combined risk multiplier
  if (rainfall > 20 && waterLevel > 3 && soilMoisture > 0.7) {
    risk = Math.min(risk * 1.3, 100);
  }
  
  return Math.min(Math.round(risk), 100);
}

async function predictFloodRisk(rainfall, waterLevel, soilMoisture) {
  const loadedModel = await loadModel();
  
  if (!loadedModel) {
    return calculateRiskFallback(rainfall, waterLevel, soilMoisture);
  }

  try {
    let tf;
    
    // Get TensorFlow instance - try both versions
    try {
      tf = require('@tensorflow/tfjs');
      require('@tensorflow/tfjs-backend-cpu');
      await tf.ready();
    } catch (e1) {
      try {
        tf = require('@tensorflow/tfjs-node');
      } catch (e2) {
        console.warn('TensorFlow not available, using fallback');
        return calculateRiskFallback(rainfall, waterLevel, soilMoisture);
      }
    }
    
    // Normalize inputs
    const input = tf.tensor2d([[
      rainfall / 50,        // Normalize by max expected rainfall
      soilMoisture,         // Already 0-1
      waterLevel / 6,       // Normalize by max expected level
      0.05,                 // Fixed values for consistency
      0.05
    ]], [1, 5]);

    const prediction = loadedModel.predict(input);
    const riskPercent = Math.round(prediction.dataSync()[0] * 100);
    
    tf.dispose([input, prediction]);
    
    return Math.max(0, Math.min(riskPercent, 100));
  } catch (err) {
    console.warn('Model prediction error, using fallback:', err.message);
    return calculateRiskFallback(rainfall, waterLevel, soilMoisture);
  }
}

// ======================
// 7. Send FCM Alert
// ======================
async function sendFloodAlert(data) {
  if (!firebaseInitialized || data.sentAlert) return;

  const message = {
    notification: {
      title: `⚠️ Flood Alert: ${data.riskLevel.toUpperCase()} Risk`,
      body: `${data.prediction}% flood probability detected near ${data.lat.toFixed(2)}, ${data.lng.toFixed(2)}. Rainfall: ${data.rainfall.toFixed(1)}mm`
    },
    topic: 'flood_alerts',
    data: {
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      risk: data.prediction.toString(),
      level: data.riskLevel
    }
  };

  try {
    await admin.messaging().send(message);
    console.log('✓ FCM Alert Sent!');
    data.sentAlert = true;
    await data.save();
  } catch (err) {
    console.error('✗ FCM Send Error:', err.message);
  }
}

// ======================
// 8. Data Fetching Functions
// ======================
async function fetchRainfallData(lat, lng) {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${process.env.OWM_KEY}&units=metric`,
      { timeout: 10000 }
    );
    
    const firstForecast = res.data.list[0];
    const rainfall = firstForecast.rain?.['3h'] || 0;
    const pop = (firstForecast.pop * 100).toFixed(1);
    
    console.log(`  → Rainfall: ${rainfall.toFixed(2)}mm (3h) | PoP: ${pop}%`);
    return { value: rainfall, source: 'OpenWeatherMap' };
  } catch (err) {
    console.warn('  ⚠ OpenWeather failed:', err.message);
    return { value: 0, source: 'fallback' };
  }
}

async function fetchWaterLevel() {
  try {
    const res = await axios.get(
      'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00065',
      { timeout: 8000 }
    );
    
    const val = res.data.value?.timeSeries?.[0]?.values?.[0]?.value?.[0]?.value;
    const waterLevel = val ? parseFloat(val) : 2.1;
    
    console.log(`  → Water Level: ${waterLevel.toFixed(2)}m`);
    return { value: waterLevel, source: 'USGS' };
  } catch (err) {
    console.warn('  ⚠ USGS failed, using fallback');
    return { value: 2.1, source: 'fallback' };
  }
}

async function fetchSoilMoisture(lat, lng) {
  try {
    const res = await axios.get(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=wgssd&depth=0-5cm&value=mean`,
      { timeout: 10000 }
    );
    
    const mean = res.data.properties.layers[0].depths[0].values.mean;
    const moisture = mean ? mean / 100 : 0.5;
    
    console.log(`  → Soil Moisture: ${(moisture * 100).toFixed(1)}%`);
    return { value: moisture, source: 'SoilGrids' };
  } catch (err) {
    console.warn('  ⚠ SoilGrids failed, using default');
    return { value: 0.5, source: 'fallback' };
  }
}

// ======================
// 9. Main Data Ingestion (Every 10 mins)
// ======================
cron.schedule('*/10 * * * *', async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🔄 Fetching real-time flood data...');
  console.log('='.repeat(50));
  
  const lat = 6.45, lng = 3.39; // Lagos, Nigeria

  try {
    // Fetch all data sources
    const [rainfallData, waterLevelData, soilMoistureData] = await Promise.all([
      fetchRainfallData(lat, lng),
      fetchWaterLevel(),
      fetchSoilMoisture(lat, lng)
    ]);

    // AI Prediction
    const riskPercent = await predictFloodRisk(
      rainfallData.value,
      waterLevelData.value,
      soilMoistureData.value
    );
    
    const riskLevel = riskPercent < 30 ? 'low' : riskPercent < 70 ? 'medium' : 'high';
    
    console.log(`\n📊 PREDICTION: ${riskPercent}% risk (${riskLevel.toUpperCase()})${usingFallback ? ' [Fallback Algorithm]' : ' [AI Model]'}`);

    // Save to DB
    const newData = new FloodData({
      lat,
      lng,
      rainfall: rainfallData.value,
      waterLevel: waterLevelData.value,
      soilMoisture: soilMoistureData.value,
      prediction: riskPercent,
      riskLevel,
      dataSource: {
        rainfall: rainfallData.source,
        waterLevel: waterLevelData.source,
        soilMoisture: soilMoistureData.source
      }
    });
    
    await newData.save();
    console.log('✓ Data saved to database');

    // Broadcast to connected clients
    io.emit('floodUpdate', newData.toObject());
    console.log('✓ Update broadcast to clients');

    // Send alert if medium/high risk
    if (riskLevel !== 'low') {
      await sendFloodAlert(newData);
    }
    
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('✗ Data ingestion error:', err.message);
  }
});

// ======================
// 10. Socket.io Connection
// ======================
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Send historical data
  FloodData.find()
    .sort({ timestamp: -1 })
    .limit(20)
    .then(records => {
      socket.emit('historical', records);
      console.log(`  → Sent ${records.length} historical records`);
    })
    .catch(err => console.error('Historical data error:', err));

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ======================
// 11. REST API Endpoints
// ======================

// Get latest flood data
app.get('/api/latest', async (req, res) => {
  try {
    const latest = await FloodData.findOne().sort({ timestamp: -1 });
    res.json(latest || { message: 'No data available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get historical data
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await FloodData.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await FloodData.countDocuments();
    const highRisk = await FloodData.countDocuments({ riskLevel: 'high' });
    const mediumRisk = await FloodData.countDocuments({ riskLevel: 'medium' });
    const lowRisk = await FloodData.countDocuments({ riskLevel: 'low' });
    
    const latest = await FloodData.findOne().sort({ timestamp: -1 });
    
    res.json({
      total,
      riskDistribution: { high: highRisk, medium: mediumRisk, low: lowRisk },
      latest: latest || null,
      modelStatus: usingFallback ? 'fallback' : 'ai-model'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual trigger (for testing)
app.post('/api/trigger', async (req, res) => {
  try {
    console.log('Manual data fetch triggered via API');
    res.json({ message: 'Data fetch triggered' });
    // Trigger the cron job logic manually
    setTimeout(() => {
      cron.schedule('* * * * * *', async () => {
        // Run once
      }, { scheduled: false }).now();
    }, 100);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 12. Enhanced Dashboard
// ======================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FloodGuard - Real-time Monitoring</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 10px; font-size: 2.5em; }
        .subtitle { text-align: center; opacity: 0.9; margin-bottom: 30px; }
        .status-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .status { 
          font-size: 1.2em; 
          padding: 10px 20px;
          border-radius: 25px;
          display: inline-block;
          font-weight: bold;
        }
        .connected { background: #10b981; }
        .disconnected { background: #ef4444; }
        .stats { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-box {
          background: rgba(255,255,255,0.15);
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .stat-label { opacity: 0.8; }
        #log { 
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
          padding: 20px;
          font-family: 'Courier New', monospace;
          max-height: 500px;
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .log-entry {
          margin: 10px 0;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 5px;
          border-left: 4px solid;
        }
        .high { border-left-color: #ef4444; }
        .medium { border-left-color: #f59e0b; }
        .low { border-left-color: #10b981; }
        .time { color: #a78bfa; font-weight: bold; }
        .risk { font-size: 1.1em; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌊 FloodGuard</h1>
        <p class="subtitle">Real-time Flood Prediction & Monitoring System</p>
        
        <div class="status-card">
          <p>Connection Status: <span class="status disconnected" id="status">Connecting...</span></p>
          <p style="margin-top: 10px; opacity: 0.8;">Model: <span id="model-status">Loading...</span></p>
        </div>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">Total Records</div>
            <div class="stat-value" id="total-records">-</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">High Risk</div>
            <div class="stat-value" style="color: #ef4444;" id="high-risk">-</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Medium Risk</div>
            <div class="stat-value" style="color: #f59e0b;" id="medium-risk">-</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Low Risk</div>
            <div class="stat-value" style="color: #10b981;" id="low-risk">-</div>
          </div>
        </div>

        <div class="status-card">
          <h2 style="margin-bottom: 15px;">📊 Live Updates</h2>
          <div id="log"></div>
        </div>
      </div>

      <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
      <script>
        const socket = io();
        const log = document.getElementById('log');

        socket.on('connect', () => {
          document.getElementById('status').textContent = 'Connected';
          document.getElementById('status').className = 'status connected';
          fetchStats();
        });

        socket.on('disconnect', () => {
          document.getElementById('status').textContent = 'Disconnected';
          document.getElementById('status').className = 'status disconnected';
        });

        socket.on('historical', (records) => {
          log.innerHTML = '';
          records.reverse().forEach(d => addLogEntry(d));
        });

        socket.on('floodUpdate', (d) => {
          addLogEntry(d);
          fetchStats();
        });

        function addLogEntry(d) {
          const time = new Date(d.timestamp).toLocaleTimeString();
          const date = new Date(d.timestamp).toLocaleDateString();
          
          const entry = document.createElement('div');
          entry.className = 'log-entry ' + d.riskLevel;
          entry.innerHTML = 
            '<span class="time">' + date + ' ' + time + '</span><br>' +
            '<span class="risk">Risk: ' + d.prediction + '% (' + d.riskLevel.toUpperCase() + ')</span><br>' +
            'Rain: ' + d.rainfall.toFixed(2) + 'mm | ' +
            'Water: ' + d.waterLevel.toFixed(2) + 'm | ' +
            'Soil: ' + (d.soilMoisture * 100).toFixed(1) + '%';
          
          log.insertBefore(entry, log.firstChild);
          
          if (log.children.length > 20) {
            log.removeChild(log.lastChild);
          }
        }

        async function fetchStats() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('total-records').textContent = data.total;
            document.getElementById('high-risk').textContent = data.riskDistribution.high;
            document.getElementById('medium-risk').textContent = data.riskDistribution.medium;
            document.getElementById('low-risk').textContent = data.riskDistribution.low;
            document.getElementById('model-status').textContent = 
              data.modelStatus === 'fallback' ? 'Enhanced Fallback Algorithm' : 'AI Neural Network';
          } catch (err) {
            console.error('Failed to fetch stats:', err);
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ======================
// 13. Start Server
// ======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 FloodGuard Backend Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`👤 User API: http://localhost:${PORT}/api/users`);
  console.log('='.repeat(50) + '\n');
  
  // Load model on startup
  loadModel().then(() => {
    if (usingFallback) {
      console.log('ℹ️  Running with enhanced fallback algorithm');
    } else {
      console.log('✓ AI model ready');
    }
  });
});