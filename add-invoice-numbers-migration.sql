-- Add invoice number to payments table
-- Migration script for adding invoice tracking

-- Add invoice_number column to payments table
ALTER TABLE payments 
ADD COLUMN invoice_number VARCHAR(20) UNIQUE DEFAULT NULL AFTER id;

-- Create index for faster invoice number lookups
CREATE INDEX idx_payments_invoice_number ON payments(invoice_number);

-- Update existing payments with invoice numbers
-- Format: YYYY-NNNNNN (year + 6-digit sequential number)
SET @row_number = 0;
UPDATE payments 
SET invoice_number = CONCAT(
    YEAR(created_at), 
    '-', 
    LPAD((@row_number := @row_number + 1), 6, '0')
)
WHERE invoice_number IS NULL
ORDER BY created_at ASC;

-- Verify the migration
SELECT 'Migration completed successfully. Sample invoice numbers:' as status;
SELECT id, invoice_number, payment_date, total_amount 
FROM payments 
ORDER BY created_at ASC 
LIMIT 5;

SELECT 'Total payments with invoice numbers:' as status;
SELECT COUNT(*) as count FROM payments WHERE invoice_number IS NOT NULL;
