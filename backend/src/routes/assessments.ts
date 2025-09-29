import express from 'express';
import { getConnection } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all assessment batches
router.get('/batches', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    const [batches] = await connection.execute(`
      SELECT 
        ab.id,
        ab.batch_name,
        ab.assessment_date,
        ab.due_date,
        ab.created_at,
        COUNT(a.id) as assessment_count
      FROM assessment_batches ab
      LEFT JOIN assessments a ON ab.id = a.batch_id
      GROUP BY ab.id, ab.batch_name, ab.assessment_date, ab.due_date, ab.created_at
      ORDER BY ab.created_at DESC
    `);

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error fetching assessment batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment batches'
    });
  }
});

// Get specific assessment batch with assessments
router.get('/batch/:batchId', authenticateToken, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const connection = getConnection();

    // Get batch info
    const [batchRows] = await connection.execute(`
      SELECT * FROM assessment_batches WHERE id = ?
    `, [batchId]);

    if (!Array.isArray(batchRows) || batchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment batch not found'
      });
    }

    const batch = batchRows[0];

    // Get assessments in this batch
    const [assessments] = await connection.execute(`
      SELECT 
        a.*,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.grade_level,
        s.status
      FROM assessments a
      JOIN students s ON a.student_id = s.id
      WHERE a.batch_id = ?
      ORDER BY s.last_name, s.first_name
    `, [batchId]);

    res.json({
      success: true,
      data: {
        ...batch,
        assessments: assessments
      }
    });
  } catch (error) {
    console.error('Error fetching assessment batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment batch'
    });
  }
});

// Create new assessment batch
router.post('/batch', authenticateToken, async (req, res) => {
  const connection = await getConnection().getConnection();
  
  try {
    await connection.beginTransaction();

    const { batch_name, assessment_date, due_date, assessments } = req.body;
    const userId = (req as any).user.id;

    // Create batch
    const [batchResult] = await connection.execute(`
      INSERT INTO assessment_batches (batch_name, assessment_date, due_date, created_by)
      VALUES (?, ?, ?, ?)
    `, [batch_name, assessment_date, due_date, userId]);

    const batchId = (batchResult as any).insertId;

    // Create individual assessments
    for (const assessment of assessments) {
      const { student_id, current_due } = assessment;
      
      // Calculate totals (you might want to get these from the frontend or recalculate)
      const [chargesResult] = await connection.execute(`
        SELECT COALESCE(SUM(sc.amount), 0) as total_charges
        FROM student_charges sc
        JOIN students s ON sc.grade_level = s.grade_level
        WHERE s.id = ? AND sc.is_active = 1
      `, [student_id]);

      const totalCharges = Array.isArray(chargesResult) && chargesResult.length > 0 
        ? (chargesResult[0] as any).total_charges 
        : 0;

      const [paymentsResult] = await connection.execute(`
        SELECT COALESCE(SUM(total_amount), 0) as total_paid
        FROM payments
        WHERE student_id = ?
      `, [student_id]);

      const totalPaid = Array.isArray(paymentsResult) && paymentsResult.length > 0 
        ? (paymentsResult[0] as any).total_paid 
        : 0;

      await connection.execute(`
        INSERT INTO assessments (batch_id, student_id, assessment_date, due_date, total_charges, total_paid, current_due, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [batchId, student_id, assessment_date, due_date, totalCharges, totalPaid, current_due, userId]);
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        id: batchId,
        batch_name,
        assessment_date,
        due_date
      },
      message: 'Assessment batch created successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating assessment batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assessment batch'
    });
  } finally {
    connection.release();
  }
});

// Update individual assessment
router.put('/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId);
    const { current_due, due_date } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (current_due !== undefined) {
      updateFields.push('current_due = ?');
      updateValues.push(current_due);
    }

    if (due_date !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(due_date);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(assessmentId);

    const connection = getConnection();
    await connection.execute(`
      UPDATE assessments 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateValues);

    res.json({
      success: true,
      message: 'Assessment updated successfully'
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assessment'
    });
  }
});

// Delete assessment batch
router.delete('/batch/:batchId', authenticateToken, async (req, res) => {
  const connection = await getConnection().getConnection();
  
  try {
    await connection.beginTransaction();

    const batchId = parseInt(req.params.batchId);

    // Delete individual assessments first
    await connection.execute('DELETE FROM assessments WHERE batch_id = ?', [batchId]);

    // Delete batch
    await connection.execute('DELETE FROM assessment_batches WHERE id = ?', [batchId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Assessment batch deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting assessment batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assessment batch'
    });
  } finally {
    connection.release();
  }
});

// Clear all assessments
router.delete('/clear-all', authenticateToken, async (req, res) => {
  const connection = await getConnection().getConnection();
  
  try {
    await connection.beginTransaction();

    // Delete all assessments
    await connection.execute('DELETE FROM assessments');

    // Delete all batches
    await connection.execute('DELETE FROM assessment_batches');

    // Reset auto increment
    await connection.execute('ALTER TABLE assessments AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE assessment_batches AUTO_INCREMENT = 1');

    await connection.commit();

    res.json({
      success: true,
      message: 'All assessments cleared successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error clearing all assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all assessments'
    });
  } finally {
    connection.release();
  }
});

export default router;
