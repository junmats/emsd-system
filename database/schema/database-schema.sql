-- EMSD School System Database Schema
-- Generated on 2025-09-07
-- This file contains the complete database structure and initial data

-- Create database
CREATE DATABASE IF NOT EXISTS `emsd_system`;
USE `emsd_system`;

-- Drop existing tables to start fresh (in correct order to handle foreign keys)
DROP TABLE IF EXISTS `back_payments`;
DROP TABLE IF EXISTS `student_charges`;
DROP TABLE IF EXISTS `payment_items`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `charges`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;

-- Users table
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','teacher','staff') DEFAULT 'staff',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
);

-- Students table
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_number` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `grade_level` int NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text,
  `parent_name` varchar(100) DEFAULT NULL,
  `parent_contact` varchar(20) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `enrollment_date` date NOT NULL,
  `status` enum('active','inactive','graduated') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_number` (`student_number`),
  CONSTRAINT `students_chk_1` CHECK ((`grade_level` >= 1) AND (`grade_level` <= 6))
);

-- Charges table
CREATE TABLE `charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `amount` decimal(10,2) NOT NULL,
  `charge_type` enum('tuition','books','uniform','activities','other') NOT NULL,
  `grade_level` int DEFAULT NULL,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `charges_chk_1` CHECK ((`grade_level` >= 1) AND (`grade_level` <= 6))
);

-- Payments table
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `payment_date` date NOT NULL,
  `invoice_number` varchar(20) UNIQUE DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','check') NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reverted` tinyint(1) DEFAULT 0,
  `reverted_date` timestamp NULL DEFAULT NULL,
  `reverted_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_payments_invoice_number` (`invoice_number`),
  KEY `idx_payments_reverted` (`reverted`),
  KEY `idx_payments_reverted_date` (`reverted_date`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);

-- Payment items table (detailed breakdown of each payment)
CREATE TABLE `payment_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `charge_id` int DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `is_manual_charge` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `charge_id` (`charge_id`),
  CONSTRAINT `payment_items_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_items_ibfk_2` FOREIGN KEY (`charge_id`) REFERENCES `charges` (`id`) ON DELETE SET NULL
);

-- Student charges (linking students to their applicable charges)
CREATE TABLE `student_charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `charge_id` int NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `status` enum('pending','partial','paid','overdue') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_charge` (`student_id`,`charge_id`),
  KEY `charge_id` (`charge_id`),
  CONSTRAINT `student_charges_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_charges_ibfk_2` FOREIGN KEY (`charge_id`) REFERENCES `charges` (`id`) ON DELETE CASCADE
);

-- Back payments table (for tracking unpaid charges from previous grades)
CREATE TABLE `back_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `original_grade_level` int NOT NULL,
  `current_grade_level` int NOT NULL,
  `charge_id` int NOT NULL,
  `charge_name` varchar(100) NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','partial','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `charge_id` (`charge_id`),
  CONSTRAINT `back_payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `back_payments_ibfk_2` FOREIGN KEY (`charge_id`) REFERENCES `charges` (`id`) ON DELETE CASCADE
);

-- Insert initial admin user
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO `users` (`username`, `email`, `password_hash`, `role`) VALUES 
('admin', 'admin@school.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewaBnBdmcSJlWuuO', 'admin');

-- Insert sample charges for different grade levels
INSERT IGNORE INTO `charges` (`name`, `description`, `amount`, `charge_type`, `grade_level`, `is_mandatory`, `is_active`) VALUES
-- Grade 1 charges
('Grade 1 Tuition', 'Monthly tuition fee for Grade 1', 5000.00, 'tuition', 1, 1, 1),
('Grade 1 Books', 'Required textbooks for Grade 1', 2500.00, 'books', 1, 1, 1),
('Grade 1 Uniform', 'School uniform for Grade 1', 1500.00, 'uniform', 1, 1, 1),

-- Grade 2 charges
('Grade 2 Tuition', 'Monthly tuition fee for Grade 2', 5500.00, 'tuition', 2, 1, 1),
('Grade 2 Books', 'Required textbooks for Grade 2', 2800.00, 'books', 2, 1, 1),
('Grade 2 Uniform', 'School uniform for Grade 2', 1500.00, 'uniform', 2, 1, 1),

-- Grade 3 charges
('Grade 3 Tuition', 'Monthly tuition fee for Grade 3', 6000.00, 'tuition', 3, 1, 1),
('Grade 3 Books', 'Required textbooks for Grade 3', 3000.00, 'books', 3, 1, 1),
('Grade 3 Uniform', 'School uniform for Grade 3', 1500.00, 'uniform', 3, 1, 1),

-- Grade 4 charges
('Grade 4 Tuition', 'Monthly tuition fee for Grade 4', 6500.00, 'tuition', 4, 1, 1),
('Grade 4 Books', 'Required textbooks for Grade 4', 3200.00, 'books', 4, 1, 1),
('Grade 4 Uniform', 'School uniform for Grade 4', 1500.00, 'uniform', 4, 1, 1),

-- Grade 5 charges
('Grade 5 Tuition', 'Monthly tuition fee for Grade 5', 7000.00, 'tuition', 5, 1, 1),
('Grade 5 Books', 'Required textbooks for Grade 5', 3500.00, 'books', 5, 1, 1),
('Grade 5 Uniform', 'School uniform for Grade 5', 1500.00, 'uniform', 5, 1, 1),

-- Grade 6 charges
('Grade 6 Tuition', 'Monthly tuition fee for Grade 6', 7500.00, 'tuition', 6, 1, 1),
('Grade 6 Books', 'Required textbooks for Grade 6', 3800.00, 'books', 6, 1, 1),
('Grade 6 Uniform', 'School uniform for Grade 6', 1500.00, 'uniform', 6, 1, 1),

-- Common charges for all grades
('School Activities', 'Sports and extracurricular activities', 1000.00, 'activities', NULL, 0, 1),
('School Supplies', 'General school supplies', 800.00, 'other', NULL, 0, 1);

-- Insert sample students
INSERT IGNORE INTO `students` (`student_number`, `first_name`, `last_name`, `grade_level`, `date_of_birth`, `address`, `parent_name`, `parent_contact`, `parent_email`, `enrollment_date`, `status`) VALUES
('STU001', 'John', 'Doe', 1, '2018-05-15', '123 Main St, City', 'Jane Doe', '09123456789', 'jane.doe@email.com', '2024-08-01', 'active'),
('STU002', 'Mary', 'Smith', 2, '2017-03-20', '456 Oak Ave, City', 'Robert Smith', '09987654321', 'robert.smith@email.com', '2023-08-01', 'active'),
('STU003', 'Peter', 'Johnson', 3, '2016-07-10', '789 Pine St, City', 'Linda Johnson', '09111222333', 'linda.johnson@email.com', '2022-08-01', 'active'),
('STU004', 'Sarah', 'Williams', 4, '2015-12-05', '321 Elm St, City', 'Michael Williams', '09444555666', 'michael.williams@email.com', '2021-08-01', 'active'),
('STU005', 'David', 'Brown', 5, '2014-09-25', '654 Maple Ave, City', 'Susan Brown', '09777888999', 'susan.brown@email.com', '2020-08-01', 'active'),
('STU006', 'Lisa', 'Davis', 6, '2013-11-30', '987 Cedar St, City', 'James Davis', '09000111222', 'james.davis@email.com', '2019-08-01', 'active');

-- Create database statistics view
CREATE OR REPLACE VIEW `database_stats` AS
SELECT 
    'Users' as table_name, COUNT(*) as record_count FROM `users`
UNION ALL
SELECT 
    'Students' as table_name, COUNT(*) as record_count FROM `students`
UNION ALL
SELECT 
    'Charges' as table_name, COUNT(*) as record_count FROM `charges`
UNION ALL
SELECT 
    'Payments' as table_name, COUNT(*) as record_count FROM `payments`
UNION ALL
SELECT 
    'Payment Items' as table_name, COUNT(*) as record_count FROM `payment_items`
UNION ALL
SELECT 
    'Student Charges' as table_name, COUNT(*) as record_count FROM `student_charges`
UNION ALL
SELECT 
    'Back Payments' as table_name, COUNT(*) as record_count FROM `back_payments`;

-- Show database creation summary
SELECT 'Database schema created successfully!' as message;
SELECT * FROM `database_stats`;
