import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import paymentRoutes from './routes/payments';
import chargeRoutes from './routes/charges';
import migrationRoutes from './routes/migration';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// Dynamic CORS configuration
const allowedOrigins: (string | RegExp)[] = [
  'http://localhost:4200',
  'http://localhost:4201',
  process.env.FRONTEND_URL || 'http://localhost:4201'
];

// Add Vercel domain pattern for production
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(/\.vercel\.app$/);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/migration', migrationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'EMSD School System API',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/auth/login',
      '/api/students',
      '/api/payments',
      '/api/charges'
    ]
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'School System API is running',
    version: '1.0.2'
  });
});// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
