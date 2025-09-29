-- Create assessment tables for batch assessment functionality

-- Assessment batches table
CREATE TABLE IF NOT EXISTS assessment_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_name VARCHAR(255) NOT NULL,
  assessment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Individual assessments table
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
);

-- Create indexes for better performance
CREATE INDEX idx_assessment_batches_created_at ON assessment_batches(created_at);
CREATE INDEX idx_assessment_batches_assessment_date ON assessment_batches(assessment_date);
CREATE INDEX idx_assessments_batch_id ON assessments(batch_id);
CREATE INDEX idx_assessments_student_id ON assessments(student_id);
CREATE INDEX idx_assessments_assessment_date ON assessments(assessment_date);
