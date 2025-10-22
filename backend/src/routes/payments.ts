import { Router, Response, NextFunction } from 'express';
import { getConnection } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to generate invoice number
async function generateInvoiceNumber(connection: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  
  // Get the next sequence number for this year
  const [result] = await connection.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number, 6) AS UNSIGNED)), 0) + 1 as next_number
     FROM payments 
     WHERE invoice_number LIKE ?`,
    [`${currentYear}-%`]
  );
  
  const nextNumber = (result as any[])[0].next_number;
  
  // Format: YYYY-NNNNNN (year + 6-digit sequential number)
  return `${currentYear}-${nextNumber.toString().padStart(6, '0')}`;
}

// Get all payments
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { student_id, start_date, end_date, payment_method, page = 1, limit = 50 } = req.query;
    const connection = getConnection();
    
    let query = `
      SELECT p.*, s.first_name, s.last_name, s.student_number, s.middle_name, u.username as created_by_username
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (student_id) {
      query += ' AND p.student_id = ?';
      params.push(student_id);
    }
    
    if (start_date) {
      query += ' AND p.payment_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND p.payment_date <= ?';
      params.push(end_date);
    }

    if (payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(payment_method);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    query += ` ORDER BY p.payment_date DESC, p.created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`;
    
    const [payments] = await connection.execute(query, params);
    
    // Get payment items for each payment
    for (const payment of payments as any[]) {
      const [items] = await connection.execute(
        `SELECT pi.*, c.name as charge_name, c.charge_type 
         FROM payment_items pi
         LEFT JOIN charges c ON pi.charge_id = c.id
         WHERE pi.payment_id = ?`,
        [payment.id]
      );
      payment.items = items;
    }
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE 1=1
    `;
    const countParams: any[] = [];
    
    if (student_id) {
      countQuery += ' AND p.student_id = ?';
      countParams.push(student_id);
    }
    
    if (start_date) {
      countQuery += ' AND p.payment_date >= ?';
      countParams.push(start_date);
    }
    
    if (end_date) {
      countQuery += ' AND p.payment_date <= ?';
      countParams.push(end_date);
    }

    if (payment_method) {
      countQuery += ' AND p.payment_method = ?';
      countParams.push(payment_method);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = (countResult as any[])[0].total;

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get payment by ID
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [payments] = await connection.execute(
      `SELECT p.*, s.first_name, s.last_name, s.middle_name, s.student_number, u.username as created_by_username
       FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!Array.isArray(payments) || payments.length === 0) {
      return next(createError('Payment not found', 404));
    }

    const payment = payments[0] as any;

    // Get payment items
    const [items] = await connection.execute(
      `SELECT pi.*, c.name as charge_name, c.charge_type 
       FROM payment_items pi
       LEFT JOIN charges c ON pi.charge_id = c.id
       WHERE pi.payment_id = ?`,
      [id]
    );

    payment.items = items;

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
});

// Create new payment
router.post('/', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      student_id,
      payment_date,
      payment_method,
      reference_number,
      notes,
      items
    } = req.body;

    if (!student_id || !payment_date || !payment_method || !items || !Array.isArray(items) || items.length === 0) {
      return next(createError('Required fields: student_id, payment_date, payment_method, items', 400));
    }

    const validPaymentMethods = ['cash', 'card', 'bank_transfer', 'check'];
    if (!validPaymentMethods.includes(payment_method)) {
      return next(createError('Invalid payment method', 400));
    }

    // Calculate total amount
    const total_amount = items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

    if (total_amount <= 0) {
      return next(createError('Total amount must be greater than 0', 400));
    }

    const pool = getConnection();
    
    // Check if student exists
    const [students] = await pool.execute(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (!Array.isArray(students) || students.length === 0) {
      return next(createError('Student not found', 404));
    }

    // Get connection and start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(connection);
      
      // Insert payment
      const [paymentResult] = await connection.execute(
        `INSERT INTO payments 
         (invoice_number, student_id, payment_date, total_amount, payment_method, reference_number, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNumber, student_id, payment_date, total_amount, payment_method, reference_number || null, notes || null, req.user!.id]
      );

      const paymentId = (paymentResult as any).insertId;

      // Insert payment items
      for (const item of items) {
        if (!item.description || !item.amount) {
          throw new Error('Each item must have description and amount');
        }

        await connection.execute(
          `INSERT INTO payment_items 
           (payment_id, charge_id, description, amount, is_manual_charge)
           VALUES (?, ?, ?, ?, ?)`,
          [paymentId, item.charge_id || null, item.description, item.amount, item.is_manual_charge || false]
        );

        // Update student charges if this is linked to a charge
        if (item.charge_id) {
          await connection.execute(
            `INSERT INTO student_charges (student_id, charge_id, amount_due, amount_paid)
             VALUES (?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE amount_paid = amount_paid + VALUES(amount_paid)`,
            [student_id, item.charge_id, item.amount]
          );

          // Update status based on payment
          await connection.execute(
            `UPDATE student_charges 
             SET status = CASE 
               WHEN amount_paid >= amount_due THEN 'paid'
               WHEN amount_paid > 0 THEN 'partial'
               ELSE 'pending'
             END
             WHERE student_id = ? AND charge_id = ?`,
            [student_id, item.charge_id]
          );
        }

        // Handle back payment updates if this is a back payment item
        if (item.is_manual_charge && item.description && item.description.includes('Back Payment:')) {
          // Try to identify which back payment this relates to based on description
          const backPaymentMatch = item.description.match(/Back Payment: (.+) \(Grade (\d+) → (\d+)\)/);
          if (backPaymentMatch) {
            const chargeName = backPaymentMatch[1];
            const originalGrade = parseInt(backPaymentMatch[2]);
            const currentGrade = parseInt(backPaymentMatch[3]);
            
            // Find and update the corresponding back payment record
            await connection.execute(
              `UPDATE back_payments 
               SET amount_paid = amount_paid + ?,
                   status = CASE 
                     WHEN amount_paid + ? >= amount_due THEN 'paid'
                     WHEN amount_paid + ? > 0 THEN 'partial'
                     ELSE 'pending'
                   END,
                   updated_at = NOW()
               WHERE student_id = ? 
                 AND original_grade_level = ? 
                 AND current_grade_level = ? 
                 AND charge_name = ?`,
              [item.amount, item.amount, item.amount, student_id, originalGrade, currentGrade, chargeName]
            );
          }
        }
      }

      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        paymentId
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Get student's payment history
router.get('/student/:student_id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const connection = getConnection();
    
    // Check if student exists
    const [students] = await connection.execute(
      'SELECT id, first_name, last_name, student_number FROM students WHERE id = ?',
      [student_id]
    );

    if (!Array.isArray(students) || students.length === 0) {
      return next(createError('Student not found', 404));
    }

    const student = students[0];

    const offset = (Number(page) - 1) * Number(limit);
    
    const [payments] = await connection.execute(
      `SELECT p.*, u.username as created_by_username
       FROM payments p
       JOIN users u ON p.created_by = u.id
       WHERE p.student_id = ?
       ORDER BY p.payment_date DESC, p.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      [student_id]
    );

    // Get payment items for each payment
    for (const payment of payments as any[]) {
      const [items] = await connection.execute(
        `SELECT pi.*, c.name as charge_name, c.charge_type 
         FROM payment_items pi
         LEFT JOIN charges c ON pi.charge_id = c.id
         WHERE pi.payment_id = ?`,
        [payment.id]
      );
      payment.items = items;
    }

    // Get total payments count and amount
    const [summary] = await connection.execute(
      `SELECT 
         COUNT(*) as total_payments,
         COALESCE(SUM(total_amount), 0) as total_amount_paid
       FROM payments 
       WHERE student_id = ?`,
      [student_id]
    );

    res.json({
      success: true,
      data: {
        student,
        payments,
        summary: (summary as any[])[0],
        pagination: {
          page: Number(page),
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Revert payment (admin only) - Mark payment as reverted and restore student charges
router.post('/:id/revert', requireRole(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log(`[REVERT] START: Payment ${id} revert requested with reason: ${reason}`);
    const pool = getConnection();

    // Get connection and start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get payment details
      const [payments] = await connection.execute(
        'SELECT * FROM payments WHERE id = ?',
        [id]
      );

      if (!Array.isArray(payments) || payments.length === 0) {
        connection.release();
        return next(createError('Payment not found', 404));
      }

      const payment = payments[0] as any;

      // Check if already reverted
      if (payment.reverted) {
        connection.release();
        return next(createError('Payment has already been reverted', 400));
      }

      // Get payment items to reverse student charges (both regular charges and manual charges for back payments)
      const [items] = await connection.execute(
        'SELECT charge_id, amount, description, is_manual_charge FROM payment_items WHERE payment_id = ?',
        [id]
      );

      console.log(`[REVERT] Payment ${id} revert starting. Items found:`, items);

      // Reverse student charges
      for (const item of items as any[]) {
        // Handle regular charge items
        if (item.charge_id) {
          const [currentCharges] = await connection.execute(
            `SELECT amount_paid, amount_due FROM student_charges 
             WHERE student_id = ? AND charge_id = ?`,
            [payment.student_id, item.charge_id]
          );

          console.log(`[REVERT] Charge ${item.charge_id} current state:`, currentCharges);

          if (Array.isArray(currentCharges) && currentCharges.length > 0) {
            const currentCharge = currentCharges[0] as any;
            const newAmountPaid = Math.max(0, currentCharge.amount_paid - item.amount);

            console.log(`[REVERT] Updating charge ${item.charge_id}: ${currentCharge.amount_paid} - ${item.amount} = ${newAmountPaid}`);

            // Update the amount paid
            await connection.execute(
              `UPDATE student_charges 
               SET amount_paid = ?
               WHERE student_id = ? AND charge_id = ?`,
              [newAmountPaid, payment.student_id, item.charge_id]
            );

            console.log(`[REVERT] Updated charge ${item.charge_id} amount_paid to ${newAmountPaid}`);

            // Update status based on remaining balance
            let newStatus = 'pending';
            if (newAmountPaid >= currentCharge.amount_due && currentCharge.amount_due > 0) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partial';
            }

            await connection.execute(
              `UPDATE student_charges 
               SET status = ?
               WHERE student_id = ? AND charge_id = ?`,
              [newStatus, payment.student_id, item.charge_id]
            );
          }
        }

        // Handle back payment updates if this is a back payment item
        if (item.is_manual_charge && item.description && item.description.includes('Back Payment:')) {
          // Try to identify which back payment this relates to based on description
          const backPaymentMatch = item.description.match(/Back Payment: (.+) \(Grade (\d+) → (\d+)\)/);
          if (backPaymentMatch) {
            const chargeName = backPaymentMatch[1];
            const originalGrade = parseInt(backPaymentMatch[2]);
            const currentGrade = parseInt(backPaymentMatch[3]);
            
            // Get current back payment details
            const [currentBackPayments] = await connection.execute(
              `SELECT amount_paid, amount_due FROM back_payments 
               WHERE student_id = ? 
                 AND original_grade_level = ? 
                 AND current_grade_level = ? 
                 AND charge_name = ?`,
              [payment.student_id, originalGrade, currentGrade, chargeName]
            );

            if (Array.isArray(currentBackPayments) && currentBackPayments.length > 0) {
              const currentBackPayment = currentBackPayments[0] as any;
              const newAmountPaid = Math.max(0, currentBackPayment.amount_paid - item.amount);

              // Determine new status
              let newStatus = 'pending';
              if (newAmountPaid >= currentBackPayment.amount_due && currentBackPayment.amount_due > 0) {
                newStatus = 'paid';
              } else if (newAmountPaid > 0) {
                newStatus = 'partial';
              }

              // Update the back payment
              await connection.execute(
                `UPDATE back_payments 
                 SET amount_paid = ?,
                     status = ?,
                     updated_at = NOW()
                 WHERE student_id = ? 
                   AND original_grade_level = ? 
                   AND current_grade_level = ? 
                   AND charge_name = ?`,
                [newAmountPaid, newStatus, payment.student_id, originalGrade, currentGrade, chargeName]
              );
            }
          }
        }
      }

      // Mark payment as reverted
      await connection.execute(
        `UPDATE payments 
         SET reverted = 1, reverted_date = NOW(), reverted_reason = ?
         WHERE id = ?`,
        [reason || 'Manual revert', id]
      );

      console.log(`[REVERT] SUCCESS: Payment ${id} marked as reverted in database`);

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Payment reverted successfully',
        data: {
          payment_id: id,
          reverted_date: new Date(),
          reverted_reason: reason
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Delete payment (admin only)
router.delete('/:id', requireRole(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pool = getConnection();
    
    // Get connection and start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get payment details before deletion
      const [payments] = await connection.execute(
        'SELECT student_id FROM payments WHERE id = ?',
        [id]
      );

      if (!Array.isArray(payments) || payments.length === 0) {
        return next(createError('Payment not found', 404));
      }

      const payment = payments[0] as any;

      // Get payment items to reverse student charges
      const [items] = await connection.execute(
        'SELECT charge_id, amount FROM payment_items WHERE payment_id = ? AND charge_id IS NOT NULL',
        [id]
      );

      // Reverse student charges
      for (const item of items as any[]) {
        await connection.execute(
          `UPDATE student_charges 
           SET amount_paid = GREATEST(0, amount_paid - ?)
           WHERE student_id = ? AND charge_id = ?`,
          [item.amount, payment.student_id, item.charge_id]
        );

        // Update status
        await connection.execute(
          `UPDATE student_charges 
           SET status = CASE 
             WHEN amount_paid >= amount_due THEN 'paid'
             WHEN amount_paid > 0 THEN 'partial'
             ELSE 'pending'
           END
           WHERE student_id = ? AND charge_id = ?`,
          [payment.student_id, item.charge_id]
        );
      }

      // Delete payment items first (foreign key constraint)
      await connection.execute('DELETE FROM payment_items WHERE payment_id = ?', [id]);
      
      // Delete payment
      const [result] = await connection.execute('DELETE FROM payments WHERE id = ?', [id]);

      if ((result as any).affectedRows === 0) {
        throw new Error('Payment not found');
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Payment deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
