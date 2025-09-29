-- Check if assessment_flags table exists and show its structure
USE emsd_system;

-- Show table structure
DESCRIBE assessment_flags;

-- Show all tables to verify assessment_flags exists
SHOW TABLES;

-- Count any existing flags
SELECT COUNT(*) as flag_count FROM assessment_flags;

-- Show sample data if any exists
SELECT * FROM assessment_flags LIMIT 5;
