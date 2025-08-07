import mysql from 'mysql2/promise';

let connection: mysql.Connection;

export const connectDatabase = async (): Promise<void> => {
  try {
    // First connect without specifying database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'emsd_system'}\``);
    await tempConnection.end();

    // Now connect to the specific database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'emsd_system',
    });

    console.log(`Connected to MySQL database: ${process.env.DB_NAME || 'emsd_system'}`);
    
    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const getConnection = (): mysql.Connection => {
  if (!connection) {
    throw new Error('Database not connected');
  }
  return connection;
};

const createTables = async (): Promise<void> => {
  try {
    // Users table
    await connection.execute(`
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
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_number VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
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
    await connection.execute(`
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
    await connection.execute(`
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
    await connection.execute(`
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
    await connection.execute(`
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

    console.log('Database tables created successfully');
    
    // Create initial admin user if it doesn't exist
    await createInitialAdminUser(connection);
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const createInitialAdminUser = async (connection: any) => {
  try {
    // Check if admin user already exists
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      ['admin']
    );
    
    if (rows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await connection.execute(
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
