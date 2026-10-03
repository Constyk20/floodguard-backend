# FloodGuard Backend - Project Structure Documentation

## 📋 Overview
FloodGuard is an AI-powered flood prediction and monitoring system that uses real-time environmental data (rainfall, water levels, soil moisture) to predict flood risks and send alerts.

---

## 🎯 Current Structure Analysis

```
floodguard-backend/
├── 📁 ai-model/              # AI model storage (trained TensorFlow model)
├── 📁 controllers/           # Business logic handlers
├── 📁 middleware/            # Express middleware (authentication)
├── 📁 models/                # MongoDB schemas
├── 📁 routes/                # API route definitions
├── 📁 node_modules/          # Dependencies (auto-generated)
├── 📄 server.js              # Main application entry point
├── 📄 setup.js               # Initial setup script
├── 📄 train-model.js         # AI model training script
├── 📄 test-prediction.js     # Prediction testing script
├── 📄 package.json           # Project dependencies
├── 📄 .env                   # Environment variables
└── 📄 firebase-service-account.json  # Firebase credentials
```

---

## 🏗️ Proposed Improved Structure

```
floodguard-backend/
│
├── 📁 src/                           # Source code (organized)
│   │
│   ├── 📁 config/                    # Configuration files
│   │   ├── database.js               # MongoDB connection config
│   │   ├── firebase.js               # Firebase initialization
│   │   └── constants.js              # App-wide constants
│   │
│   ├── 📁 models/                    # Database schemas
│   │   ├── User.js                   # User authentication schema
│   │   └── FloodData.js              # Flood data records schema
│   │
│   ├── 📁 controllers/               # Business logic
│   │   ├── userController.js         # User management logic
│   │   └── floodController.js        # Flood prediction logic
│   │
│   ├── 📁 middleware/                # Express middleware
│   │   ├── authMiddleware.js         # JWT authentication
│   │   ├── errorHandler.js           # Error handling
│   │   └── validation.js             # Input validation
│   │
│   ├── 📁 routes/                    # API routes
│   │   ├── index.js                  # Main router
│   │   ├── userRoutes.js             # User endpoints
│   │   └── floodRoutes.js            # Flood data endpoints
│   │
│   ├── 📁 services/                  # External service integrations
│   │   ├── weatherService.js         # OpenWeatherMap API
│   │   ├── waterLevelService.js      # USGS water data
│   │   ├── soilService.js            # SoilGrids API
│   │   └── notificationService.js    # Firebase Cloud Messaging
│   │
│   ├── 📁 ai/                        # AI/ML components
│   │   ├── model.js                  # Model loading & prediction
│   │   ├── train.js                  # Training logic
│   │   ├── fallback.js               # Fallback algorithm
│   │   └── test.js                   # Testing utilities
│   │
│   ├── 📁 utils/                     # Utility functions
│   │   ├── logger.js                 # Logging utility
│   │   ├── validators.js             # Data validators
│   │   └── helpers.js                # Helper functions
│   │
│   ├── 📁 jobs/                      # Scheduled tasks
│   │   └── dataIngestion.js          # Cron job for data fetching
│   │
│   └── 📁 sockets/                   # WebSocket handlers
│       └── floodSocket.js            # Real-time updates
│
├── 📁 public/                        # Static files (frontend assets)
│   └── dashboard.html                # Dashboard UI
│
├── 📁 ai-model/                      # Trained model files
│   ├── model.json                    # Model architecture
│   ├── weights.bin                   # Model weights
│   └── metadata.json                 # Training metadata
│
├── 📁 logs/                          # Application logs
│   └── .gitkeep
│
├── 📁 backups/                       # Database backups
│   └── .gitkeep
│
├── 📁 tests/                         # Test files
│   ├── unit/                         # Unit tests
│   ├── integration/                  # Integration tests
│   └── e2e/                          # End-to-end tests
│
├── 📁 scripts/                       # Utility scripts
│   ├── setup.js                      # Initial setup
│   ├── train-model.js                # Train AI model
│   ├── test-prediction.js            # Test predictions
│   └── seed-database.js              # Seed test data
│
├── 📁 docs/                          # Documentation
│   ├── API.md                        # API documentation
│   ├── SETUP.md                      # Setup guide
│   └── ARCHITECTURE.md               # System architecture
│
├── 📄 server.js                      # Application entry point
├── 📄 package.json                   # Dependencies & scripts
├── 📄 .env                           # Environment variables
├── 📄 .env.example                   # Environment template
├── 📄 .gitignore                     # Git ignore rules
├── 📄 README.md                      # Project overview
└── 📄 firebase-service-account.json  # Firebase credentials (gitignored)
```

---

## 📦 Component Descriptions

### **1. Core Application (src/)**

#### **config/**
- **Purpose**: Centralized configuration management
- **database.js**: MongoDB connection setup with retry logic
- **firebase.js**: Firebase Admin SDK initialization for push notifications
- **constants.js**: Application-wide constants (thresholds, API endpoints)

#### **models/**
- **Purpose**: MongoDB schema definitions using Mongoose
- **User.js**: User authentication with bcrypt password hashing
- **FloodData.js**: Stores flood predictions and environmental data

#### **controllers/**
- **Purpose**: Business logic separated from routes
- **userController.js**: User CRUD operations, login, registration
- **floodController.js**: Flood data processing and prediction logic

#### **middleware/**
- **Purpose**: Request/response processing pipeline
- **authMiddleware.js**: JWT token verification for protected routes
- **errorHandler.js**: Centralized error handling
- **validation.js**: Input validation using express-validator

#### **routes/**
- **Purpose**: API endpoint definitions
- **index.js**: Main router that combines all routes
- **userRoutes.js**: `/api/users/*` endpoints
- **floodRoutes.js**: `/api/flood/*` endpoints

#### **services/**
- **Purpose**: External API integrations
- **weatherService.js**: Fetches rainfall data from OpenWeatherMap
- **waterLevelService.js**: Fetches water level from USGS
- **soilService.js**: Fetches soil moisture from SoilGrids API
- **notificationService.js**: Sends push notifications via Firebase

#### **ai/**
- **Purpose**: Machine learning components
- **model.js**: TensorFlow.js model loading and prediction
- **train.js**: Neural network training logic
- **fallback.js**: Rule-based prediction when AI unavailable
- **test.js**: Model testing and validation

#### **utils/**
- **Purpose**: Reusable utility functions
- **logger.js**: Winston-based logging (console + file)
- **validators.js**: Custom validation functions
- **helpers.js**: General helper functions

#### **jobs/**
- **Purpose**: Scheduled background tasks
- **dataIngestion.js**: Cron job that runs every 10 minutes to fetch and process data

#### **sockets/**
- **Purpose**: WebSocket event handlers
- **floodSocket.js**: Real-time flood updates to connected clients

---

### **2. AI Model (ai-model/)**
- **model.json**: TensorFlow.js model architecture (JSON format)
- **weights.bin**: Trained neural network weights (binary)
- **metadata.json**: Training information (accuracy, date, features)

---

### **3. Scripts (scripts/)**
- **setup.js**: First-time setup (creates directories, checks dependencies)
- **train-model.js**: Trains AI model with synthetic flood data
- **test-prediction.js**: Tests model accuracy across scenarios
- **seed-database.js**: Populates database with test data

---

### **4. Documentation (docs/)**
- **API.md**: Complete API endpoint documentation
- **SETUP.md**: Installation and configuration guide
- **ARCHITECTURE.md**: System design and data flow diagrams

---

## 🔄 Data Flow

```
1. CRON JOB (every 10 minutes)
   └─> Fetch data from external APIs
       ├─> OpenWeatherMap (rainfall)
       ├─> USGS (water level)
       └─> SoilGrids (soil moisture)
   
2. AI PREDICTION
   └─> Input: [rainfall, waterLevel, soilMoisture]
   └─> Process: TensorFlow.js Neural Network OR Fallback Algorithm
   └─> Output: Risk percentage (0-100%)

3. DATA STORAGE
   └─> Save to MongoDB (FloodData collection)

4. REAL-TIME BROADCAST
   └─> Emit via Socket.io to all connected clients

5. ALERT SYSTEM (if risk > 30%)
   └─> Send Firebase Cloud Messaging notification
```

---

## 🔐 Security Layers

1. **Authentication**: JWT-based with 30-day expiration
2. **Password Hashing**: bcrypt with salt rounds (10)
3. **Input Validation**: Mongoose schema validation + custom validators
4. **Environment Variables**: Sensitive data in .env (gitignored)
5. **CORS**: Configured for specific origins

---

## 🌐 API Endpoints

### **User Management**
- `POST /api/users/register` - Create new user
- `POST /api/users/login` - Authenticate user
- `GET /api/users/profile` - Get current user (protected)
- `PUT /api/users/profile` - Update profile (protected)
- `GET /api/users` - List all users (protected)
- `DELETE /api/users/:id` - Delete account (protected)

### **Flood Data**
- `GET /api/latest` - Get latest flood prediction
- `GET /api/history?limit=50` - Get historical data
- `GET /api/stats` - Get statistics summary
- `POST /api/trigger` - Manually trigger data fetch

### **WebSocket Events**
- `connection` - Client connects
- `disconnect` - Client disconnects
- `floodUpdate` - Server → Client (new prediction)
- `historical` - Server → Client (historical records)

---

## 🛠️ Technology Stack

### **Backend**
- **Runtime**: Node.js v14+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: bcryptjs

### **AI/ML**
- **Framework**: TensorFlow.js (@tensorflow/tfjs)
- **Model Type**: Sequential Neural Network
- **Architecture**: 5 → 32 → 16 → 8 → 1 (sigmoid output)
- **Fallback**: Rule-based algorithm

### **External APIs**
- **Weather**: OpenWeatherMap API
- **Water Data**: USGS Water Services
- **Soil Data**: ISRIC SoilGrids
- **Notifications**: Firebase Cloud Messaging

### **Task Scheduling**
- **Library**: node-cron
- **Frequency**: Every 10 minutes (`*/10 * * * *`)

---

## 📊 Database Schema

### **Users Collection**
```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars),
  email: String (unique, validated),
  password: String (hashed),
  firstName: String (optional),
  lastName: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### **FloodData Collection**
```javascript
{
  _id: ObjectId,
  timestamp: Date,
  lat: Number,
  lng: Number,
  rainfall: Number (mm),
  waterLevel: Number (meters),
  soilMoisture: Number (0-1),
  prediction: Number (0-100%),
  riskLevel: String ('low'|'medium'|'high'),
  sentAlert: Boolean,
  dataSource: {
    rainfall: String,
    waterLevel: String,
    soilMoisture: String
  }
}
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run setup script
npm run setup

# 3. Configure environment (.env file)
MONGO_URI=mongodb://localhost:27017/floodguard
OWM_KEY=your_openweathermap_api_key
JWT_SECRET=your_jwt_secret
PORT=3000

# 4. Train AI model (optional)
npm run train

# 5. Start server
npm start

# 6. Access dashboard
http://localhost:3000
```

---

## 📈 Performance Considerations

1. **Caching**: Consider Redis for API response caching
2. **Rate Limiting**: Implement rate limiting on public endpoints
3. **Database Indexing**: Index timestamp, lat/lng for faster queries
4. **Connection Pooling**: MongoDB connection pool (default: 5)
5. **Error Handling**: Graceful degradation when APIs fail

---

## 🔮 Future Enhancements

1. **Multi-location Support**: Track multiple regions simultaneously
2. **Historical Analysis**: Trend analysis and pattern recognition
3. **User Subscriptions**: Location-based alert preferences
4. **Admin Dashboard**: Manage users and system settings
5. **Mobile App**: React Native frontend
6. **Model Retraining**: Periodic retraining with real data
7. **Geospatial Queries**: MongoDB geospatial indexes for area queries

---

## 📝 Notes

- **Fallback Algorithm**: System works without AI model (rule-based)
- **Firebase**: Optional (system works without push notifications)
- **MongoDB**: Local or MongoDB Atlas cloud database
- **TensorFlow**: Uses CPU backend (no GPU required)

---

**Last Updated**: 2026-10-02  
**Version**: 1.0.0  
**Maintained By**: FloodGuard Development Team
