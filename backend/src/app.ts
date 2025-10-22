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
import assessmentFlagsRoutes from './routes/assessment-flags';
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
  'http://localhost:4202',
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
app.use('/api/assessment-flags', assessmentFlagsRoutes);

// Temporary test endpoint for assessment flags (no auth required)
app.get('/api/test-assessment-flags/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const connection = require('./config/database').getConnection();
    
    const [flags] = await connection.execute(`
      SELECT 
        af.student_id,
        af.assessment_date,
        af.flagged_at
      FROM assessment_flags af
      WHERE af.assessment_date = ?
    `, [date]);

    res.json({
      success: true,
      data: flags,
      count: Array.isArray(flags) ? flags.length : 0,
      message: `Test query for assessment flags on ${date}`
    });
  } catch (error) {
    console.error('Error in test assessment flags:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test assessment flags'
    });
  }
});

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
});

// Test endpoint to check if assessment_flags table exists
app.get('/api/test-flags-table', async (req, res) => {
  try {
    const connection = require('./config/database').getConnection();
    
    // Check if table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'assessment_flags'"
    );
    
    // Count rows in table
    const [count] = await connection.execute(
      'SELECT COUNT(*) as count FROM assessment_flags'
    );
    
    res.json({
      success: true,
      table_exists: Array.isArray(tables) && tables.length > 0,
      row_count: count[0]?.count || 0,
      message: 'Assessment flags table test completed'
    });
  } catch (error) {
    console.error('Error testing assessment flags table:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test assessment flags table'
    });
  }
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
