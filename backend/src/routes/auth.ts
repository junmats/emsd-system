import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConnection } from '../config/database';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Register user
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, role = 'staff' } = req.body;

    if (!username || !email || !password) {
      return next(createError('Username, email, and password are required', 400));
    }

    const connection = getConnection();
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return next(createError('Username or email already exists', 409));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: (result as any).insertId
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createError('Username and password are required', 400));
    }

    const connection = getConnection();
    
    // Find user
    const [users] = await connection.execute(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = ?',
      [username]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return next(createError('Invalid credentials', 401));
    }

    const user = users[0] as any;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return next(createError('Invalid credentials', 401));
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
