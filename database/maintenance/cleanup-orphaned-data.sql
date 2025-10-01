-- Cleanup script for orphaned financial data
-- This script removes financial records for students that no longer exist in the students table

-- First, let's see what orphaned data exists
SELECT 'Orphaned payment records:' as description;
SELECT COUNT(*) as count 
FROM payments p 
LEFT JOIN students s ON p.student_id = s.id 
WHERE s.id IS NULL;

SELECT 'Orphaned back_payment records:' as description;
SELECT COUNT(*) as count 
FROM back_payments bp 
LEFT JOIN students s ON bp.student_id = s.id 
WHERE s.id IS NULL;

SELECT 'Orphaned payment_items records:' as description;
SELECT COUNT(*) as count 
FROM payment_items pi 
LEFT JOIN payments p ON pi.payment_id = p.id
LEFT JOIN students s ON p.student_id = s.id 
WHERE s.id IS NULL;

-- Show some examples of orphaned student IDs
SELECT 'Sample orphaned student IDs in payments:' as description;
SELECT DISTINCT p.student_id
FROM payments p 
LEFT JOIN students s ON p.student_id = s.id 
WHERE s.id IS NULL
LIMIT 10;

-- Clean up orphaned payment_items first (child records)
DELETE pi FROM payment_items pi
LEFT JOIN payments p ON pi.payment_id = p.id
LEFT JOIN students s ON p.student_id = s.id
WHERE s.id IS NULL;

-- Clean up orphaned payments
DELETE p FROM payments p
LEFT JOIN students s ON p.student_id = s.id
WHERE s.id IS NULL;

-- Clean up orphaned back_payments
DELETE bp FROM back_payments bp
LEFT JOIN students s ON bp.student_id = s.id
WHERE s.id IS NULL;

-- Verify cleanup
SELECT 'After cleanup - Orphaned payment records:' as description;
SELECT COUNT(*) as count 
FROM payments p 
LEFT JOIN students s ON p.student_id = s.id 
WHERE s.id IS NULL;

SELECT 'After cleanup - Orphaned back_payment records:' as description;
SELECT COUNT(*) as count 
FROM back_payments bp 
LEFT JOIN students s ON bp.student_id = s.id 
WHERE s.id IS NULL;

SELECT 'After cleanup - Orphaned payment_items records:' as description;
SELECT COUNT(*) as count 
FROM payment_items pi 
LEFT JOIN payments p ON pi.payment_id = p.id
LEFT JOIN students s ON p.student_id = s.id 
WHERE s.id IS NULL;

SELECT 'Cleanup completed successfully!' as status;
