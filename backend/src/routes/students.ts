import { Router, Response, NextFunction } from 'express';
import { getConnection } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all students
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { grade_level, status = 'active', page = 1, limit = 50 } = req.query;
    const connection = getConnection();
    
    let query = 'SELECT * FROM students WHERE status = ?';
    const params: any[] = [status];
    
    if (grade_level) {
      query += ' AND grade_level = ?';
      params.push(grade_level);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    query += ` ORDER BY last_name, first_name LIMIT ${Number(limit)} OFFSET ${offset}`;
    
    const [students] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM students WHERE status = ?';
    const countParams: any[] = [status];
    
    if (grade_level) {
      countQuery += ' AND grade_level = ?';
      countParams.push(grade_level);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = (countResult as any[])[0].total;

    res.json({
      success: true,
      data: students,
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

// Get student by ID
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [students] = await connection.execute(
      'SELECT * FROM students WHERE id = ?',
      [id]
    );

    if (!Array.isArray(students) || students.length === 0) {
      return next(createError('Student not found', 404));
    }

    res.json({
      success: true,
      data: students[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create new student
router.post('/', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      student_number,
      first_name,
      middle_name,
      last_name,
      grade_level,
      date_of_birth,
      address,
      parent_name,
      parent_contact,
      parent_email,
      enrollment_date
    } = req.body;

    if (!student_number || !first_name || !last_name || !grade_level || !enrollment_date) {
      return next(createError('Required fields: student_number, first_name, last_name, grade_level, enrollment_date', 400));
    }

    if (grade_level < 1 || grade_level > 6) {
      return next(createError('Grade level must be between 1 and 6', 400));
    }

    const connection = getConnection();
    
    // Check if student number already exists
    const [existing] = await connection.execute(
      'SELECT id FROM students WHERE student_number = ?',
      [student_number]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return next(createError('Student number already exists', 409));
    }

    const [result] = await connection.execute(
      `INSERT INTO students 
       (student_number, first_name, middle_name, last_name, grade_level, date_of_birth, 
        address, parent_name, parent_contact, parent_email, enrollment_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_number, 
        first_name, 
        middle_name || null,
        last_name, 
        grade_level, 
        date_of_birth || null,
        address || null, 
        parent_name || null, 
        parent_contact || null, 
        parent_email || null, 
        enrollment_date
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      studentId: (result as any).insertId
    });
  } catch (error) {
    next(error);
  }
});

// Update student
router.put('/:id', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      student_number,
      first_name,
      middle_name,
      last_name,
      grade_level,
      date_of_birth,
      address,
      parent_name,
      parent_contact,
      parent_email,
      status
    } = req.body;

    if (grade_level && (grade_level < 1 || grade_level > 6)) {
      return next(createError('Grade level must be between 1 and 6', 400));
    }

    const connection = getConnection();
    
    // Check if student exists and get current grade level
    const [existing] = await connection.execute(
      'SELECT id, grade_level, first_name, last_name FROM students WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return next(createError('Student not found', 404));
    }

    const currentStudent = existing[0] as any;
    const currentGradeLevel = currentStudent.grade_level;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (student_number) {
      updates.push('student_number = ?');
      values.push(student_number);
    }
    if (first_name) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (middle_name !== undefined) {
      updates.push('middle_name = ?');
      values.push(middle_name || null);
    }
    if (last_name) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (grade_level) {
      updates.push('grade_level = ?');
      values.push(grade_level);
    }
    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(date_of_birth || null);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address || null);
    }
    if (parent_name !== undefined) {
      updates.push('parent_name = ?');
      values.push(parent_name || null);
    }
    if (parent_contact !== undefined) {
      updates.push('parent_contact = ?');
      values.push(parent_contact || null);
    }
    if (parent_email !== undefined) {
      updates.push('parent_email = ?');
      values.push(parent_email || null);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return next(createError('No fields to update', 400));
    }

    values.push(id);
    
    await connection.execute(
      `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Check for back payments before upgrade
router.post('/:id/check-back-payments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { new_grade_level } = req.body;
    const connection = getConnection();
    
    // Get current student info
    const [existing] = await connection.execute(
      'SELECT id, grade_level, first_name, last_name FROM students WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return next(createError('Student not found', 404));
    }

    const currentStudent = existing[0] as any;
    const currentGradeLevel = currentStudent.grade_level;

    if (new_grade_level <= currentGradeLevel) {
      return res.json({
        success: true,
        hasBackPayments: false,
        backPaymentInfo: null
      });
    }

    console.log(`Checking for back payments for student ${id}, current grade: ${currentGradeLevel}, new grade: ${new_grade_level}`);
    
    // Check existing unpaid student charges
    const [unpaidCharges] = await connection.execute(`
      SELECT sc.*, c.name as charge_name, c.charge_type 
      FROM student_charges sc
      JOIN charges c ON sc.charge_id = c.id
      WHERE sc.student_id = ? 
      AND (sc.status = 'pending' OR sc.status = 'partial' OR sc.status = 'overdue')
      AND (c.grade_level = ? OR c.grade_level IS NULL)
      AND sc.amount_due > sc.amount_paid
    `, [id, currentGradeLevel]);

    // Check for mandatory charges that should apply but aren't assigned yet
    const [unassignedCharges] = await connection.execute(`
      SELECT c.*, c.amount as amount_due, 0 as amount_paid, 'pending' as status
      FROM charges c
      WHERE c.is_active = 1 
      AND c.is_mandatory = 1
      AND (c.grade_level = ? OR c.grade_level IS NULL)
      AND c.id NOT IN (
        SELECT COALESCE(sc.charge_id, 0) 
        FROM student_charges sc 
        WHERE sc.student_id = ?
      )
    `, [currentGradeLevel, id]);

    // Combine both types of charges
    const allUnpaidCharges = [
      ...(Array.isArray(unpaidCharges) ? unpaidCharges : []),
      ...(Array.isArray(unassignedCharges) ? unassignedCharges.map((c: any) => ({
        ...c,
        charge_id: c.id,
        charge_name: c.name,
        charge_type: c.charge_type
      })) : [])
    ];

    if (allUnpaidCharges.length > 0) {
      const totalUnpaid = allUnpaidCharges.reduce((sum: number, charge: any) => 
        sum + (charge.amount_due - charge.amount_paid), 0);
      
      const backPaymentInfo = {
        student: currentStudent,
        unpaidCharges: allUnpaidCharges,
        totalAmount: totalUnpaid,
        originalGrade: currentGradeLevel,
        newGrade: new_grade_level
      };
      
      return res.json({
        success: true,
        hasBackPayments: true,
        backPaymentInfo: backPaymentInfo
      });
    }

    res.json({
      success: true,
      hasBackPayments: false,
      backPaymentInfo: null
    });
  } catch (error) {
    next(error);
  }
});

// Create back payments and upgrade student
router.post('/:id/upgrade-with-back-payments', requireRole(['admin', 'staff']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { new_grade_level, status, unpaid_charges } = req.body;
    const connection = getConnection();
    
    // Get current student info
    const [existing] = await connection.execute(
      'SELECT id, grade_level, first_name, last_name FROM students WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return next(createError('Student not found', 404));
    }

    const currentStudent = existing[0] as any;
    const currentGradeLevel = currentStudent.grade_level;

    // Update student grade level
    await connection.execute(
      'UPDATE students SET grade_level = ?, status = ? WHERE id = ?',
      [new_grade_level, status || 'active', id]
    );

    // Create back payment records for unpaid charges
    if (unpaid_charges && Array.isArray(unpaid_charges)) {
      for (const charge of unpaid_charges) {
        const unpaidAmount = charge.amount_due - charge.amount_paid;
        if (unpaidAmount > 0) {
          // If this charge wasn't in student_charges yet, create the student_charge record first
          if (!charge.id) { // This means it was from unassigned charges
            await connection.execute(`
              INSERT INTO student_charges (student_id, charge_id, amount_due, amount_paid, status)
              VALUES (?, ?, ?, ?, ?)
            `, [id, charge.charge_id, charge.amount_due, charge.amount_paid, 'pending']);
          }
          
          // Create back payment record
          await connection.execute(`
            INSERT INTO back_payments (student_id, original_grade_level, current_grade_level, charge_id, charge_name, amount_due, amount_paid, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, 
            currentGradeLevel, 
            new_grade_level, 
            charge.charge_id, 
            charge.charge_name, 
            unpaidAmount, 
            0, 
            'pending'
          ]);
        }
      }
    }

    res.json({
      success: true,
      message: 'Student upgraded successfully with back payments created'
    });
  } catch (error) {
    next(error);
  }
});

// Get student charges
router.get('/:id/charges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [studentCharges] = await connection.execute(`
      SELECT sc.*, c.name as charge_name, c.charge_type, c.grade_level
      FROM student_charges sc
      JOIN charges c ON sc.charge_id = c.id
      WHERE sc.student_id = ?
      ORDER BY c.grade_level, c.charge_type
    `, [id]);

    res.json({
      success: true,
      data: studentCharges
    });
  } catch (error) {
    next(error);
  }
});

// Get student back payments
router.get('/:id/back-payments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [backPayments] = await connection.execute(`
      SELECT bp.*, s.first_name, s.last_name, s.student_number
      FROM back_payments bp
      JOIN students s ON bp.student_id = s.id
      WHERE bp.student_id = ?
      ORDER BY bp.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: backPayments
    });
  } catch (error) {
    next(error);
  }
});

// Batch upgrade grade levels
router.post('/batch-upgrade', requireRole(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from_grade, to_grade, student_ids } = req.body;

    if (!from_grade || !to_grade) {
      return next(createError('from_grade and to_grade are required', 400));
    }

    if (from_grade < 1 || from_grade > 6 || to_grade < 1 || to_grade > 6) {
      return next(createError('Grade levels must be between 1 and 6', 400));
    }

    const connection = getConnection();
    
    let query = 'UPDATE students SET grade_level = ? WHERE grade_level = ? AND status = "active"';
    const params = [to_grade, from_grade];

    if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
      const placeholders = student_ids.map(() => '?').join(',');
      query += ` AND id IN (${placeholders})`;
      params.push(...student_ids);
    }

    const [result] = await connection.execute(query, params);

    res.json({
      success: true,
      message: 'Batch grade upgrade completed',
      updatedCount: (result as any).affectedRows
    });
  } catch (error) {
    next(error);
  }
});

// Delete student
router.delete('/:id', requireRole(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM students WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      return next(createError('Student not found', 404));
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
