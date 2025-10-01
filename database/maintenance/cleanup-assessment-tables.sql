-- Clean up any assessment-related tables that might exist
-- Run this to ensure no assessment tables remain in the database

-- Show any existing assessment tables
SHOW TABLES LIKE '%assessment%';

-- Drop assessment tables if they exist
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS assessment_batches;

-- Verify cleanup
SHOW TABLES LIKE '%assessment%';
