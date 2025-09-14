import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './src/routes/auth.js';
import deviceRoutes from './src/routes/devices.js';
import dashboardRoutes from './src/routes/dashboard.js';
import userRoutes from './src/routes/users.js';
import alertRoutes from './src/routes/alerts.js';
import motorRoutes from './src/routes/motors.js';
import adminRoutes from './src/routes/admin.js';
import deviceConfigRoutes from './src/routes/deviceConfig.js';
import universalCommunicationRoutes from './src/routes/universalCommunication.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://ambitious-mushroom-0b3c21000.1.azurestaticapps.net',
  'https://purple-sand-03b86b900.2.azurestaticapps.net'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('The CORS policy for this site does not allow access from the specified origin.'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/motors', motorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/device-config', deviceConfigRoutes);
app.use('/api/v1/admin/universal-communication', universalCommunicationRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 IoT Dashboard API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`💾 Database: ${process.env.DB_SERVER}/${process.env.DB_DATABASE}`);
  console.log(`🏥 Health check: ${process.env.NODE_ENV === 'production' ? 'https://genvolt-webapp-backend-epezdjc9hfcyf4hr.centralindia-01.azurewebsites.net' : 'http://localhost:' + PORT}/api/v1/health`);
});

export default app;
