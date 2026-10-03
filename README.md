# FloodGuard Backend

An AI-powered flood prediction and monitoring system that uses machine learning to predict flood risks based on real-time environmental data.

## 🌊 Features

- **Real-time Flood Prediction**: AI model predicts flood risk from environmental data
- **Multiple Data Sources**: Integrates rainfall, water level, and soil moisture data
- **Push Notifications**: Firebase Cloud Messaging for high-risk alerts
- **WebSocket Updates**: Real-time data streaming to connected clients
- **User Authentication**: JWT-based authentication system
- **RESTful API**: Comprehensive API for data access
- **Dashboard**: Web-based monitoring interface
- **Fallback Algorithm**: Works without AI model using rule-based prediction

## 📁 Project Structure

```
floodguard-backend/
├── src/
│   ├── config/           # Configuration (database, firebase, constants)
│   ├── models/           # MongoDB schemas (User, FloodData)
│   ├── controllers/      # Business logic (user, flood)
│   ├── middleware/       # Express middleware (auth)
│   ├── routes/           # API routes
│   ├── services/         # External APIs (weather, water, soil, notifications)
│   ├── ai/               # AI model (loading, prediction, fallback)
│   ├── utils/            # Utilities (logger, helpers, validators)
│   ├── jobs/             # Scheduled tasks (data ingestion)
│   └── sockets/          # WebSocket handlers
├── scripts/              # Utility scripts (setup, train, test)
├── ai-model/             # Trained model files
├── public/               # Static files (dashboard)
├── logs/                 # Application logs
└── docs/                 # Documentation

See PROJECT_STRUCTURE.md for detailed documentation.
```

## 🚀 Quick Start

### Prerequisites

- Node.js 14+
- MongoDB (local or Atlas)
- OpenWeatherMap API key

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Run setup script
npm run setup

# 3. Configure environment variables (.env file)
MONGO_URI=mongodb://localhost:27017/floodguard
OWM_KEY=your_openweathermap_api_key
JWT_SECRET=your_jwt_secret
PORT=3000

# 4. (Optional) Train AI model
npm run train

# 5. Start server
npm start
```

### Access Points

- **Dashboard**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000

## 📡 API Endpoints

### Flood Data

- `GET /api/flood/latest` - Latest prediction
- `GET /api/flood/history?limit=50&page=1` - Historical data
- `GET /api/flood/stats` - Statistics summary
- `GET /api/flood/alerts` - Recent high-risk alerts
- `POST /api/flood/trigger` - Manual data fetch

### User Management

- `POST /api/users/register` - Create account
- `POST /api/users/login` - Login
- `GET /api/users/profile` - Get profile (protected)
- `PUT /api/users/profile` - Update profile (protected)

### Health Check

- `GET /api/health` - API status

## 🔧 Configuration

### Environment Variables

```bash
# Database
MONGO_URI=mongodb://localhost:27017/floodguard

# APIs
OWM_KEY=your_openweathermap_api_key
USGS_SITE_ID=01646500

# Security
JWT_SECRET=your_jwt_secret_key

# Server
PORT=3000
NODE_ENV=development

# Location (optional)
DEFAULT_LAT=6.45
DEFAULT_LNG=3.39
DEFAULT_LOCATION_NAME=Lagos, Nigeria

# Scheduling (optional)
CRON_SCHEDULE=*/10 * * * *
```

### Firebase Setup (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Navigate to Project Settings > Service Accounts
4. Generate new private key
5. Save as `firebase-service-account.json` in root directory

## 🤖 AI Model

### Training

```bash
npm run train
```

The model is a sequential neural network:
- **Input**: [rainfall, soilMoisture, waterLevel, feature4, feature5]
- **Architecture**: 5 → 32 → 16 → 8 → 1
- **Output**: Flood risk probability (0-1)

### Testing

```bash
npm run test
```

Tests the model across various scenarios (low, medium, high risk).

## 📊 Data Flow

1. **Cron Job** (every 10 minutes)
   - Fetches rainfall from OpenWeatherMap
   - Fetches water level from USGS
   - Fetches soil moisture from SoilGrids

2. **AI Prediction**
   - Normalizes inputs
   - Runs through neural network or fallback
   - Calculates risk percentage (0-100%)

3. **Storage**
   - Saves to MongoDB

4. **Broadcasting**
   - Emits via Socket.io to clients
   - Sends FCM notification if risk > 30%

## 🛠️ Development

### Scripts

```bash
npm start           # Start server
npm run dev         # Start with nodemon (auto-reload)
npm run setup       # Initial setup
npm run train       # Train AI model
npm run test        # Test predictions
npm run lint        # Run ESLint
npm run clean       # Clean generated files
```

### Adding New Features

1. **New API endpoint**: Add route in `src/routes/`, controller in `src/controllers/`
2. **New data source**: Create service in `src/services/`
3. **New model**: Update `src/models/`
4. **New scheduled task**: Add to `src/jobs/`

## 🔒 Security

- JWT authentication with 30-day expiration
- bcrypt password hashing (10 salt rounds)
- Mongoose schema validation
- CORS configuration
- Environment variable protection

## 📈 Performance

- Parallel API requests for data fetching
- MongoDB indexing on timestamp and location
- Lean queries for better performance
- Connection pooling
- Tensor cleanup to prevent memory leaks

## 🐛 Troubleshooting

### MongoDB Connection Failed

- Ensure MongoDB is running: `net start MongoDB` (Windows)
- Or use MongoDB Atlas (cloud)

### TensorFlow.js Not Working

- System works with fallback algorithm
- To fix: `npm install @tensorflow/tfjs @tensorflow/tfjs-backend-cpu`

### No Weather Data

- Check OpenWeatherMap API key in `.env`
- Verify API key is active

## 📝 License

MIT

## 👥 Contributors

FloodGuard Development Team

## 📧 Support

For issues and questions, open an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: 2026-10-02
