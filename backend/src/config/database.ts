import mysql from 'mysql2/promise';

let pool: mysql.Pool;

export const connectDatabase = async (): Promise<void> => {
  try {
    // Create connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'emsd_system',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Connected to MySQL database pool: ${process.env.DB_NAME || 'emsd_system'}`);
    
    // Test the connection
    const testConnection = await pool.getConnection();
    await testConnection.execute('SELECT 1');
    testConnection.release();
    
    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const getConnection = (): mysql.Pool => {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
};

const createTables = async (): Promise<void> => {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher', 'staff') DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Students table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_number VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        middle_name VARCHAR(50),
        last_name VARCHAR(50) NOT NULL,
        grade_level INT NOT NULL CHECK (grade_level >= 1 AND grade_level <= 6),
        date_of_birth DATE,
        address TEXT,
        parent_name VARCHAR(100),
        parent_contact VARCHAR(20),
        parent_email VARCHAR(100),
        enrollment_date DATE NOT NULL,
        status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Charges table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS charges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        amount DECIMAL(10, 2) NOT NULL,
        charge_type ENUM('tuition', 'books', 'uniform', 'activities', 'other') NOT NULL,
        grade_level INT CHECK (grade_level >= 1 AND grade_level <= 6),
        is_mandatory BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        payment_date DATE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('cash', 'card', 'bank_transfer', 'check') NOT NULL,
        reference_number VARCHAR(50),
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Payment items table (detailed breakdown of each payment)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payment_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        charge_id INT,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        is_manual_charge BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (charge_id) REFERENCES charges(id) ON DELETE SET NULL
      )
    `);

    // Student charges (linking students to their applicable charges)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS student_charges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        charge_id INT NOT NULL,
        amount_due DECIMAL(10, 2) NOT NULL,
        amount_paid DECIMAL(10, 2) DEFAULT 0,
        due_date DATE,
        status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (charge_id) REFERENCES charges(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_charge (student_id, charge_id)
      )
    `);

    // Back payments table (for tracking unpaid charges from previous grades)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS back_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        original_grade_level INT NOT NULL,
        current_grade_level INT NOT NULL,
        charge_id INT NOT NULL,
        charge_name VARCHAR(100) NOT NULL,
        amount_due DECIMAL(10, 2) NOT NULL,
        amount_paid DECIMAL(10, 2) DEFAULT 0,
        status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (charge_id) REFERENCES charges(id) ON DELETE CASCADE
      )
    `);

    // Assessment flags table (for tracking which students have had assessments generated)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS assessment_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        assessment_date DATE NOT NULL,
        flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_student_assessment_date (student_id, assessment_date)
      )
    `);

    console.log('Database tables created successfully');
    
    // Run migrations
    await runMigrations();
    
    // Create initial admin user
    await createInitialAdminUser();
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

const runMigrations = async (): Promise<void> => {
  try {
    // Check if middle_name column exists in students table
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'middle_name'
    `, [process.env.DB_NAME || 'emsd_system']);

    if (!Array.isArray(columns) || columns.length === 0) {
      // Add middle_name column if it doesn't exist
      await pool.execute(`
        ALTER TABLE students 
        ADD COLUMN middle_name VARCHAR(50) AFTER first_name
      `);
      console.log('Migration: Added middle_name column to students table');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
  }
};

const createInitialAdminUser = async (): Promise<void> => {
  try {
    // Check if admin user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      ['admin', 'admin@school.com']
    );
    
    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await pool.execute(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@school.com', hashedPassword, 'admin']
      );
      
      console.log('Initial admin user created successfully');
      console.log('Login credentials: username=admin, password=admin123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating initial admin user:', error);
  }
};
