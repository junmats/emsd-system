-- Create assessment_flags table to track which students have had assessments generated
CREATE TABLE IF NOT EXISTS assessment_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  assessment_date DATE NOT NULL,
  flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_student_assessment_date (student_id, assessment_date)
);
