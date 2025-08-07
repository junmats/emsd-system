import { Router, Response, NextFunction } from 'express';
import { getConnection } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all charges
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { charge_type, grade_level, is_active = 'true' } = req.query;
    const connection = getConnection();
    
    let query = 'SELECT * FROM charges WHERE is_active = ?';
    const params: any[] = [is_active === 'true'];
    
    if (charge_type) {
      query += ' AND charge_type = ?';
      params.push(charge_type);
    }
    
    if (grade_level) {
      query += ' AND (grade_level = ? OR grade_level IS NULL)';
      params.push(grade_level);
    }
    
    query += ' ORDER BY charge_type, name';
    
    const [charges] = await connection.execute(query, params);

    res.json({
      success: true,
      data: charges
    });
  } catch (error) {
    next(error);
  }
});

// Get charge by ID
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [charges] = await connection.execute(
      'SELECT * FROM charges WHERE id = ?',
      [id]
    );

    if (!Array.isArray(charges) || charges.length === 0) {
      return next(createError('Charge not found', 404));
    }

    res.json({
      success: true,
      data: charges[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create new charge
router.post('/', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      amount,
      charge_type,
      grade_level,
      is_mandatory = true,
      is_active = true
    } = req.body;

    if (!name || !amount || !charge_type) {
      return next(createError('Required fields: name, amount, charge_type', 400));
    }

    if (amount <= 0) {
      return next(createError('Amount must be greater than 0', 400));
    }

    if (grade_level && (grade_level < 1 || grade_level > 6)) {
      return next(createError('Grade level must be between 1 and 6', 400));
    }

    const validChargeTypes = ['tuition', 'books', 'uniform', 'activities', 'other'];
    if (!validChargeTypes.includes(charge_type)) {
      return next(createError('Invalid charge type', 400));
    }

    const connection = getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO charges 
       (name, description, amount, charge_type, grade_level, is_mandatory, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, amount, charge_type, grade_level, is_mandatory, is_active]
    );

    res.status(201).json({
      success: true,
      message: 'Charge created successfully',
      chargeId: (result as any).insertId
    });
  } catch (error) {
    next(error);
  }
});

// Update charge
router.put('/:id', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      amount,
      charge_type,
      grade_level,
      is_mandatory,
      is_active
    } = req.body;

    const connection = getConnection();
    
    // Check if charge exists
    const [existing] = await connection.execute(
      'SELECT id FROM charges WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return next(createError('Charge not found', 404));
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (amount) {
      if (amount <= 0) {
        return next(createError('Amount must be greater than 0', 400));
      }
      updates.push('amount = ?');
      values.push(amount);
    }
    if (charge_type) {
      const validChargeTypes = ['tuition', 'books', 'uniform', 'activities', 'other'];
      if (!validChargeTypes.includes(charge_type)) {
        return next(createError('Invalid charge type', 400));
      }
      updates.push('charge_type = ?');
      values.push(charge_type);
    }
    if (grade_level !== undefined) {
      if (grade_level && (grade_level < 1 || grade_level > 6)) {
        return next(createError('Grade level must be between 1 and 6', 400));
      }
      updates.push('grade_level = ?');
      values.push(grade_level);
    }
    if (is_mandatory !== undefined) {
      updates.push('is_mandatory = ?');
      values.push(is_mandatory);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return next(createError('No fields to update', 400));
    }

    values.push(id);
    
    await connection.execute(
      `UPDATE charges SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Charge updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Delete charge
router.delete('/:id', requireRole(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    // Check if charge is used in any payments
    const [payments] = await connection.execute(
      'SELECT id FROM payment_items WHERE charge_id = ? LIMIT 1',
      [id]
    );

    if (Array.isArray(payments) && payments.length > 0) {
      return next(createError('Cannot delete charge that has been used in payments', 400));
    }

    const [result] = await connection.execute(
      'DELETE FROM charges WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      return next(createError('Charge not found', 404));
    }

    res.json({
      success: true,
      message: 'Charge deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get charges by grade level
router.get('/grade/:grade_level', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { grade_level } = req.params;
    
    if (Number(grade_level) < 1 || Number(grade_level) > 6) {
      return next(createError('Grade level must be between 1 and 6', 400));
    }

    const connection = getConnection();
    
    const [charges] = await connection.execute(
      'SELECT * FROM charges WHERE (grade_level = ? OR grade_level IS NULL) AND is_active = true ORDER BY charge_type, name',
      [grade_level]
    );

    res.json({
      success: true,
      data: charges
    });
  } catch (error) {
    next(error);
  }
});

// Get student charges summary
router.get('/students/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { grade_level, status = 'active' } = req.query;
    const connection = getConnection();
    
    let query = `
      SELECT 
        s.id as student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        s.grade_level,
        s.status,
        COALESCE(SUM(CASE WHEN c.is_mandatory = true THEN c.amount ELSE 0 END), 0) as mandatory_charges,
        COALESCE(SUM(c.amount), 0) as total_charges,
        COALESCE(SUM(p.total_amount), 0) as total_payments,
        (COALESCE(SUM(c.amount), 0) - COALESCE(SUM(p.total_amount), 0)) as remaining_balance
      FROM students s
      LEFT JOIN charges c ON c.grade_level = s.grade_level AND c.is_active = true
      LEFT JOIN payments p ON p.student_id = s.id
      WHERE s.status = ?
    `;
    
    const params: any[] = [status];
    
    if (grade_level) {
      query += ' AND s.grade_level = ?';
      params.push(grade_level);
    }
    
    query += `
      GROUP BY s.id, s.student_number, s.first_name, s.last_name, s.grade_level, s.status
      ORDER BY s.grade_level, s.last_name, s.first_name
    `;
    
    const [studentCharges] = await connection.execute(query, params);

    res.json({
      success: true,
      data: studentCharges
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed charge breakdown for a specific student
router.get('/students/:studentId/breakdown', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const connection = getConnection();
    
    // Get student info
    const [studentData] = await connection.execute(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );
    
    if (!Array.isArray(studentData) || studentData.length === 0) {
      return next(createError('Student not found', 404));
    }
    
    const student = (studentData as any[])[0];
    
    // Get all charges for student's grade level
    const [charges] = await connection.execute(
      `SELECT id, name, description, amount, charge_type, is_mandatory, is_active 
       FROM charges 
       WHERE grade_level = ? AND is_active = true 
       ORDER BY charge_type, name`,
      [student.grade_level]
    );
    
    // Get all payments made by this student
    const [payments] = await connection.execute(
      `SELECT id, total_amount, payment_date, notes, created_at
       FROM payments 
       WHERE student_id = ? 
       ORDER BY payment_date DESC, created_at DESC`,
      [studentId]
    );
    
    // Calculate totals
    const totalCharges = (charges as any[]).reduce((sum, charge) => sum + charge.amount, 0);
    const mandatoryCharges = (charges as any[]).filter(c => c.is_mandatory).reduce((sum, charge) => sum + charge.amount, 0);
    const totalPayments = (payments as any[]).reduce((sum, payment) => sum + payment.total_amount, 0);
    const remainingBalance = totalCharges - totalPayments;
    
    res.json({
      success: true,
      data: {
        student,
        charges,
        payments,
        summary: {
          total_charges: totalCharges,
          mandatory_charges: mandatoryCharges,
          total_payments: totalPayments,
          remaining_balance: remainingBalance
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
