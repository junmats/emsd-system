-- Add middle_name column to students table
-- Run this on Railway database

ALTER TABLE students 
ADD COLUMN middle_name VARCHAR(50) AFTER first_name;

-- Add some sample data for testing (optional)
-- UPDATE students SET middle_name = 'John' WHERE id = 1;
-- UPDATE students SET middle_name = 'Marie' WHERE id = 2;

-- Verify the change
DESC students;
