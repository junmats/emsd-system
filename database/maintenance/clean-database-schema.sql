-- EMSD School System Database Schema - Clean Structure Only
-- No sample data - your backend will handle initial setup

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
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','check') NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `created_by` (`created_by`),
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

-- Show database creation summary
SELECT 'Clean database schema created successfully!' as message;
SELECT 'No sample data added - ready for your own data' as note;
