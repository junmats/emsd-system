import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getConnection } from '../config/database';

const router = Router();

// Create assessment tables migration
router.post('/create-assessment-tables', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const connection = getConnection();
    
    console.log('Creating assessment tables...');
    
    // Create assessment_batches table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assessment_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_name VARCHAR(255) NOT NULL,
        assessment_date DATE NOT NULL,
        due_date DATE NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    console.log('Created assessment_batches table');
    
    // Create assessments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        student_id INT NOT NULL,
        assessment_date DATE NOT NULL,
        due_date DATE NOT NULL,
        total_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        current_due DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES assessment_batches(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_batch_student (batch_id, student_id)
      )
    `);
    console.log('Created assessments table');
    
    // Create indexes
    try {
      await connection.execute('CREATE INDEX idx_assessment_batches_created_at ON assessment_batches(created_at)');
      await connection.execute('CREATE INDEX idx_assessment_batches_assessment_date ON assessment_batches(assessment_date)');
      await connection.execute('CREATE INDEX idx_assessments_batch_id ON assessments(batch_id)');
      await connection.execute('CREATE INDEX idx_assessments_student_id ON assessments(student_id)');
      await connection.execute('CREATE INDEX idx_assessments_assessment_date ON assessments(assessment_date)');
      console.log('Created indexes');
    } catch (error: any) {
      console.log('Some indexes may already exist:', error.message);
    }

    res.json({
      success: true,
      message: 'Assessment tables created successfully'
    });
  } catch (error) {
    console.error('Error creating assessment tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assessment tables',
      error: (error as Error).message
    });
  }
});

// Temporary migration endpoint - remove after running
router.post('/add-invoice-numbers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const connection = getConnection();
    
    console.log('Starting invoice number migration...');
    
    // Step 1: Add invoice_number column
    try {
      await connection.execute(`
        ALTER TABLE payments 
        ADD COLUMN invoice_number VARCHAR(20) UNIQUE AFTER payment_date
      `);
      console.log('Added invoice_number column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('invoice_number column already exists');
      } else {
        throw error;
      }
    }
    
    // Step 2: Get all payments without invoice numbers
    const [payments] = await connection.execute(`
      SELECT id, payment_date 
      FROM payments 
      WHERE invoice_number IS NULL 
      ORDER BY payment_date ASC, id ASC
    `);
    
    console.log(`Found ${(payments as any[]).length} payments without invoice numbers`);
    
    // Step 3: Generate invoice numbers for existing payments
    const paymentList = payments as any[];
    const yearCounters: { [key: string]: number } = {};
    
    for (const payment of paymentList) {
      const paymentDate = new Date(payment.payment_date);
      const year = paymentDate.getFullYear().toString();
      
      // Initialize or increment counter for this year
      if (!yearCounters[year]) {
        // Check existing invoice numbers for this year to get the highest number
        const [existingInvoices] = await connection.execute(`
          SELECT invoice_number 
          FROM payments 
          WHERE invoice_number LIKE ? 
          ORDER BY invoice_number DESC 
          LIMIT 1
        `, [`${year}-%`]);
        
        if ((existingInvoices as any[]).length > 0) {
          const lastInvoice = (existingInvoices as any[])[0].invoice_number;
          const lastNumber = parseInt(lastInvoice.split('-')[1]);
          yearCounters[year] = lastNumber + 1;
        } else {
          yearCounters[year] = 1;
        }
      } else {
        yearCounters[year]++;
      }
      
      // Generate invoice number: YYYY-NNNNNN
      const invoiceNumber = `${year}-${yearCounters[year].toString().padStart(6, '0')}`;
      
      // Update the payment with the invoice number
      await connection.execute(`
        UPDATE payments 
        SET invoice_number = ? 
        WHERE id = ?
      `, [invoiceNumber, payment.id]);
      
      console.log(`Generated invoice ${invoiceNumber} for payment ${payment.id}`);
    }
    
    console.log('Migration completed successfully');
    
    res.json({
      success: true,
      message: 'Invoice number migration completed successfully',
      processed: paymentList.length,
      yearCounters
    });
  } catch (error) {
    console.error('Migration error:', error);
    next(error);
  }
});

export default router;
