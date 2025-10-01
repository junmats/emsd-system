-- Debug query to understand the discrepancy
-- Let's run this step by step

-- Step 1: Count students
SELECT 'Total students in students table:' as description, COUNT(*) as count FROM students WHERE status = 'active';

-- Step 2: Check the charges summary query step by step
SELECT 'Students with charge calculations (should match students table):' as description;
SELECT COUNT(*)
FROM students s
WHERE s.status = 'active';

-- Step 3: Check payments table for orphaned records
SELECT 'Total payments:' as description, COUNT(*) as count FROM payments;
SELECT 'Payments with valid students:' as description, COUNT(*) as count 
FROM payments p 
INNER JOIN students s ON p.student_id = s.id 
WHERE s.status = 'active';

-- Step 4: Check back_payments table for orphaned records  
SELECT 'Total back_payments:' as description, COUNT(*) as count FROM back_payments;
SELECT 'Back payments with valid students:' as description, COUNT(*) as count 
FROM back_payments bp 
INNER JOIN students s ON bp.student_id = s.id 
WHERE s.status = 'active';

-- Step 5: Run the exact charges summary query
SELECT 'Full charges summary query result count:' as description;
SELECT COUNT(*)
FROM students s
LEFT JOIN (
  SELECT 
    grade_level,
    SUM(CASE WHEN is_mandatory = true THEN amount ELSE 0 END) as mandatory_charges,
    SUM(amount) as total_charges
  FROM charges 
  WHERE is_active = true 
  GROUP BY grade_level
) charges_summary ON charges_summary.grade_level = s.grade_level
LEFT JOIN (
  SELECT 
    student_id,
    SUM(total_amount) as total_payments
  FROM payments 
  GROUP BY student_id
) payments_summary ON payments_summary.student_id = s.id
LEFT JOIN (
  SELECT 
    student_id,
    SUM(amount_due - amount_paid) as total_back_payments
  FROM back_payments 
  GROUP BY student_id
) back_payments_summary ON back_payments_summary.student_id = s.id
WHERE s.status = 'active';
