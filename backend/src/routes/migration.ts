import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getConnection } from '../config/database';

const router = Router();

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
