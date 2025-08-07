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
    query += ' ORDER BY last_name, first_name LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
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
       (student_number, first_name, last_name, grade_level, date_of_birth, 
        address, parent_name, parent_contact, parent_email, enrollment_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_number, first_name, last_name, grade_level, date_of_birth,
       address, parent_name, parent_contact, parent_email, enrollment_date]
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
    
    // Check if student exists
    const [existing] = await connection.execute(
      'SELECT id FROM students WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return next(createError('Student not found', 404));
    }

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
    if (last_name) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (grade_level) {
      updates.push('grade_level = ?');
      values.push(grade_level);
    }
    if (date_of_birth) {
      updates.push('date_of_birth = ?');
      values.push(date_of_birth);
    }
    if (address) {
      updates.push('address = ?');
      values.push(address);
    }
    if (parent_name) {
      updates.push('parent_name = ?');
      values.push(parent_name);
    }
    if (parent_contact) {
      updates.push('parent_contact = ?');
      values.push(parent_contact);
    }
    if (parent_email) {
      updates.push('parent_email = ?');
      values.push(parent_email);
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
