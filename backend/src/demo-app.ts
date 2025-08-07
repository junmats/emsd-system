import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temporary in-memory data for testing
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@school.com',
    password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNi.XJWL8MDe6', // password: admin123
    role: 'admin'
  }
];

const students = [
  {
    id: 1,
    student_number: 'STU001',
    first_name: 'John',
    last_name: 'Doe',
    grade_level: 3,
    enrollment_date: '2024-09-01',
    status: 'active'
  },
  {
    id: 2,
    student_number: 'STU002',
    first_name: 'Jane',
    last_name: 'Smith',
    grade_level: 4,
    enrollment_date: '2024-09-01',
    status: 'active'
  }
];

// Simple login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@school.com',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Students endpoint
app.get('/api/students', (req, res) => {
  res.json({
    success: true,
    data: students,
    pagination: {
      page: 1,
      limit: 50,
      total: students.length,
      pages: 1
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'School System API is running (Demo Mode)' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo server is running on port ${PORT}`);
  console.log('Using in-memory data for testing');
  console.log('Login with: username=admin, password=admin123');
});
