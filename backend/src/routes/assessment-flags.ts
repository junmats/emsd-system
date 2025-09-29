import express from 'express';
import { getConnection } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get assessment flags for a specific date
router.get('/flags/:assessmentDate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { assessmentDate } = req.params;
    const connection = getConnection();
    
    const [flags] = await connection.execute(`
      SELECT 
        af.student_id,
        af.assessment_date,
        af.flagged_at,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.grade_level
      FROM assessment_flags af
      JOIN students s ON af.student_id = s.id
      WHERE af.assessment_date = ?
      ORDER BY s.grade_level, s.last_name, s.first_name
    `, [assessmentDate]);

    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    console.error('Error fetching assessment flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment flags'
    });
  }
});

// Set assessment flags for multiple students
router.post('/flags', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { student_ids, assessment_date } = req.body;
    const userId = req.user!.id;
    const connection = getConnection();

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'student_ids array is required'
      });
    }

    if (!assessment_date) {
      return res.status(400).json({
        success: false,
        message: 'assessment_date is required'
      });
    }

    // Insert flags for each student (ignore duplicates)
    const values = student_ids.map(studentId => [studentId, assessment_date, userId]);
    
    await connection.execute(`
      INSERT IGNORE INTO assessment_flags (student_id, assessment_date, created_by)
      VALUES ${student_ids.map(() => '(?, ?, ?)').join(', ')}
    `, values.flat());

    res.json({
      success: true,
      message: `Assessment flags set for ${student_ids.length} students`,
      data: {
        student_count: student_ids.length,
        assessment_date
      }
    });
  } catch (error) {
    console.error('Error setting assessment flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set assessment flags'
    });
  }
});

// Clear all assessment flags for a specific date
router.delete('/flags/:assessmentDate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { assessmentDate } = req.params;
    const connection = getConnection();
    
    const [result] = await connection.execute(`
      DELETE FROM assessment_flags WHERE assessment_date = ?
    `, [assessmentDate]);

    res.json({
      success: true,
      message: `All assessment flags cleared for ${assessmentDate}`,
      data: {
        deleted_count: (result as any).affectedRows
      }
    });
  } catch (error) {
    console.error('Error clearing assessment flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear assessment flags'
    });
  }
});

// Clear all assessment flags (for new assessment period)
router.delete('/flags', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const connection = getConnection();
    
    const [result] = await connection.execute('DELETE FROM assessment_flags');

    res.json({
      success: true,
      message: 'All assessment flags cleared',
      data: {
        deleted_count: (result as any).affectedRows
      }
    });
  } catch (error) {
    console.error('Error clearing all assessment flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all assessment flags'
    });
  }
});

export default router;
