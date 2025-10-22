-- Add payment revert tracking columns to payments table
-- Migration script for adding revert functionality

-- Add reverted flag column
ALTER TABLE payments 
ADD COLUMN reverted TINYINT(1) DEFAULT 0 AFTER created_at;

-- Add reverted_date column
ALTER TABLE payments 
ADD COLUMN reverted_date TIMESTAMP NULL DEFAULT NULL AFTER reverted;

-- Add reverted_reason column
ALTER TABLE payments 
ADD COLUMN reverted_reason VARCHAR(255) DEFAULT NULL AFTER reverted_date;

-- Create index for faster revert status lookups
CREATE INDEX idx_payments_reverted ON payments(reverted);

-- Create index for revert date queries
CREATE INDEX idx_payments_reverted_date ON payments(reverted_date);

-- Verify the migration
SELECT 'Migration completed successfully. Payment table structure:' as status;
DESCRIBE payments;

SELECT 'Verification: All existing payments default to non-reverted:' as status;
SELECT COUNT(*) as total_payments, SUM(reverted) as reverted_count 
FROM payments;
